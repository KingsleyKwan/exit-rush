import * as THREE from 'three';
import { heroGeometry } from './characters';

interface Particle {
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
  color: THREE.Color;
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

const MAX_PARTICLES = 220;

/**
 * Pooled visual effects: impact puffs (single InstancedMesh draw call),
 * shockwave rings, dash afterimages and the WIS path highlight.
 */
export class Effects {
  readonly group = new THREE.Group();
  private inst: THREE.InstancedMesh;
  private parts: Particle[] = [];
  private free: Particle[] = [];
  private rings: Ring[] = [];
  private ghosts: Ghost[] = [];
  private ghostIdx = 0;
  private dots: THREE.Mesh[] = [];
  private dotMat: THREE.MeshBasicMaterial;
  private m4 = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();

  constructor() {
    const geo = new THREE.IcosahedronGeometry(0.07, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false });
    this.inst = new THREE.InstancedMesh(geo, mat, MAX_PARTICLES);
    this.inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.inst.frustumCulled = false;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.inst.setColorAt(i, new THREE.Color(1, 1, 1));
      this.free.push({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, size: 1, grav: 0, drag: 0, color: new THREE.Color() });
    }
    this.inst.count = 0;
    this.group.add(this.inst);

    const ringGeo = new THREE.RingGeometry(0.86, 1, 48);
    for (let i = 0; i < 4; i++) {
      const mat2 = new THREE.MeshBasicMaterial({ color: 0xffb74d, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
      const mesh = new THREE.Mesh(ringGeo, mat2);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      this.group.add(mesh);
      this.rings.push({ mesh, mat: mat2, t: 1, dur: 1, maxR: 1 });
    }

    // Dash afterimages reuse the hero silhouette.
    const ghostGeo = heroGeometry();
    for (let i = 0; i < 10; i++) {
      const mat3 = new THREE.MeshBasicMaterial({ color: 0x4dd0e1, transparent: true, opacity: 0, depthWrite: false });
      const mesh = new THREE.Mesh(ghostGeo, mat3);
      mesh.visible = false;
      this.group.add(mesh);
      this.ghosts.push({ mesh, mat: mat3, t: 1 });
    }

    // X-ray style: drawn on top of the crowd so the gap path reads through bodies.
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
  }

  /** Burst of puffs at a point. */
  puff(
    x: number,
    y: number,
    z: number,
    count: number,
    color: number,
    speed = 1.5,
    size = 1,
    life = 0.45,
    up = 0.8,
    grav = -1.5,
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
      p.color.setHex(color);
      this.parts.push(p);
    }
  }

  /** Directional spray (shove cone). */
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
      p.color.setHex(color);
      this.parts.push(p);
    }
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
      // Travelling pulse along the path.
      const pulse = 0.75 + 0.45 * Math.max(0, Math.sin(time * 10 - i * 0.7));
      d.position.set(p.x, 0.04, p.z);
      d.scale.setScalar(pulse);
    }
    this.dotMat.opacity = pts.length ? 0.85 : 0;
  }

  update(dt: number): void {
    // Particles.
    let n = 0;
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) {
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
    }
    for (const p of this.parts) {
      const t = p.life / p.max;
      const sc = p.size * (0.4 + 0.9 * Math.sin(t * Math.PI));
      this.v.set(p.x, p.y, p.z);
      this.s.setScalar(sc);
      this.m4.compose(this.v, this.q, this.s);
      this.inst.setMatrixAt(n, this.m4);
      this.inst.setColorAt(n, p.color);
      n++;
    }
    this.inst.count = n;
    this.inst.instanceMatrix.needsUpdate = true;
    if (this.inst.instanceColor) this.inst.instanceColor.needsUpdate = true;

    for (const r of this.rings) {
      if (r.t >= r.dur) continue;
      r.t += dt;
      const u = Math.min(1, r.t / r.dur);
      const e = 1 - Math.pow(1 - u, 3);
      r.mesh.scale.setScalar(0.2 + e * r.maxR);
      r.mat.opacity = (1 - u) * 0.85;
      if (u >= 1) r.mesh.visible = false;
    }
    for (const g of this.ghosts) {
      if (g.t >= 1) continue;
      g.t += dt / 0.32;
      g.mat.opacity = Math.max(0, 0.5 * (1 - g.t));
      if (g.t >= 1) g.mesh.visible = false;
    }
  }

  clear(): void {
    for (const p of this.parts) this.free.push(p);
    this.parts.length = 0;
    this.inst.count = 0;
    for (const r of this.rings) {
      r.t = r.dur;
      r.mesh.visible = false;
    }
    for (const g of this.ghosts) {
      g.t = 1;
      g.mesh.visible = false;
    }
    this.setPath([], 0);
  }
}
