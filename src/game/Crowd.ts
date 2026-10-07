import * as THREE from 'three';
import { Passenger, G, M } from './Passenger';
import type { Agent, CrowdSim } from './sim/CrowdSim';
import { TUNING } from './sim/tuning';
import { CHAR_MAT, LOOKS, lookGeometry, suitcaseGeometry, type Look } from './characters';
import type { DoorBlock } from './sim/Sim';
import { badgeTexture, stinkTexture } from './badges';
import type { QualityLevel } from './storage';

const linkGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 6);
linkGeo.rotateZ(Math.PI / 2); // length along X

/** Kinds that get a floating type icon (couples share one heart per pair). */
const ICON_KINDS = ['stench', 'family', 'brat', 'angry', 'luggage', 'couple', 'squat', 'loud'] as const;
type IconKind = (typeof ICON_KINDS)[number];

const STINK_PER = 3;
/** Metres around the player within which floating type icons are shown. */
const ICON_RANGE = 3.4;
const FLIES_PER = 3;

/**
 * View for the crowd sim (v0.3). Each agent is a Passenger (transform/tint
 * anchors only); bodies are drawn per look as InstancedMeshes sharing one
 * flat-shaded material, plus instanced suitcases, blob shadows, floating type
 * badges (billboards), stench wavy lines + flies, and per-couple hand links.
 *
 * Restart hygiene: `bind()` → `clear()` removes every per-agent object and
 * disposes its per-agent material; geometries/materials/pools are reused.
 */
export class Crowd {
  readonly group = new THREE.Group();
  private views = new Map<number, Passenger>();
  private links = new Map<number, { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }>();
  private sim: CrowdSim | null = null;
  private bodies = new Map<Look, THREE.InstancedMesh>();
  private cases!: THREE.InstancedMesh;
  private blobs!: THREE.InstancedMesh;
  private icons = new Map<IconKind, THREE.InstancedMesh>();
  private stink!: THREE.InstancedMesh;
  private flies!: THREE.InstancedMesh;
  private capacity = 0;
  private detail: QualityLevel = 'high';
  private iconsOn = true;
  private m4 = new THREE.Matrix4();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();
  private q = new THREE.Quaternion();
  private shadowQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  private white = new THREE.Color(1, 1, 1);
  /** Drawn standers for the door party. Not agents. */
  private block: { x: number; z: number; yaw: number; look: Look }[] = [];
  private iconMats: THREE.MeshBasicMaterial[] = [];

  constructor() {
    this.ensureCapacity(Math.max(64, TUNING.physics.maxBodies + 16));
  }

  private pool(geo: THREE.BufferGeometry, mat: THREE.Material, cap: number, cast: boolean, color = false): THREE.InstancedMesh {
    const m = new THREE.InstancedMesh(geo, mat, cap);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (color) {
      for (let i = 0; i < cap; i++) m.setColorAt(i, new THREE.Color(1, 1, 1));
      m.instanceColor!.setUsage(THREE.DynamicDrawUsage);
    }
    m.count = 0;
    m.castShadow = cast;
    m.frustumCulled = false; // instances span the whole car
    this.group.add(m);
    return m;
  }

  /** (Re)build the instanced pools (rare: only if more agents than expected). */
  private ensureCapacity(n: number): void {
    if (n <= this.capacity) return;
    const cap = Math.max(n, this.capacity * 2);
    const drop = (m?: THREE.InstancedMesh) => {
      if (!m) return;
      this.group.remove(m);
      m.dispose(); // frees instance buffers only; geometry/material are shared
    };
    for (const look of LOOKS) {
      drop(this.bodies.get(look));
      this.bodies.set(look, this.pool(lookGeometry(look), CHAR_MAT, cap, true, true));
    }
    drop(this.cases);
    this.cases = this.pool(suitcaseGeometry(), CHAR_MAT, cap, true, true);
    drop(this.blobs);
    this.blobs = this.pool(G.shadow, M.shadow, cap, false);
    const plane = new THREE.PlaneGeometry(0.36, 0.36);
    for (const k of ICON_KINDS) {
      drop(this.icons.get(k));
      let mat = this.iconMats[ICON_KINDS.indexOf(k)];
      if (!mat) {
        mat = new THREE.MeshBasicMaterial({ map: badgeTexture(k), transparent: true, depthWrite: false, alphaTest: 0.02 });
        this.iconMats[ICON_KINDS.indexOf(k)] = mat;
      }
      const m = this.pool(plane, mat, cap, false);
      m.renderOrder = 6;
      this.icons.set(k, m);
    }
    drop(this.stink);
    this.stink = this.pool(
      new THREE.PlaneGeometry(0.11, 0.33),
      new THREE.MeshBasicMaterial({ map: stinkTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide }),
      cap * STINK_PER,
      false,
    );
    this.stink.renderOrder = 5;
    drop(this.flies);
    this.flies = this.pool(new THREE.BoxGeometry(0.035, 0.025, 0.035), new THREE.MeshBasicMaterial({ color: 0x111111 }), cap * FLIES_PER, false);
    this.capacity = cap;
  }

  /** Quality tier: Low drops stench lines / flies (bodies, icons and shadows stay). */
  setDetail(q: QualityLevel): void {
    this.detail = q;
  }

  /** Floating passenger-type icons on/off (settings toggle). */
  setIcons(on: boolean): void {
    this.iconsOn = on;
  }

  bind(sim: CrowdSim): void {
    this.clear();
    this.sim = sim;
    this.sync();
  }

  /** Standing party in a shut door. One static obstacle in the sim; these are only the bodies. */
  setDoorBlock(block: DoorBlock | null): void {
    const looks: Look[] = ['normal0', 'normal1', 'normal3', 'normal5'];
    this.block = (block?.people ?? []).map((p, i) => ({ x: p.x, z: p.z, yaw: p.yaw, look: looks[i % looks.length]! }));
  }

  get passengers(): Passenger[] {
    return [...this.views.values()];
  }

  clear(): void {
    for (const v of this.views.values()) {
      this.group.remove(v.mesh);
      v.dispose();
    }
    this.views.clear();
    for (const l of this.links.values()) {
      this.group.remove(l.mesh);
      l.mat.dispose();
    }
    this.links.clear();
    for (const m of this.bodies.values()) m.count = 0;
    for (const m of this.icons.values()) m.count = 0;
    this.cases.count = 0;
    this.blobs.count = 0;
    this.stink.count = 0;
    this.flies.count = 0;
    this.block = [];
    this.sim = null;
  }

  /** v0.7 cutscene: boss figures turn to face the camera (null = normal facing). */
  /** Cutscene: show every boss name tag regardless of distance. */
  allBossTags = false;

  faceBosses(cam: THREE.Vector3 | null): void {
    for (const v of this.views.values()) {
      if (!v.agent.boss) continue;
      v.faceYaw = cam ? Math.atan2(cam.x - v.agent.body.x, cam.z - v.agent.body.z) : null;
    }
  }

  private bossKindsCache: { sim: CrowdSim | null; n: number } = { sim: null, n: 0 };
  private bossKinds(): number {
    if (this.bossKindsCache.sim !== this.sim) {
      this.bossKindsCache = { sim: this.sim, n: new Set(this.sim!.bosses().map((a) => a.boss!.kind)).size };
    }
    return this.bossKindsCache.n;
  }

  /** Release GPU resources owned by the crowd view (app teardown). */
  dispose(): void {
    this.clear();
    for (const m of this.bodies.values()) m.dispose();
    for (const m of this.icons.values()) m.dispose();
    this.cases.dispose();
    this.blobs.dispose();
    this.stink.dispose();
    this.flies.dispose();
  }

  private sync(): void {
    if (!this.sim) return;
    this.ensureCapacity(this.sim.agents.length);
    for (const a of this.sim.agents) {
      if (this.views.has(a.id)) continue;
      const v = new Passenger(a);
      this.views.set(a.id, v);
      this.group.add(v.mesh);
      if (a.partner && a.id < a.partner.id && !this.links.has(a.id)) {
        const mat = new THREE.MeshBasicMaterial({ color: 0xf2c6a0 });
        const mesh = new THREE.Mesh(linkGeo, mat);
        this.links.set(a.id, { mesh, mat });
        this.group.add(mesh);
      }
    }
  }

  private icon(kind: IconKind, x: number, y: number, z: number, scale: number, cam: THREE.Camera): void {
    const m = this.icons.get(kind)!;
    this.v.set(x, y, z);
    this.s.setScalar(scale);
    this.m4.compose(this.v, cam.quaternion, this.s);
    m.setMatrixAt(m.count++, this.m4);
  }

  /**
   * @param focus player position: type icons only show for passengers near it
   *   (plus any angry man winding up) so dense levels don't drown in badges.
   */
  update(alpha: number, dt: number, time: number, cam: THREE.Camera, focus: { x: number; z: number } | null = null): void {
    if (!this.sim) return;
    if (this.views.size !== this.sim.agents.length) this.sync();
    for (const m of this.bodies.values()) m.count = 0;
    for (const m of this.icons.values()) m.count = 0;
    this.cases.count = 0;
    this.stink.count = 0;
    this.flies.count = 0;
    const fx = this.detail === 'high';
    // Boss tags: a lone king always shows his; with several (L100) only the nearest king within
    // reach is tagged during play (the title card already names all eight in the cutscene).
    const many = this.bossKinds() > 1;
    let tagged: Agent | null = null;
    if (many && focus && !this.allBossTags) {
      let best = 3.0;
      for (const a of this.sim.agents) {
        if (!a.boss) continue;
        const d = Math.hypot(a.body.x - focus.x, a.body.z - focus.z);
        if (d < best) { best = d; tagged = a; }
      }
    }
    let i = 0;
    for (const v of this.views.values()) {
      v.simTime = this.sim.time;
      if (v.agent.boss && focus) v.setTagVisible(!many || v.agent === tagged);
      v.update(alpha, dt, time);
      // Group sits at the origin, so world matrices == group-local instance matrices.
      v.mesh.updateMatrixWorld(true);
      const body = this.bodies.get(v.look)!;
      const bi = body.count++;
      body.setMatrixAt(bi, v.rig.matrixWorld);
      body.setColorAt(bi, v.tint);
      this.blobs.setMatrixAt(i, v.shadowAnchor.matrixWorld);
      if (v.caseAnchor) {
        const ci = this.cases.count++;
        this.cases.setMatrixAt(ci, v.caseAnchor.matrix);
        this.cases.setColorAt(ci, v.tint);
      }
      const a = v.agent;
      const p = v.mesh.position;
      const top = 1.5 * a.scale + 0.12;
      if (this.iconsOn && a.kind !== 'normal' && a.kind !== 'couple' && !a.isKid && !a.boss) {
        const near = this.nearness(focus, p.x, p.z);
        if (near > 0 || v.windupP > 0) {
          const pulse = a.kind === 'angry' ? 1 + v.windupP * 0.7 + Math.sin(time * 40) * 0.08 * v.windupP : 1;
          this.icon(a.kind as IconKind, p.x, top + Math.sin(time * 2.5 + a.id) * 0.03, p.z, pulse * Math.max(near, v.windupP), cam);
        }
      }
      if (fx && a.kind === 'stench') {
        for (let k = 0; k < STINK_PER; k++) {
          const ph = (time * 0.55 + k / STINK_PER + a.id * 0.137) % 1;
          const s = Math.sin(ph * Math.PI);
          this.v.set(p.x + (k - 1) * 0.17 + Math.sin(ph * 6 + k * 2) * 0.05, 0.95 + ph * 0.75, p.z - 0.05);
          this.s.set(s, 0.6 + 0.4 * s, s);
          this.m4.compose(this.v, cam.quaternion, this.s);
          this.stink.setMatrixAt(this.stink.count++, this.m4);
        }
        for (let k = 0; k < FLIES_PER; k++) {
          const ang = time * (4.5 + k * 1.3) + k * 2.1 + a.id;
          const r = 0.3 + 0.06 * Math.sin(time * 3 + k);
          this.v.set(p.x + Math.cos(ang) * r, 1.22 + Math.sin(time * 9 + k * 1.7) * 0.09, p.z + Math.sin(ang) * r);
          this.q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, -ang);
          this.s.setScalar(1);
          this.m4.compose(this.v, this.q, this.s);
          this.flies.setMatrixAt(this.flies.count++, this.m4);
        }
      }
      i++;
    }
    for (const p of this.block) {
      this.q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, p.yaw);
      this.v.set(p.x, 0, p.z);
      this.s.set(1, 1, 1);
      this.m4.compose(this.v, this.q, this.s);
      const body = this.bodies.get(p.look)!;
      const bi = body.count++;
      body.setMatrixAt(bi, this.m4);
      body.setColorAt(bi, this.white);
      this.v.set(p.x, 0.012, p.z);
      this.m4.compose(this.v, this.shadowQ, this.s);
      this.blobs.setMatrixAt(i++, this.m4);
    }
    this.blobs.count = i;
    for (const m of this.bodies.values()) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    this.cases.instanceMatrix.needsUpdate = true;
    if (this.cases.instanceColor) this.cases.instanceColor.needsUpdate = true;
    this.blobs.instanceMatrix.needsUpdate = true;
    this.stink.instanceMatrix.needsUpdate = true;
    this.flies.instanceMatrix.needsUpdate = true;

    const rest = TUNING.types.couple.rest;
    for (const [id, l] of this.links) {
      const v = this.views.get(id);
      const p = v?.agent.partner;
      if (!v || !p) continue;
      const a = v.agent.body;
      const b = p.body;
      const ax = a.px + (a.x - a.px) * alpha;
      const az = a.pz + (a.z - a.pz) * alpha;
      const bx = b.px + (b.x - b.px) * alpha;
      const bz = b.pz + (b.z - b.pz) * alpha;
      const dx = bx - ax;
      const dz = bz - az;
      const d = Math.hypot(dx, dz);
      const king = v.agent.boss ? 2 : 1;
      l.mesh.visible = !(this.sim.isSplit(v.agent));
      l.mesh.position.set((ax + bx) / 2, 0.42 * (v.agent.boss ? v.agent.scale * 0.9 : 1), (az + bz) / 2);
      l.mesh.scale.set(Math.max(0.05, d - 0.36 * king), king, king);
      l.mesh.rotation.y = -Math.atan2(dz, dx);
      const tension = Math.min(1, Math.max(0, (d - (v.agent.boss ? v.agent.boss.rest : rest)) / 0.5));
      l.mat.color.setRGB(0.95, 0.78 - tension * 0.55, 0.63 - tension * 0.5);
      const near = this.nearness(focus, (ax + bx) / 2, (az + bz) / 2);
      if (this.iconsOn && near > 0) {
        const beat = 1 + Math.max(0, Math.sin(time * 7 + id)) * 0.15 - tension * 0.25;
        this.icon('couple', (ax + bx) / 2, 1.62 + Math.sin(time * 2 + id) * 0.05, (az + bz) / 2, beat * near, cam);
      }
    }
    for (const m of this.icons.values()) m.instanceMatrix.needsUpdate = true;
    // Empty pools still cost a draw call (and a shadow-pass call) — hide them.
    for (const m of this.group.children) if ((m as THREE.InstancedMesh).isInstancedMesh) m.visible = (m as THREE.InstancedMesh).count > 0;
  }

  /** 1 near the focus, easing to 0 at ICON_RANGE (always 1 without a focus). */
  private nearness(focus: { x: number; z: number } | null, x: number, z: number): number {
    if (!focus) return 1;
    const d = Math.hypot(x - focus.x, z - focus.z);
    if (d >= ICON_RANGE) return 0;
    return d < ICON_RANGE - 0.8 ? 1 : 0.55 + 0.45 * ((ICON_RANGE - d) / 0.8);
  }
}
