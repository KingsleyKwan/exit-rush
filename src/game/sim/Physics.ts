/**
 * Tiny 2D (XZ-plane) crowd physics: circles with mass, velocity + damping,
 * soft position-based contacts (compressible crowd), velocity impulses for
 * momentum transfer, static box/circle obstacles and a spatial hash grid.
 *
 * Pure TypeScript — no three.js — so it can be unit-tested in node.
 */

export interface Body {
  id: number;
  /** Index in World.bodies (refreshed every grid rebuild). */
  idx: number;
  x: number;
  z: number;
  /** Position at the start of the last step (for render interpolation). */
  px: number;
  pz: number;
  vx: number;
  vz: number;
  /** Force accumulator, cleared after each step. */
  fx: number;
  fz: number;
  r: number;
  mass: number;
  invMass: number;
  /** Linear damping (1/s). */
  damping: number;
  maxSpeed: number;
  restitution: number;
  /** Bodies sharing a non-zero group never collide (e.g. owner + suitcase). */
  group: number;
  /** Category bits this body belongs to (see PASS_* in tuning-free consts below). */
  passTag: number;
  /** Category bits this body currently passes through (no contact). */
  passMask: number;
  /** Total overlap depth this step — a cheap "how squeezed am I" measure. */
  pressure: number;
  /** Largest normal impulse received this step. */
  impact: number;
  /** Sum of contact normals (pointing toward this body) this step. */
  cnx: number;
  cnz: number;
  contacts: number;
  enabled: boolean;
}

export interface Box {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  enabled: boolean;
}

export interface CircleObstacle {
  x: number;
  z: number;
  r: number;
}

export interface WorldConfig {
  iterations: number;
  beta: number;
  slop: number;
  hardFrac: number;
  restitution: number;
  wallRestitution: number;
  cellSize: number;
  impactThreshold: number;
}

export type ImpactFn = (a: Body, b: Body | null, j: number, x: number, z: number) => void;

let nextBodyId = 1;

export interface BodyInit {
  x: number;
  z: number;
  r: number;
  mass: number;
  damping?: number;
  maxSpeed?: number;
  restitution?: number;
  group?: number;
}

export function createBody(o: BodyInit): Body {
  return {
    id: nextBodyId++,
    idx: -1,
    x: o.x,
    z: o.z,
    px: o.x,
    pz: o.z,
    vx: 0,
    vz: 0,
    fx: 0,
    fz: 0,
    r: o.r,
    mass: o.mass,
    invMass: o.mass > 0 ? 1 / o.mass : 0,
    damping: o.damping ?? 3,
    maxSpeed: o.maxSpeed ?? 8,
    restitution: o.restitution ?? 0.05,
    group: o.group ?? 0,
    passTag: 0,
    passMask: 0,
    pressure: 0,
    impact: 0,
    cnx: 0,
    cnz: 0,
    contacts: 0,
    enabled: true,
  };
}

/** Pass-through categories (v0.6.2 Tier-3 counter skills). */
export const PASS_LUGGAGE = 1; // suitcase (Hurdle hops it; Ground Pound shoves it harder)
export const PASS_SQUAT = 2;
export const PASS_KID = 4;

/** True when a and b should skip contact because one passes through the other's category. */
export function passes(a: Body, b: Body): boolean {
  return (a.passMask & b.passTag) !== 0 || (b.passMask & a.passTag) !== 0;
}

export function setMass(b: Body, mass: number): void {
  b.mass = mass;
  b.invMass = mass > 0 ? 1 / mass : 0;
}

export function applyImpulse(b: Body, jx: number, jz: number): void {
  b.vx += jx * b.invMass;
  b.vz += jz * b.invMass;
}

export class World {
  readonly bodies: Body[] = [];
  readonly boxes: Box[] = [];
  readonly circles: CircleObstacle[] = [];
  cfg: WorldConfig;
  onImpact: ImpactFn | null = null;
  private cells = new Map<number, Body[]>();
  private cellPool: Body[][] = [];

  constructor(cfg: WorldConfig) {
    this.cfg = cfg;
  }

  add(b: Body): Body {
    b.idx = this.bodies.length;
    this.bodies.push(b);
    return b;
  }

  remove(b: Body): void {
    const i = this.bodies.indexOf(b);
    if (i >= 0) this.bodies.splice(i, 1);
  }

  addBox(minX: number, maxX: number, minZ: number, maxZ: number): Box {
    const b: Box = { minX, maxX, minZ, maxZ, enabled: true };
    this.boxes.push(b);
    return b;
  }

  private key(cx: number, cz: number): number {
    return (cx + 512) * 1024 + (cz + 512);
  }

  rebuildGrid(): void {
    for (const arr of this.cells.values()) {
      arr.length = 0;
      this.cellPool.push(arr);
    }
    this.cells.clear();
    const inv = 1 / this.cfg.cellSize;
    const bodies = this.bodies;
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      b.idx = i;
      if (!b.enabled) continue;
      const k = this.key(Math.floor(b.x * inv), Math.floor(b.z * inv));
      let arr = this.cells.get(k);
      if (!arr) {
        arr = this.cellPool.pop() ?? [];
        this.cells.set(k, arr);
      }
      arr.push(b);
    }
  }

  /** Bodies whose centre lies within r (+ their own radius) of (x,z). Uses the last grid. */
  query(x: number, z: number, r: number, out: Body[]): Body[] {
    out.length = 0;
    const cs = this.cfg.cellSize;
    const inv = 1 / cs;
    const reach = r + cs;
    const x0 = Math.floor((x - reach) * inv);
    const x1 = Math.floor((x + reach) * inv);
    const z0 = Math.floor((z - reach) * inv);
    const z1 = Math.floor((z + reach) * inv);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cz = z0; cz <= z1; cz++) {
        const arr = this.cells.get(this.key(cx, cz));
        if (!arr) continue;
        for (const b of arr) {
          const dx = b.x - x;
          const dz = b.z - z;
          const rr = r + b.r;
          if (dx * dx + dz * dz <= rr * rr) out.push(b);
        }
      }
    }
    return out;
  }

  /** Is a circle at (x,z,r) overlapping any static obstacle? */
  overlapsStatic(x: number, z: number, r: number): boolean {
    for (const bx of this.boxes) {
      if (!bx.enabled) continue;
      const cx = Math.min(Math.max(x, bx.minX), bx.maxX);
      const cz = Math.min(Math.max(z, bx.minZ), bx.maxZ);
      const dx = x - cx;
      const dz = z - cz;
      if (dx * dx + dz * dz < r * r) return true;
    }
    for (const c of this.circles) {
      const dx = x - c.x;
      const dz = z - c.z;
      const rr = r + c.r;
      if (dx * dx + dz * dz < rr * rr) return true;
    }
    return false;
  }

  /** Is a circle at (x,z,r) overlapping any body (brute force; for spawning)? */
  overlapsBody(x: number, z: number, r: number, pad = 0): boolean {
    for (const b of this.bodies) {
      if (!b.enabled) continue;
      const dx = x - b.x;
      const dz = z - b.z;
      const rr = r + b.r + pad;
      if (dx * dx + dz * dz < rr * rr) return true;
    }
    return false;
  }

  step(dt: number): void {
    const bodies = this.bodies;
    // 1) Integrate forces → velocity (semi-implicit Euler), damping, speed cap, move.
    for (const b of bodies) {
      b.px = b.x;
      b.pz = b.z;
      b.pressure = 0;
      b.impact = 0;
      b.cnx = 0;
      b.cnz = 0;
      b.contacts = 0;
      if (!b.enabled || b.invMass === 0) {
        b.fx = b.fz = 0;
        continue;
      }
      b.vx += b.fx * b.invMass * dt;
      b.vz += b.fz * b.invMass * dt;
      b.fx = 0;
      b.fz = 0;
      const k = Math.exp(-b.damping * dt);
      b.vx *= k;
      b.vz *= k;
      const sp2 = b.vx * b.vx + b.vz * b.vz;
      if (sp2 > b.maxSpeed * b.maxSpeed) {
        const s = b.maxSpeed / Math.sqrt(sp2);
        b.vx *= s;
        b.vz *= s;
      }
      b.x += b.vx * dt;
      b.z += b.vz * dt;
    }
    // 2) Resolve contacts.
    for (let it = 0; it < this.cfg.iterations; it++) {
      this.rebuildGrid();
      const first = it === 0;
      this.solvePairs(first);
      this.solveStatic(first);
    }
  }

  private solvePairs(withVel: boolean): void {
    const inv = 1 / this.cfg.cellSize;
    const bodies = this.bodies;
    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i];
      if (!a.enabled) continue;
      const cx = Math.floor(a.x * inv);
      const cz = Math.floor(a.z * inv);
      for (let ox = -1; ox <= 1; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
          const arr = this.cells.get(this.key(cx + ox, cz + oz));
          if (!arr) continue;
          for (let n = 0; n < arr.length; n++) {
            const b = arr[n];
            if (b.idx <= a.idx) continue;
            if (a.group !== 0 && a.group === b.group) continue;
            if ((a.passMask | b.passMask) !== 0 && passes(a, b)) continue;
            this.resolvePair(a, b, withVel);
          }
        }
      }
    }
  }

  private resolvePair(a: Body, b: Body, withVel: boolean): void {
    let dx = a.x - b.x;
    let dz = a.z - b.z;
    const min = a.r + b.r;
    const d2 = dx * dx + dz * dz;
    if (d2 >= min * min) return;
    const wsum = a.invMass + b.invMass;
    if (wsum <= 0) return;
    let d = Math.sqrt(d2);
    if (d < 1e-6) {
      // Perfectly stacked: separate along a deterministic pseudo-random axis.
      const ang = (a.id * 2.399 + b.id * 0.7) % (Math.PI * 2);
      dx = Math.cos(ang);
      dz = Math.sin(ang);
      d = 0;
    } else {
      dx /= d;
      dz /= d;
    }
    const pen = min - d;
    const cfg = this.cfg;
    // Soft positional correction (compressible) with a rigid limit.
    const hard = cfg.hardFrac * min;
    let corr: number;
    if (pen > hard) corr = pen - hard + Math.max(0, hard - cfg.slop) * cfg.beta;
    else corr = Math.max(0, pen - cfg.slop) * cfg.beta;
    corr /= wsum;
    a.x += dx * corr * a.invMass;
    a.z += dz * corr * a.invMass;
    b.x -= dx * corr * b.invMass;
    b.z -= dz * corr * b.invMass;

    if (!withVel) return;
    a.pressure += pen;
    b.pressure += pen;
    a.contacts++;
    b.contacts++;
    a.cnx += dx;
    a.cnz += dz;
    b.cnx -= dx;
    b.cnz -= dz;
    const rvn = (a.vx - b.vx) * dx + (a.vz - b.vz) * dz;
    if (rvn >= 0) return;
    const e = Math.max(cfg.restitution, (a.restitution + b.restitution) * 0.5);
    const j = (-(1 + e) * rvn) / wsum;
    a.vx += dx * j * a.invMass;
    a.vz += dz * j * a.invMass;
    b.vx -= dx * j * b.invMass;
    b.vz -= dz * j * b.invMass;
    if (j > a.impact) a.impact = j;
    if (j > b.impact) b.impact = j;
    if (this.onImpact && j > cfg.impactThreshold) {
      this.onImpact(a, b, j, b.x + dx * b.r, b.z + dz * b.r);
    }
  }

  private solveStatic(withVel: boolean): void {
    const e = this.cfg.wallRestitution;
    for (const b of this.bodies) {
      if (!b.enabled || b.invMass === 0) continue;
      for (const bx of this.boxes) {
        if (!bx.enabled) continue;
        const r = b.r;
        if (b.x + r < bx.minX || b.x - r > bx.maxX || b.z + r < bx.minZ || b.z - r > bx.maxZ) continue;
        const cx = Math.min(Math.max(b.x, bx.minX), bx.maxX);
        const cz = Math.min(Math.max(b.z, bx.minZ), bx.maxZ);
        let nx = b.x - cx;
        let nz = b.z - cz;
        const d2 = nx * nx + nz * nz;
        let pen: number;
        if (d2 > 1e-12) {
          if (d2 >= r * r) continue;
          const d = Math.sqrt(d2);
          nx /= d;
          nz /= d;
          pen = r - d;
        } else {
          // Centre inside the box: exit via the nearest face.
          const l = b.x - bx.minX;
          const rr = bx.maxX - b.x;
          const t = b.z - bx.minZ;
          const bt = bx.maxZ - b.z;
          const m = Math.min(l, rr, t, bt);
          if (m === l) {
            nx = -1;
            nz = 0;
          } else if (m === rr) {
            nx = 1;
            nz = 0;
          } else if (m === t) {
            nx = 0;
            nz = -1;
          } else {
            nx = 0;
            nz = 1;
          }
          pen = m + r;
        }
        this.pushOut(b, nx, nz, pen, e, withVel);
      }
      for (const c of this.circles) {
        let nx = b.x - c.x;
        let nz = b.z - c.z;
        const rr = b.r + c.r;
        const d2 = nx * nx + nz * nz;
        if (d2 >= rr * rr) continue;
        const d = Math.sqrt(d2) || 1e-6;
        nx /= d;
        nz /= d;
        this.pushOut(b, nx, nz, rr - d, e, withVel);
      }
    }
  }

  private pushOut(b: Body, nx: number, nz: number, pen: number, e: number, withVel: boolean): void {
    b.x += nx * pen;
    b.z += nz * pen;
    if (!withVel) return;
    b.pressure += pen;
    b.contacts++;
    b.cnx += nx;
    b.cnz += nz;
    const vn = b.vx * nx + b.vz * nz;
    if (vn < 0) {
      const j = -(1 + e) * vn;
      b.vx += nx * j;
      b.vz += nz * j;
      const imp = j * b.mass;
      if (imp > b.impact) b.impact = imp;
      if (this.onImpact && imp > this.cfg.impactThreshold * 1.5) {
        this.onImpact(b, null, imp, b.x - nx * b.r, b.z - nz * b.r);
      }
    }
  }
}
