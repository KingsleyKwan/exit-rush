import * as THREE from 'three';
import { Passenger, G, M } from './Passenger';
import type { CrowdSim } from './sim/CrowdSim';
import { TUNING } from './sim/tuning';

const linkGeo = new THREE.CylinderGeometry(0.025, 0.025, 1, 6);
linkGeo.rotateZ(Math.PI / 2); // length along X

/**
 * View for the crowd sim: one Passenger body per agent (created lazily as
 * boarders spawn) plus "holding hands" links between couples that redden
 * under tension. Heads and blob shadows (identical for everyone) are drawn as
 * two InstancedMeshes, cutting draw calls (and shadow-pass calls) per agent.
 *
 * Restart hygiene: `bind()` → `clear()` removes every per-agent object and
 * disposes its per-agent material; shared geometries/materials and the
 * instanced meshes are reused across levels.
 */
export class Crowd {
  readonly group = new THREE.Group();
  private views = new Map<number, Passenger>();
  private links = new Map<number, { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }>();
  private sim: CrowdSim | null = null;
  private heads: THREE.InstancedMesh;
  private blobs: THREE.InstancedMesh;
  private capacity = 0;

  constructor() {
    this.heads = this.makeInstanced(G.head, M.head, true);
    this.blobs = this.makeInstanced(G.shadow, M.shadow, false);
    this.ensureCapacity(Math.max(64, TUNING.physics.maxBodies + 16));
  }

  private makeInstanced(geo: THREE.BufferGeometry, mat: THREE.Material, cast: boolean): THREE.InstancedMesh {
    const m = new THREE.InstancedMesh(geo, mat, 1);
    m.count = 0;
    m.castShadow = cast;
    m.frustumCulled = false; // instances span the whole car
    return m;
  }

  /** Grow the instanced pools (rare: only if more agents than expected). */
  private ensureCapacity(n: number): void {
    if (n <= this.capacity) return;
    const cap = Math.max(n, this.capacity * 2);
    const regrow = (old: THREE.InstancedMesh): THREE.InstancedMesh => {
      this.group.remove(old);
      old.dispose(); // frees instance buffers only; geometry/material are shared
      const m = new THREE.InstancedMesh(old.geometry, old.material as THREE.Material, cap);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.count = 0;
      m.castShadow = old.castShadow;
      m.frustumCulled = false;
      this.group.add(m);
      return m;
    };
    this.heads = regrow(this.heads);
    this.blobs = regrow(this.blobs);
    this.capacity = cap;
  }

  bind(sim: CrowdSim): void {
    this.clear();
    this.sim = sim;
    this.sync();
  }

  get passengers(): Passenger[] {
    return [...this.views.values()];
  }

  clear(): void {
    for (const v of this.views.values()) {
      this.group.remove(v.mesh);
      for (const e of v.extras) this.group.remove(e);
      v.dispose();
    }
    this.views.clear();
    for (const l of this.links.values()) {
      this.group.remove(l.mesh);
      l.mat.dispose();
    }
    this.links.clear();
    this.heads.count = 0;
    this.blobs.count = 0;
    this.sim = null;
  }

  /** Release GPU resources owned by the crowd view (app teardown). */
  dispose(): void {
    this.clear();
    this.heads.dispose();
    this.blobs.dispose();
  }

  private sync(): void {
    if (!this.sim) return;
    this.ensureCapacity(this.sim.agents.length);
    for (const a of this.sim.agents) {
      if (this.views.has(a.id)) continue;
      const v = new Passenger(a);
      this.views.set(a.id, v);
      this.group.add(v.mesh);
      for (const e of v.extras) this.group.add(e);
      if (a.partner && a.id < a.partner.id && !this.links.has(a.id)) {
        const mat = new THREE.MeshBasicMaterial({ color: 0xff80c0 });
        const mesh = new THREE.Mesh(linkGeo, mat);
        this.links.set(a.id, { mesh, mat });
        this.group.add(mesh);
      }
    }
  }

  update(alpha: number, dt: number, time: number): void {
    if (!this.sim) return;
    if (this.views.size !== this.sim.agents.length) this.sync();
    let i = 0;
    for (const v of this.views.values()) {
      v.update(alpha, dt, time);
      // Group sits at the origin, so world matrices == group-local instance matrices.
      v.mesh.updateMatrixWorld(true);
      this.heads.setMatrixAt(i, v.headAnchor.matrixWorld);
      this.blobs.setMatrixAt(i, v.shadowAnchor.matrixWorld);
      i++;
    }
    this.heads.count = i;
    this.blobs.count = i;
    this.heads.instanceMatrix.needsUpdate = true;
    this.blobs.instanceMatrix.needsUpdate = true;
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
      l.mesh.position.set((ax + bx) / 2, 0.62, (az + bz) / 2);
      l.mesh.scale.set(Math.max(0.05, d - 0.3), 1, 1);
      l.mesh.rotation.y = -Math.atan2(dz, dx);
      const tension = Math.min(1, Math.max(0, (d - rest) / 0.5));
      l.mat.color.setRGB(1, 0.5 - tension * 0.4, 0.75 - tension * 0.65);
    }
  }
}
