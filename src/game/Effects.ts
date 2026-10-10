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

/** Floor ice array — concentric rings + radial spokes, readable from iso cam. */
interface IceArray {
  root: THREE.Group;
  mats: THREE.MeshBasicMaterial[];
  t: number;
  dur: number;
  radius: number;
}

/** Floor cone wedge for wind shove lane (sector, not a full circle). */
interface ConeWedge {
  mesh: THREE.Mesh;
  edgeL: THREE.Mesh;
  edgeR: THREE.Mesh;
  mats: THREE.MeshBasicMaterial[];
  t: number;
  dur: number;
}

/** Tall amber sink pillar (gravity / freezing-sink). */
interface SinkPillar {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  t: number;
  dur: number;
}

const MAX_PARTICLES = 220;
const MAX_BOLTS = 4;
const MAX_ARCS = 64;
const TRAIL_LEN = 6;
const MAX_CRYSTALS = 24;
const MAX_SHELLS = 12;
const MAX_ICE_ARRAYS = 3;
const MAX_CONES = 3;
const MAX_PILLARS = 16;

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
  private iceArrays: IceArray[] = [];
  private cones: ConeWedge[] = [];
  private pillars: SinkPillar[] = [];
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


    // Cool Breeze / ice+wind: lasting geometric ice array on the floor.
    for (let i = 0; i < MAX_ICE_ARRAYS; i++) {
      this.iceArrays.push(this.makeIceArray());
    }
    for (let i = 0; i < MAX_CONES; i++) {
      this.cones.push(this.makeConeWedge());
    }
    // Amber sink pillars (box columns) — gravity / freezing-sink.
    for (let i = 0; i < MAX_PILLARS; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff9800, transparent: true, opacity: 0,
        depthWrite: false, depthTest: false, toneMapped: false,
        blending: THREE.NormalBlending,
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.8, 0.22), mat);
      mesh.visible = false;
      mesh.renderOrder = 40;
      this.group.add(mesh);
      this.pillars.push({ mesh, mat, t: 1, dur: 1 });
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

  /**
   * Wind: thick teal directional ribbons + floor CONE WEDGE (not a full circle).
   * Readable shove lane from iso phone cam.
   */
  gust(x: number, z: number, dx: number, dz: number, range: number, width: number, color = 0x00897b): void {
    const len = Math.hypot(dx, dz) || 1;
    const ndx = dx / len;
    const ndz = dz / len;
    const R = Math.max(range, 2.4);
    const halfW = Math.max(0.65, width);
    this.coneWedge(x, z, ndx, ndz, R, halfW, 0.85);
    // Thick teal ribbons (box arcs) — the shove read. Almost no sphere "bubbles".
    for (let i = 0; i < 10; i++) {
      const u0 = 0.02 + i * 0.09;
      const u1 = Math.min(0.98, u0 + 0.22);
      const lat = ((i % 2) * 2 - 1) * halfW * (0.08 + (i % 4) * 0.1);
      const y = 0.55 + (i % 3) * 0.28;
      const a = { x: x + ndx * R * u0 - ndz * lat, z: z + ndz * R * u0 + ndx * lat };
      const b = { x: x + ndx * R * u1 - ndz * lat * 0.55, z: z + ndz * R * u1 + ndx * lat * 0.55 };
      // Fat body + bright core.
      this.spawnArcAt(a, b, y, color, 0.7, 2.1);
      this.spawnArcAt(a, b, y, 0xe0f2f1, 0.55, 0.85);
    }
    // A few tiny sparks only (not the silhouette).
    const speed = Math.max(5, R / 0.32);
    for (let i = 0; i < 8; i++) {
      const p = this.free.pop();
      if (!p) break;
      const along = 0.1 + Math.random() * 0.8;
      const lat = (Math.random() - 0.5) * halfW;
      p.x = x + ndx * R * along - ndz * lat;
      p.z = z + ndz * R * along + ndx * lat;
      p.y = 0.7 + Math.random() * 0.4;
      p.vx = ndx * speed; p.vz = ndz * speed; p.vy = 0;
      p.life = p.max = 0.35; p.size = 0.35; p.grav = 0; p.drag = 0.3;
      p.mat.color.setHex(0xb2dfdb); p.mat.opacity = 0.9;
      p.mat.blending = THREE.NormalBlending;
      p.mesh.visible = true; this.parts.push(p);
    }
  }

  /** Floor sector wedge under a wind cast — cone silhouette, never a full ring. */
  coneWedge(x: number, z: number, dx: number, dz: number, range: number, halfWidth: number, dur = 0.65): void {
    const slot = this.cones.find((c) => c.t >= c.dur) ?? this.cones[0];
    const yaw = Math.atan2(dx, dz);
    // half-angle from width at mid-range.
    const mid = Math.max(range * 0.55, 1);
    const halfAng = Math.atan2(halfWidth, mid);
    const ang = Math.max(0.35, Math.min(1.1, halfAng * 2));
    slot.t = 0;
    slot.dur = dur;
    slot.mesh.position.set(x, 0.04, z);
    slot.mesh.rotation.x = -Math.PI / 2;
    slot.mesh.rotation.z = yaw - ang / 2;
    // Rebuild sector scale via geometry replacement is heavy — scale unit circle sector.
    slot.mesh.scale.setScalar(range);
    slot.mesh.visible = true;
    // Edge rails along the two cone sides.
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const lx = -s;
    const lz = c;
    const tipX = x + dx * range;
    const tipZ = z + dz * range;
    const placeEdge = (edge: THREE.Mesh, side: number) => {
      const ox = lx * halfWidth * side;
      const oz = lz * halfWidth * side;
      const mx = (x + ox + tipX) / 2;
      const mz = (z + oz + tipZ) / 2;
      const ex = tipX - (x + ox);
      const ez = tipZ - (z + oz);
      const elen = Math.hypot(ex, ez) || 1;
      edge.position.set(mx, 0.055, mz);
      edge.rotation.set(-Math.PI / 2, 0, Math.atan2(ex, ez));
      edge.scale.set(0.07, elen, 1);
      edge.visible = true;
    };
    placeEdge(slot.edgeL, -1);
    placeEdge(slot.edgeR, 1);
    for (const m of slot.mats) m.opacity = m.userData.baseOp as number;
  }

  private makeConeWedge(): ConeWedge {
    // Unit sector ~70°; yaw+scale set at spawn. thetaStart=0, thetaLength set wide then masked by edges.
    const geo = new THREE.CircleGeometry(1, 28, 0, 0.95);
    const fillMat = new THREE.MeshBasicMaterial({
      color: 0x00897b, transparent: true, opacity: 0.55,
      side: THREE.DoubleSide, depthWrite: false, depthTest: true, toneMapped: false,
    });
    fillMat.userData.baseOp = 0.55;
    const mesh = new THREE.Mesh(geo, fillMat);
    mesh.visible = false;
    mesh.renderOrder = 9;
    this.group.add(mesh);
    const edgeMat = new THREE.MeshBasicMaterial({
      color: 0xb2dfdb, transparent: true, opacity: 0.95,
      side: THREE.DoubleSide, depthWrite: false, depthTest: true, toneMapped: false,
    });
    edgeMat.userData.baseOp = 0.95;
    const edgeGeo = new THREE.PlaneGeometry(1, 1);
    const edgeL = new THREE.Mesh(edgeGeo, edgeMat);
    const edgeR = new THREE.Mesh(edgeGeo, edgeMat.clone());
    (edgeR.material as THREE.MeshBasicMaterial).userData.baseOp = 0.95;
    edgeL.visible = edgeR.visible = false;
    edgeL.renderOrder = edgeR.renderOrder = 10;
    this.group.add(edgeL, edgeR);
    return { mesh, edgeL, edgeR, mats: [fillMat, edgeMat, edgeR.material as THREE.MeshBasicMaterial], t: 1, dur: 1 };
  }

  /**
   * Wind+gravity: thin funnel — streaks converge then shove hard (narrow lane).
   */
  funnelGust(x: number, z: number, dx: number, dz: number, range: number, width: number): void {
    const w = Math.max(0.35, width * 0.75);
    this.gust(x, z, dx, dz, range, w, 0x66bb6a);
    for (let i = 0; i < 10; i++) {
      const p = this.free.pop();
      if (!p) break;
      const along = 0.15 + Math.random() * 0.7;
      const side = (i % 2 === 0 ? 1 : -1) * (w * 1.6 + Math.random() * 0.4);
      p.x = x + dx * range * along - dz * side;
      p.z = z + dz * range * along + dx * side;
      p.y = 0.7 + Math.random() * 0.5;
      p.vx = dx * 1.2 + dz * side * -2.8;
      p.vz = dz * 1.2 + dx * side * 2.8;
      p.vy = -1.8 - Math.random();
      p.life = p.max = 0.4 + Math.random() * 0.15;
      p.size = 0.55 + Math.random() * 0.25;
      p.grav = -2.5;
      p.drag = 1.2;
      p.mat.color.setHex(0xffcc80);
      p.mat.opacity = 0.95;
      p.mat.blending = THREE.NormalBlending;
      p.mesh.visible = true;
      this.parts.push(p);
    }
  }

  /** Pure ice / Cool Breeze entry: leaving → iceArray; else frost only (NO magic-circle seal). */
  coldPool(x: number, z: number, radius: number, leaving = false): void {
    const R = Math.max(radius, 1.4);
    if (leaving) {
      this.iceArray(x, z, R, 2.5);
      this.puff(x, 0.45, z, 18, 0xe1f5fe, 2.1, 1.15, 0.7, 0.25, -0.1);
      return;
    }
    this.frostFloor(x, z, R);
    this.puff(x, 0.22, z, 10, 0xbbdefb, 0.4, 1.1, 0.7, 0.06, -0.04);
  }

  /** Plant low frost crystals only — no shockwave rings / no iceArray seal. */
  frostFloor(x: number, z: number, radius: number): void {
    const R = Math.max(radius, 1.3);
    for (let i = 0; i < 16; i++) {
      const c = this.freeCrystals.pop();
      if (!c) break;
      const a = (i / 16) * Math.PI * 2 + Math.random() * 0.2;
      const rad = R * (0.15 + Math.random() * 0.8);
      c.x = x + Math.cos(a) * rad;
      c.z = z + Math.sin(a) * rad;
      c.y = 0.08 + Math.random() * 0.1;
      c.vx = (Math.random() - 0.5) * 0.1;
      c.vz = (Math.random() - 0.5) * 0.1;
      c.vy = 0.1 + Math.random() * 0.25;
      c.life = c.max = 1.15 + Math.random() * 0.35;
      c.spin = (Math.random() - 0.5) * 3;
      c.mat.color.setHex(i % 2 ? 0x42a5f5 : 0xe1f5fe);
      c.mat.opacity = 0.95;
      c.mesh.visible = true;
      c.mesh.scale.setScalar(0.75 + Math.random() * 0.95);
      this.crystals.push(c);
    }
  }

  /**
   * Ice+gravity: frost crystals + thick amber sink pillars slamming onto targets.
   * No iceArray seal.
   */
  freezingSink(x: number, z: number, radius: number): void {
    const R = Math.max(radius, 1.4);
    this.frostFloor(x, z, R);
    // Dense amber pillars across the zone (and callers add more on shell targets).
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      const rad = R * (0.25 + (i % 3) * 0.2);
      this.sinkPillar(x + Math.cos(a) * rad, z + Math.sin(a) * rad, 1.1 + (i % 3) * 0.15);
    }
    // Extra falling amber streaks.
    for (let i = 0; i < 14; i++) {
      const p = this.free.pop();
      if (!p) break;
      const a = Math.random() * Math.PI * 2;
      const rad = Math.random() * R * 0.75;
      p.x = x + Math.cos(a) * rad;
      p.z = z + Math.sin(a) * rad;
      p.y = 1.6 + Math.random() * 0.7;
      p.vx = 0;
      p.vz = 0;
      p.vy = -4.5 - Math.random() * 2;
      p.life = p.max = 0.55 + Math.random() * 0.2;
      p.size = 0.7 + Math.random() * 0.4;
      p.grav = -5;
      p.drag = 0.4;
      p.mat.color.setHex(0xff9800);
      p.mat.opacity = 1;
      p.mat.blending = THREE.NormalBlending;
      p.mesh.visible = true;
      this.parts.push(p);
    }
  }

  /** Tall amber column slamming down — gravity / freezing-sink silhouette. */
  sinkPillar(x: number, z: number, scale = 1, dur = 0.7): void {
    const s = this.pillars.find((p) => p.t >= p.dur) ?? this.pillars[0];
    s.t = 0;
    s.dur = dur;
    s.mat.color.setHex(0xff9800);
    s.mat.opacity = 0.92;
    s.mesh.position.set(x, 1.1 * scale, z);
    s.mesh.scale.set(1.15 * scale, 1.35 * scale, 1.15 * scale);
    s.mesh.visible = true;
  }

  /** Gravity on her: downward squash / sink / pull lines on her body — not a floor AoE. */
  weightOn(x: number, z: number): void {
    // Tall amber pillars slamming down onto her — reads as weight from iso cam.
    for (let i = 0; i < 22; i++) {
      const p = this.free.pop();
      if (!p) break;
      const a = Math.random() * Math.PI * 2;
      const rad = 0.02 + Math.random() * 0.22;
      p.x = x + Math.cos(a) * rad;
      p.z = z + Math.sin(a) * rad;
      p.y = 1.4 + Math.random() * 0.9;
      p.vx = Math.cos(a) * 0.05;
      p.vz = Math.sin(a) * 0.05;
      p.vy = -3.5 - Math.random() * 2.2;
      p.life = p.max = 0.5 + Math.random() * 0.2;
      p.size = 0.55 + Math.random() * 0.35;
      p.grav = -4.5;
      p.drag = 0.6;
      p.mat.color.setHex(i % 3 === 0 ? 0xffe082 : 0xff9800);
      p.mat.opacity = 1;
      p.mat.blending = THREE.NormalBlending;
      p.mesh.visible = true;
      this.parts.push(p);
    }
    // Tiny brace disc only — personal, not a crowd AoE ring.
    this.shockwave(x, z, 0.55, 0xff6f00, 0.4);
  }

  /**
   * Geometric ice circle on the floor (concentric rings + radial spokes + compass ticks).
   * Inspired by stylised ground arrays — original geometry, no character art.
   */
  iceArray(x: number, z: number, radius: number, dur = 2.4): void {
    const slot = this.iceArrays.find((a) => a.t >= a.dur) ?? this.iceArrays[0];
    const R = Math.max(radius, 1.5);
    slot.t = 0;
    slot.dur = dur;
    slot.radius = R;
    slot.root.position.set(x, 0.045, z);
    slot.root.scale.setScalar(R);
    slot.root.visible = true;
    slot.root.rotation.y = Math.random() * Math.PI * 2;
    for (const m of slot.mats) {
      m.opacity = m.userData.baseOp as number;
    }
  }

  private makeIceArray(): IceArray {
    const root = new THREE.Group();
    root.visible = false;
    const mats: THREE.MeshBasicMaterial[] = [];
    const addMat = (color: number, opacity: number, additive = false) => {
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: true,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        toneMapped: false,
      });
      mat.userData.baseOp = opacity;
      mats.push(mat);
      return mat;
    };
    // Unit circle (scaled by radius at spawn). Soft fill disc.
    const fill = new THREE.Mesh(
      new THREE.CircleGeometry(1, 48),
      addMat(0x1565c0, 0.28),
    );
    fill.rotation.x = -Math.PI / 2;
    fill.position.y = 0.002;
    fill.renderOrder = 8;
    root.add(fill);
    // Concentric rings (outer bold, mid, inner).
    const rings: Array<[number, number, number, number]> = [
      [0.88, 1.0, 0x81d4fa, 0.95],
      [0.62, 0.72, 0x4fc3f7, 0.8],
      [0.34, 0.42, 0xe3f2fd, 0.75],
      [0.08, 0.14, 0xffffff, 0.55],
    ];
    for (const [inner, outer, col, op] of rings) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(inner, outer, 64),
        addMat(col, op, true),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.01;
      ring.renderOrder = 9;
      root.add(ring);
    }
    // Radial spokes (12) — compass rose.
    const spokeMat = addMat(0xb3e5fc, 0.85, true);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const len = i % 3 === 0 ? 0.92 : 0.72;
      const w = i % 3 === 0 ? 0.045 : 0.028;
      const spoke = new THREE.Mesh(new THREE.PlaneGeometry(w, len), spokeMat);
      spoke.rotation.x = -Math.PI / 2;
      spoke.rotation.z = a;
      spoke.position.set(Math.cos(a) * (len * 0.5), 0.012, Math.sin(a) * (len * 0.5));
      spoke.renderOrder = 10;
      root.add(spoke);
    }
    // Cardinal diamonds / ticks.
    const tickMat = addMat(0xe1f5fe, 0.9, true);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const diamond = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.12), tickMat);
      diamond.rotation.x = -Math.PI / 2;
      diamond.rotation.z = a + Math.PI / 4;
      const rr = i % 2 === 0 ? 0.78 : 0.55;
      diamond.position.set(Math.cos(a) * rr, 0.014, Math.sin(a) * rr);
      diamond.renderOrder = 11;
      root.add(diamond);
    }
    // Inner hexagon outline (6 short bars).
    const hexMat = addMat(0x29b6f6, 0.7, true);
    for (let i = 0; i < 6; i++) {
      const a0 = (i / 6) * Math.PI * 2;
      const a1 = ((i + 1) / 6) * Math.PI * 2;
      const mx = (Math.cos(a0) + Math.cos(a1)) * 0.25;
      const mz = (Math.sin(a0) + Math.sin(a1)) * 0.25;
      const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.035), hexMat);
      edge.rotation.x = -Math.PI / 2;
      edge.rotation.z = a0 + Math.PI / 6;
      edge.position.set(mx, 0.013, mz);
      edge.renderOrder = 10;
      root.add(edge);
    }
    this.group.add(root);
    return { root, mats, t: 1, dur: 1, radius: 1 };
  }


  /**
   * Gear L item-specific cast FX (drone / tablet / fan / consumables).
   * Silhouette must differ from Katie weather and from each other.
   */
  gadgetFx(id: string, x: number, z: number, dx = 0, dz = -1): void {
    if (id === 'D3') {
      // Decoy drone: hovering teal crystal body above the lure + thin scan disc.
      const c = this.freeCrystals.pop();
      if (c) {
        c.x = x; c.y = 1.55; c.z = z;
        c.vx = 0; c.vy = 0.15; c.vz = 0;
        c.life = c.max = 1.4; c.spin = 6;
        c.mat.color.setHex(0x00e5ff); c.mat.opacity = 1;
        c.mesh.visible = true; c.mesh.scale.setScalar(1.8);
        this.crystals.push(c);
      }
      this.shockwave(x, z, 0.9, 0x00acc1, 0.85);
      // Orbit sparks around the drone (reads as a gadget, not weather).
      for (let i = 0; i < 10; i++) {
        const p = this.free.pop();
        if (!p) break;
        const a = (i / 10) * Math.PI * 2;
        p.x = x + Math.cos(a) * 0.45; p.z = z + Math.sin(a) * 0.45;
        p.y = 1.55; p.vx = -Math.sin(a) * 2.2; p.vz = Math.cos(a) * 2.2;
        p.vy = 0.2; p.life = p.max = 0.85; p.size = 0.45; p.grav = 0; p.drag = 0.4;
        p.mat.color.setHex(i % 2 ? 0x84ffff : 0xffee58); p.mat.opacity = 1;
        p.mat.blending = THREE.NormalBlending;
        p.mesh.visible = true; this.parts.push(p);
      }
      return;
    }
    if (id === 'D4') {
      // Cartoon tablet: magenta screen flash + soft attract ring.
      this.puff(x, 0.9, z, 14, 0xec407a, 1.4, 1.3, 0.5, 0.9, -1);
      this.puff(x, 0.7, z, 8, 0xf8bbd0, 0.8, 1.0, 0.4, 0.4, -0.5, false);
      this.shockwave(x, z, 2.2, 0xf06292, 0.65);
      return;
    }
    if (id === 'D5') {
      // Turbo fan: hydro-ish cyan spray cone + buzz spark at muzzle.
      this.gust(x, z, dx, dz, 2.4, 0.7, 0x4dd0e1);
      this.puff(x + dx * 0.3, 0.85, z + dz * 0.3, 8, 0xffee58, 2.2, 0.9, 0.28, 0.5, -1);
      return;
    }
    if (id === 'S2') {
      // Spring boots hop: green bounce puffs under feet.
      this.puff(x, 0.15, z, 12, 0x9ccc65, 1.8, 1.1, 0.4, 1.6, -3);
      this.shockwave(x, z, 1.0, 0xaed581, 0.35);
      return;
    }
    if (id === 'K1') {
      // Water: blue splash on self.
      this.puff(x, 1.0, z, 14, 0x42a5f5, 1.6, 1.1, 0.45, 1.2, -2);
      this.puff(x, 0.6, z, 8, 0xe3f2fd, 1.0, 0.9, 0.35, 0.5, -1, false);
      return;
    }
    if (id === 'K2') {
      // Espresso: warm buzz spark burst.
      this.puff(x, 1.15, z, 16, 0xff8f00, 2.4, 1.15, 0.4, 1.5, -2);
      this.puff(x, 1.0, z, 8, 0xffe082, 1.6, 0.9, 0.3, 0.8, -1);
      return;
    }
    if (id === 'K3') {
      // Mint: green sparkles.
      this.puff(x, 1.05, z, 14, 0x66bb6a, 1.5, 1.0, 0.5, 1.3, -1.5);
      this.puff(x, 0.85, z, 8, 0xc8e6c9, 0.9, 0.85, 0.4, 0.6, -0.8, false);
      return;
    }
    this.puff(x, 0.8, z, 10, 0xce93d8, 1.4, 1.0, 0.4);
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
    this.spawnArcAt(a, b, 1.55, color, dur, thick);
  }

  /** Wind ribbon helper — controllable height so streaks read above the floor wedge. */
  private spawnArcAt(
    a: { x: number; z: number }, b: { x: number; z: number },
    y: number, color: number, dur = 0.35, thick = 1,
  ): void {
    const seg = this.arcs.find((s) => s.t >= s.dur) ?? this.arcs[0];
    const mx = (a.x + b.x) / 2;
    const mz = (a.z + b.z) / 2;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 0.2;
    const yaw = Math.atan2(-dz, dx);
    seg.mesh.position.set(mx, y, mz);
    seg.mesh.rotation.set(0, yaw, 0);
    const cross = 0.85 * thick;
    seg.mesh.scale.set(Math.max(len, 0.7), cross, cross);
    seg.mesh.userData.baseCross = cross;
    seg.mesh.userData.baseLen = Math.max(len, 0.7);
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
    for (const a of this.iceArrays) { a.t = a.dur; a.root.visible = false; }
    for (const c of this.cones) {
      c.t = c.dur; c.mesh.visible = false; c.edgeL.visible = false; c.edgeR.visible = false;
    }
    for (const p of this.pillars) { p.t = p.dur; p.mesh.visible = false; }
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
      // Flicker relative to spawn thickness (keeps wind ribbons fat).
      const base = (a.mesh.userData.baseCross as number) || 0.85;
      const flick = 0.85 + Math.random() * 0.3;
      a.mesh.scale.y = base * flick;
      a.mesh.scale.z = base * flick;
    }

    for (const arr of this.iceArrays) {
      if (arr.t >= arr.dur) {
        arr.root.visible = false;
        continue;
      }
      arr.t += dt;
      const u = Math.min(1, arr.t / arr.dur);
      // Fade in fast, hold, then fade out — stays readable mid-cast.
      const fadeIn = Math.min(1, arr.t / 0.18);
      const fadeOut = u > 0.72 ? 1 - (u - 0.72) / 0.28 : 1;
      const pulse = 0.88 + 0.12 * Math.sin(arr.t * 7);
      const opMul = fadeIn * fadeOut * pulse;
      for (const m of arr.mats) {
        m.opacity = (m.userData.baseOp as number) * opMul;
      }
      arr.root.rotation.y += dt * 0.35;
      arr.root.visible = true;
    }

    for (const c of this.cones) {
      if (c.t >= c.dur) {
        c.mesh.visible = false; c.edgeL.visible = false; c.edgeR.visible = false;
        continue;
      }
      c.t += dt;
      const u = Math.min(1, c.t / c.dur);
      const fade = u < 0.15 ? u / 0.15 : u > 0.55 ? 1 - (u - 0.55) / 0.45 : 1;
      for (const m of c.mats) m.opacity = (m.userData.baseOp as number) * fade;
      c.mesh.visible = true;
      c.edgeL.visible = true;
      c.edgeR.visible = true;
    }

    for (const p of this.pillars) {
      if (p.t >= p.dur) { p.mesh.visible = false; continue; }
      p.t += dt;
      const u = Math.min(1, p.t / p.dur);
      const slam = Math.min(1, p.t / 0.12);
      p.mesh.position.y = (1.55 - 0.45 * slam) * (p.mesh.scale.y / 1.35);
      p.mat.opacity = (1 - u * 0.85) * 0.95;
      p.mesh.visible = true;
    }
  }
}
