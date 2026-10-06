import * as THREE from 'three';
import { heroGeometry } from './characters';

interface Particle {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  size: number;
  grav: number;
  drag: number;
}

interface Ring {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  t: number;
  dur: number;
  maxR: number;
}

interface Ghost {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  t: number;
}

/** Travelling spell projectile (fireball etc.). */
interface Bolt {
  mesh: THREE.Mesh;
  glow: THREE.Mesh;
  trail: THREE.Mesh[];
  x: number;
  y: number;
  z: number;
  dx: number;
  dz: number;
  speed: number;
  dist: number;
  travelled: number;
  life: number;
  max: number;
  color: number;
}

interface ArcSeg {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  t: number;
  dur: number;
}

interface Crystal {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number; max: number; spin: number;
}

interface IceShell {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  t: number; dur: number;
}

const MAX_PARTICLES = 220;
const MAX_BOLTS = 4;
const MAX_ARCS = 64;
const TRAIL_LEN = 6;
const MAX_CRYSTALS = 24;
const MAX_SHELLS = 12;

/**
 * Pooled visual effects: impact puffs, shockwave rings, spell bolts / ice bursts /
 * lightning arcs, dash afterimages and the WIS path highlight.
 *
 * Particles are pooled individual meshes (own MeshBasicMaterial) so element
 * colours never fall back to black from a missing instanceColor/vertexColor attr.
 */
export class Effects {
  readonly group = new THREE.Group();
  private parts: Particle[] = [];
  private free: Particle[] = [];
  private rings: Ring[] = [];
  private ghosts: Ghost[] = [];
  private ghostIdx = 0;
  private dots: THREE.Mesh[] = [];
  private dotMat: THREE.MeshBasicMaterial;
  bolts: Bolt[] = [];
  private arcs: ArcSeg[] = [];
  private crystals: Crystal[] = [];
  private freeCrystals: Crystal[] = [];
  private shells: IceShell[] = [];
  fireLight: THREE.PointLight;

  constructor() {
    // Per-particle meshes (NOT InstancedMesh): instanceColor was painting black
    // octagons when vertex/instance attributes disagreed. Own material = reliable tint.
    const geo = new THREE.SphereGeometry(0.12, 10, 8);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff1744,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      mesh.renderOrder = 30;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.free.push({
        mesh, mat,
        x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
        life: 0, max: 1, size: 1, grav: 0, drag: 0,
      });
    }
    this.group.renderOrder = 30;

    const ringGeo = new THREE.RingGeometry(0.55, 1.05, 48);
    for (let i = 0; i < 6; i++) {
      const mat2 = new THREE.MeshBasicMaterial({
        color: 0xffb74d,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
        blending: THREE.NormalBlending,
      });
      const mesh = new THREE.Mesh(ringGeo, mat2);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      mesh.renderOrder = 28;
      this.group.add(mesh);
      this.rings.push({ mesh, mat: mat2, t: 1, dur: 1, maxR: 1 });
    }

    const ghostGeo = heroGeometry();
    for (let i = 0; i < 10; i++) {
      const mat3 = new THREE.MeshBasicMaterial({
        color: 0x0d47a1, transparent: true, opacity: 0, depthWrite: false,
      });
      const mesh = new THREE.Mesh(ghostGeo, mat3);
      mesh.visible = false;
      this.group.add(mesh);
      this.ghosts.push({ mesh, mat: mat3, t: 1 });
    }

    this.dotMat = new THREE.MeshBasicMaterial({
      color: 0x64ffda,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
    });
    const dotGeo = new THREE.RingGeometry(0.06, 0.15, 16);
    for (let i = 0; i < 20; i++) {
      const d = new THREE.Mesh(dotGeo, this.dotMat);
      d.rotation.x = -Math.PI / 2;
      d.renderOrder = 10;
      d.visible = false;
      this.group.add(d);
      this.dots.push(d);
    }

    // Fireball: ~0.5 m glowing sphere + thick trail + point light (iso-readable).
    this.fireLight = new THREE.PointLight(0xe0201a, 0, 5, 2);
    this.fireLight.visible = false;
    this.group.add(this.fireLight);
    for (let i = 0; i < MAX_BOLTS; i++) {
      const coreMat = new THREE.MeshBasicMaterial({
        // Small hot core — orange-red, NOT white (white+additive → pink on light floors).
        color: 0xff6a00, transparent: false, opacity: 1,
        depthWrite: false, depthTest: false, toneMapped: false,
      });
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xe0201a, transparent: true, opacity: 0.92,
        depthWrite: false, depthTest: false, toneMapped: false,
        blending: THREE.NormalBlending,
      });
      // ~0.5 m deep-red ball; small orange core.
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), coreMat);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 12), glowMat);
      mesh.visible = false;
      glow.visible = false;
      mesh.renderOrder = 40;
      glow.renderOrder = 39;
      this.group.add(mesh, glow);
      const trail: THREE.Mesh[] = [];
      for (let t = 0; t < TRAIL_LEN; t++) {
        const tm = new THREE.Mesh(
          new THREE.SphereGeometry(0.16 - t * 0.008, 10, 8),
          new THREE.MeshBasicMaterial({
            color: 0xe0201a, transparent: true, opacity: 0.9,
            depthWrite: false, depthTest: false, blending: THREE.NormalBlending,
            toneMapped: false,
          }),
        );
        tm.visible = false;
        tm.renderOrder = 38;
        this.group.add(tm);
        trail.push(tm);
      }
      this.bolts.push({
        mesh, glow, trail,
        x: 0, y: 0, z: 0, dx: 0, dz: 1, speed: 8, dist: 2.5,
        travelled: 0, life: 0, max: 1, color: 0xff1744,
      });
    }

    // Lightning: thick bright boxes (core + soft glow twin via scale).
    for (let i = 0; i < MAX_ARCS; i++) {
      const matA = new THREE.MeshBasicMaterial({
        color: 0xffd400, transparent: true, opacity: 0,
        depthWrite: false, depthTest: false, blending: THREE.NormalBlending,
        toneMapped: false,
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 0.35, 0.35), matA);
      mesh.visible = false;
      mesh.renderOrder = 42;
      this.group.add(mesh);
      this.arcs.push({ mesh, mat: matA, t: 1, dur: 1 });
    }

    // Ice shards (octahedron crystals).
    const cryGeo = new THREE.OctahedronGeometry(0.18, 0);
    for (let i = 0; i < MAX_CRYSTALS; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x0d47a1, transparent: true, opacity: 0,
        depthWrite: false, depthTest: false, toneMapped: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(cryGeo, mat);
      mesh.visible = false;
      mesh.renderOrder = 41;
      this.group.add(mesh);
      this.freeCrystals.push({
        mesh, mat, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, spin: 0,
      });
    }

    // Ice cube shells around frozen targets.
    for (let i = 0; i < MAX_SHELLS; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x42a5f5, transparent: true, opacity: 0,
        depthWrite: false, depthTest: false, toneMapped: false,
        wireframe: false, blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.05, 0.55), mat);
      mesh.visible = false;
      mesh.renderOrder = 37;
      this.group.add(mesh);
      this.shells.push({ mesh, mat, t: 1, dur: 1 });
    }

    // More rings for bold frost/fire bursts.
    const ringGeo2 = new THREE.RingGeometry(0.4, 1.15, 48);
    for (let i = 0; i < 4; i++) {
      const mat2 = new THREE.MeshBasicMaterial({
        color: 0x0d47a1, transparent: true, opacity: 0,
        side: THREE.DoubleSide, depthWrite: false, depthTest: false,
        blending: THREE.AdditiveBlending, toneMapped: false,
      });
      const mesh = new THREE.Mesh(ringGeo2, mat2);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      mesh.renderOrder = 36;
      this.group.add(mesh);
      this.rings.push({ mesh, mat: mat2, t: 1, dur: 1, maxR: 1 });
    }
  }

  puff(
    x: number, y: number, z: number, count: number, color: number,
    speed = 1.5, size = 1, life = 0.45, up = 0.8, grav = -1.5,
    additive = true,
  ): void {
    for (let i = 0; i < count; i++) {
      const p = this.free.pop();
      if (!p) return;
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      p.x = x;
      p.y = y;
      p.z = z;
      p.vx = Math.cos(a) * s;
      p.vz = Math.sin(a) * s;
      p.vy = up * (0.5 + Math.random());
      p.life = p.max = life * (0.7 + Math.random() * 0.6);
      p.size = size * (0.7 + Math.random() * 0.6);
      p.grav = grav;
      p.drag = 4;
      p.mat.color.setHex(color);
      p.mat.opacity = 1;
      p.mat.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
      p.mesh.visible = true;
      this.parts.push(p);
    }
  }

  spray(x: number, z: number, dx: number, dz: number, count: number, color: number, speed = 3): void {
    for (let i = 0; i < count; i++) {
      const p = this.free.pop();
      if (!p) return;
      const spread = (Math.random() - 0.5) * 1.2;
      const c = Math.cos(spread);
      const s = Math.sin(spread);
      const vx = dx * c - dz * s;
      const vz = dx * s + dz * c;
      const sp = speed * (0.5 + Math.random() * 0.7);
      p.x = x + dx * 0.3;
      p.y = 0.6 + Math.random() * 0.4;
      p.z = z + dz * 0.3;
      p.vx = vx * sp;
      p.vz = vz * sp;
      p.vy = Math.random() * 0.6;
      p.life = p.max = 0.3 + Math.random() * 0.2;
      p.size = 0.8 + Math.random() * 0.5;
      p.grav = -2;
      p.drag = 6;
      p.mat.color.setHex(color);
      p.mat.opacity = 1;
      p.mesh.visible = true;
      this.parts.push(p);
    }
  }

  /**
   * Fireball: ~0.5 m orange-yellow sphere, thick trail, ~0.4 s flight, boom on impact.
   * Always depthTest:false / high renderOrder so it reads above the crowd.
   */
  boltTrail(x: number, z: number, dx: number, dz: number, range: number, color = 0xe0201a): void {
    const len = Math.hypot(dx, dz) || 1;
    const ndx = dx / len;
    const ndz = dz / len;
    const b = this.bolts.find((bb) => bb.life <= 0) ?? this.bolts[0];
    b.x = x + ndx * 0.4;
    b.y = 1.15;
    b.z = z + ndz * 0.4;
    b.dx = ndx;
    b.dz = ndz;
    b.dist = Math.max(2.2, range);
    // ~0.45 s flight — large sphere stays mid-screen longer.
    b.speed = b.dist / 0.45;
    b.travelled = 0;
    b.life = b.max = 0.48;
    b.color = color;
    (b.mesh.material as THREE.MeshBasicMaterial).color.setHex(0xff6a00);
    (b.glow.material as THREE.MeshBasicMaterial).color.setHex(0xe0201a);
    b.mesh.visible = true;
    b.glow.visible = true;
    b.mesh.scale.setScalar(1);
    b.glow.scale.setScalar(1);
    b.mesh.position.set(b.x, b.y, b.z);
    b.glow.position.set(b.x, b.y, b.z);
    this.fireLight.intensity = 3.2;
    this.fireLight.color.setHex(0xe0201a);
    this.fireLight.position.set(b.x, b.y, b.z);
    this.fireLight.visible = true;
    for (const t of b.trail) {
      t.visible = true;
      (t.material as THREE.MeshBasicMaterial).color.setHex(0xc62828);
      (t.material as THREE.MeshBasicMaterial).opacity = 0.9;
      t.position.set(b.x, b.y, b.z);
    }
    // Tiny muzzle puff only — keep mid-flight sphere+trail readable from iso cam.
    this.puff(b.x, b.y, b.z, 5, 0xe0201a, 1.2, 1.0, 0.2, 0.45, -0.8, false);
  }

  /** Ice: saturated cyan floor rings + flying crystals + freeze shells on targets. */
  iceBurst(x: number, z: number, radius: number, forward = false, dx = 0, dz = -1): void {
    const R = Math.max(radius, 2.4);
    this.shockwave(x, z, R, 0x1565c0, 0.7);
    this.shockwave(x, z, R * 0.65, 0x42a5f5, 0.55);
    this.shockwave(x, z, R * 0.35, 0xbbdefb, 0.4);
    this.puff(x, 0.55, z, 32, 0x1565c0, 3.6, 2.8, 0.75, 1.8, -0.4);
    this.puff(x, 0.75, z, 22, 0xbbdefb, 2.6, 2.2, 0.6, 1.4, -0.25);
    this.puff(x, 0.35, z, 16, 0x90caf9, 1.8, 1.6, 0.5, 0.9, -0.15, false);
    // Flying ice crystals
    for (let i = 0; i < 16; i++) {
      const c = this.freeCrystals.pop();
      if (!c) break;
      const a = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
      const sp = 2.2 + Math.random() * 2.5;
      c.x = x; c.y = 0.4 + Math.random() * 0.5; c.z = z;
      c.vx = Math.cos(a) * sp * (forward ? 0.5 : 1) + (forward ? dx * 2.5 : 0);
      c.vz = Math.sin(a) * sp * (forward ? 0.5 : 1) + (forward ? dz * 2.5 : 0);
      c.vy = 2.5 + Math.random() * 3;
      c.life = c.max = 0.55 + Math.random() * 0.25;
      c.spin = (Math.random() - 0.5) * 10;
      c.mat.color.setHex(i % 2 ? 0x1565c0 : 0xbbdefb);
      c.mat.opacity = 1;
      c.mesh.visible = true;
      c.mesh.scale.setScalar(0.9 + Math.random() * 1.1);
      this.crystals.push(c);
    }
    if (forward) this.spray(x, z, dx, dz, 24, 0x1565c0, 4.5);
  }

  /** Place a translucent ice cube shell over a frozen passenger (iso-readable). */
  freezeShell(x: number, z: number, scale = 1, dur = 1.4): void {
    const s = this.shells.find((sh) => sh.t >= sh.dur) ?? this.shells[0];
    s.t = 0;
    s.dur = dur;
    s.mat.color.setHex(0x42a5f5);
    s.mat.opacity = 0.7;
    s.mesh.position.set(x, 0.55 * scale, z);
    s.mesh.scale.set(scale, scale, scale);
    s.mesh.visible = true;
  }

  /** Lightning: thick yellow/white zig-zag bolts with glow + flash. */
  lightningArc(pts: { x: number; z: number }[]): void {
    if (!pts.length) return;
    // Build a forced zig-zag polyline so the bolt reads from iso cam (never a short stub).
    const path: { x: number; z: number }[] = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const a = path[path.length - 1];
      const b = pts[i];
      const dx = b.x - a.x, dz = b.z - a.z;
      const len = Math.hypot(dx, dz) || 1;
      const nx = -dz / len, nz = dx / len;
      const steps = Math.max(2, Math.ceil(len / 1.1));
      for (let s = 1; s <= steps; s++) {
        const u = s / steps;
        const jog = (s === steps ? 0 : ((s % 2) * 2 - 1) * 0.55);
        path.push({
          x: a.x + dx * u + nx * jog,
          z: a.z + dz * u + nz * jog,
        });
      }
    }
    for (let i = 0; i < path.length; i++) {
      const p = path[i];
      this.puff(p.x, 1.45, p.z, 6, 0xffd400, 2.2, 1.8, 0.3, 0.55, -2, false);
      if (i + 1 < path.length) {
        const a = path[i], b = path[i + 1];
        // Fat saturated yellow body + thin white core only.
        this.spawnArc(a, b, 0xffd400, 0.8, 2.6);
        this.spawnArc(a, b, 0xffcc00, 0.7, 1.6);
        this.spawnArc(a, b, 0xffffff, 0.6, 0.55);
      }
    }
    for (const p of pts) this.shockwave(p.x, p.z, 1.4, 0xffd400, 0.35);
    this.shockwave(pts[0].x, pts[0].z, 2.0, 0xffc400, 0.35);
  }

  private spawnArc(
    a: { x: number; z: number }, b: { x: number; z: number },
    color: number, dur = 0.35, thick = 1,
  ): void {
    const seg = this.arcs.find((s) => s.t >= s.dur) ?? this.arcs[0];
    const mx = (a.x + b.x) / 2;
    const mz = (a.z + b.z) / 2;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 0.2;
    // BoxGeometry length is along X → yaw so +X aligns with (dx,dz).
    const yaw = Math.atan2(-dz, dx);
    seg.mesh.position.set(mx, 1.55, mz);
    seg.mesh.rotation.set(0, yaw, (Math.random() - 0.5) * 0.2);
    // Length along X; cross-section stays readable even on short zigs.
    const cross = 0.85 * thick;
    seg.mesh.scale.set(Math.max(len, 0.55), cross, cross);
    seg.mat.color.setHex(color);
    seg.mat.opacity = 1;
    seg.t = 0;
    seg.dur = dur;
    seg.mesh.visible = true;
  }

  private explodeBolt(b: Bolt): void {
    this.puff(b.x, b.y, b.z, 26, 0xe0201a, 4.2, 2.6, 0.55, 1.5, -2, false);
    this.puff(b.x, b.y, b.z, 16, 0xff3d00, 3.2, 2.0, 0.4, 1.1, -1.5, false);
    this.puff(b.x, b.y, b.z, 8, 0xff6a00, 2.0, 1.4, 0.28, 0.7, -1, false);
    this.shockwave(b.x, b.z, 2.4, 0xe0201a, 0.5);
    this.shockwave(b.x, b.z, 1.4, 0xff3d00, 0.35);
    this.fireLight.intensity = 0;
    this.fireLight.visible = false;
  }

  shockwave(x: number, z: number, radius: number, color = 0xffb74d, dur = 0.5): void {
    const r = this.rings.find((rr) => rr.t >= rr.dur) ?? this.rings[0];
    r.t = 0;
    r.dur = dur;
    r.maxR = radius;
    r.mat.color.setHex(color);
    r.mesh.position.set(x, 0.06, z);
    r.mesh.visible = true;
  }

  ghost(x: number, z: number, yaw: number): void {
    const g = this.ghosts[this.ghostIdx++ % this.ghosts.length];
    g.t = 0;
    g.mesh.position.set(x, 0, z);
    g.mesh.rotation.y = yaw;
    g.mesh.visible = true;
  }

  setPath(pts: { x: number; z: number }[], time: number): void {
    for (let i = 0; i < this.dots.length; i++) {
      const d = this.dots[i];
      const p = pts[i];
      if (!p) {
        d.visible = false;
        continue;
      }
      d.visible = true;
      const pulse = 0.75 + 0.45 * Math.max(0, Math.sin(time * 10 - i * 0.7));
      d.position.set(p.x, 0.04, p.z);
      d.scale.setScalar(pulse);
    }
    this.dotMat.opacity = pts.length ? 0.85 : 0;
  }

  /** Capture helper: hide floor rings so mid-flight projectiles dominate the frame. */
  debugHideRings(): void {
    for (const r of this.rings) { r.t = r.dur; r.mesh.visible = false; }
  }

  clear(): void {
    while (this.parts.length) {
      const p = this.parts.pop()!;
      p.mesh.visible = false;
      p.mat.opacity = 0;
      this.free.push(p);
    }
    for (const r of this.rings) { r.t = r.dur; r.mesh.visible = false; }
    for (const g of this.ghosts) { g.t = 1; g.mesh.visible = false; }
    for (const b of this.bolts) {
      b.life = 0;
      b.mesh.visible = false;
      b.glow.visible = false;
      for (const t of b.trail) t.visible = false;
    }
    for (const a of this.arcs) { a.t = a.dur; a.mesh.visible = false; }
    while (this.crystals.length) {
      const c = this.crystals.pop()!;
      c.mesh.visible = false;
      this.freeCrystals.push(c);
    }
    for (const s of this.shells) { s.t = s.dur; s.mesh.visible = false; }
    this.fireLight.intensity = 0;
    this.fireLight.visible = false;
    for (const d of this.dots) d.visible = false;
  }

  update(dt: number): void {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        p.mat.opacity = 0;
        this.parts.splice(i, 1);
        this.free.push(p);
        continue;
      }
      const k = Math.exp(-p.drag * dt);
      p.vx *= k;
      p.vz *= k;
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y = Math.max(0.03, p.y + p.vy * dt);
      p.z += p.vz * dt;
      const t = p.life / p.max;
      const sc = p.size * (0.55 + 0.85 * Math.sin(t * Math.PI));
      p.mesh.position.set(p.x, p.y, p.z);
      p.mesh.scale.setScalar(sc);
      p.mat.opacity = Math.min(1, t * 1.35);
      p.mesh.visible = true;
    }

    for (const r of this.rings) {
      if (r.t >= r.dur) {
        r.mesh.visible = false;
        continue;
      }
      r.t += dt;
      const u = Math.min(1, r.t / r.dur);
      const e = 1 - Math.pow(1 - u, 3);
      r.mesh.scale.setScalar(0.25 + e * r.maxR);
      r.mat.opacity = (1 - u) * 0.9;
      r.mesh.visible = true;
    }

    for (const g of this.ghosts) {
      if (g.t >= 0.35) {
        g.mesh.visible = false;
        continue;
      }
      g.t += dt;
      g.mat.opacity = Math.max(0, 0.45 * (1 - g.t / 0.35));
      g.mesh.visible = true;
    }

    // Fireballs travel forward; trail beads lag behind; explode on end.
    for (const b of this.bolts) {
      if (b.life <= 0) {
        b.mesh.visible = false;
        b.glow.visible = false;
        for (const t of b.trail) t.visible = false;
        continue;
      }
      const prev = b.life;
      b.life -= dt;
      if (b.life <= 0 && prev > 0) {
        this.explodeBolt(b);
        b.mesh.visible = false;
        b.glow.visible = false;
        for (const t of b.trail) t.visible = false;
        continue;
      }
      const step = b.speed * dt;
      b.x += b.dx * step;
      b.z += b.dz * step;
      b.travelled += step;
      b.y = 1.15 + Math.sin(b.travelled * 10) * 0.06;
      b.mesh.position.set(b.x, b.y, b.z);
      b.glow.position.set(b.x, b.y, b.z);
      this.fireLight.position.set(b.x, b.y, b.z);
      this.fireLight.intensity = 3.2;
      this.fireLight.visible = true;
      const pulse = 1.15 + 0.2 * Math.sin(b.travelled * 16);
      b.mesh.scale.setScalar(pulse);
      b.glow.scale.setScalar(pulse * 1.25);
      b.mesh.visible = true;
      b.glow.visible = true;
      for (let i = 0; i < b.trail.length; i++) {
        const t = b.trail[i];
        const back = (i + 1) * 0.28;
        t.position.set(b.x - b.dx * back, b.y - i * 0.015, b.z - b.dz * back);
        t.visible = true;
        const tm = t.material as THREE.MeshBasicMaterial;
        tm.opacity = 0.9 * (1 - i / (b.trail.length + 0.5));
        // Stretch along flight direction → comet streak from iso cam.
        const along = 2.8 - i * 0.12;
        const cross = 0.85 - i * 0.05;
        t.scale.set(along, cross, cross);
        t.rotation.y = Math.atan2(-b.dz, b.dx);
      }
    }

    // Ice crystals
    for (let i = this.crystals.length - 1; i >= 0; i--) {
      const c = this.crystals[i];
      c.life -= dt;
      if (c.life <= 0) {
        c.mesh.visible = false;
        this.crystals.splice(i, 1);
        this.freeCrystals.push(c);
        continue;
      }
      c.vy -= 6 * dt;
      c.x += c.vx * dt;
      c.y = Math.max(0.08, c.y + c.vy * dt);
      c.z += c.vz * dt;
      c.mesh.position.set(c.x, c.y, c.z);
      c.mesh.rotation.y += c.spin * dt;
      c.mesh.rotation.x += c.spin * 0.6 * dt;
      c.mat.opacity = Math.min(1, c.life / c.max * 1.4);
      c.mesh.visible = true;
    }

    for (const s of this.shells) {
      if (s.t >= s.dur) { s.mesh.visible = false; continue; }
      s.t += dt;
      const u = s.t / s.dur;
      s.mat.opacity = (1 - u) * 0.75;
      s.mesh.rotation.y += dt * 0.8;
      s.mesh.visible = true;
    }

    for (const a of this.arcs) {
      if (a.t >= a.dur) {
        a.mesh.visible = false;
        continue;
      }
      a.t += dt;
      const u = Math.min(1, a.t / a.dur);
      a.mat.opacity = (1 - u) * (0.85 + 0.15 * Math.random());
      a.mesh.visible = true;
      // Flicker thickness.
      a.mesh.scale.y = 0.7 + Math.random() * 0.8;
      a.mesh.scale.z = 0.7 + Math.random() * 0.8;
    }
  }
}
