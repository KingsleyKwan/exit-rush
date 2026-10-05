import * as THREE from 'three';
import { PASSENGER_DEFS } from './PassengerTypes';
import { TUNING } from './sim/tuning';
import type { Agent } from './sim/CrowdSim';

/** Shared geometry / materials (never disposed per passenger). */
const G = {
  body: new THREE.BoxGeometry(0.42, 0.8, 0.3),
  head: new THREE.SphereGeometry(0.17, 10, 8),
  suitcase: new THREE.BoxGeometry(0.26, 0.5, 0.4),
  handle: new THREE.BoxGeometry(0.04, 0.32, 0.04),
  aura: new THREE.RingGeometry(0.55, 0.95, 24),
  disc: new THREE.CircleGeometry(0.32, 16),
  shadow: new THREE.CircleGeometry(0.3, 14),
};
const M = {
  head: new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.7 }),
  suitcase: new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.45, metalness: 0.15 }),
  handle: new THREE.MeshStandardMaterial({ color: 0x9e9e9e, metalness: 0.6, roughness: 0.3 }),
  familyDisc: new THREE.MeshBasicMaterial({ color: 0xe8b84a, transparent: true, opacity: 0.28, depthWrite: false }),
  shadow: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }),
};

function angleLerp(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

/**
 * Visual for one crowd agent. Reads interpolated physics state and adds
 * squash/stretch on bumps, compression squish, lean into velocity, walk bob,
 * angry wind-up glow and hit flashes.
 */
export class Passenger {
  readonly agent: Agent;
  readonly mesh = new THREE.Group();
  /** Extra objects living in world space (suitcase). */
  readonly extras: THREE.Object3D[] = [];
  private lean = new THREE.Group();
  private rig = new THREE.Group();
  private bodyMat: THREE.MeshStandardMaterial;
  private aura: THREE.Mesh | null = null;
  private auraMat: THREE.MeshBasicMaterial | null = null;
  private suitcase: THREE.Group | null = null;
  private squash = 0;
  private squashV = 0;
  private flash = 0;
  private bob = Math.random() * 10;
  private yaw: number;
  private baseColor: THREE.Color;

  constructor(agent: Agent) {
    this.agent = agent;
    const def = PASSENGER_DEFS[agent.kind];
    this.baseColor = new THREE.Color(def.color);
    this.bodyMat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.65, metalness: 0.05 });
    const body = new THREE.Mesh(G.body, this.bodyMat);
    body.scale.x = def.widthMul ?? 1;
    body.position.y = 0.5;
    body.castShadow = true;
    const head = new THREE.Mesh(G.head, M.head);
    head.position.y = 1.08;
    head.castShadow = true;
    this.rig.add(body, head);
    this.lean.add(this.rig);
    this.mesh.add(this.lean);
    this.mesh.scale.setScalar(agent.scale);

    const shadow = new THREE.Mesh(G.shadow, M.shadow);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.012;
    this.mesh.add(shadow);

    if (agent.kind === 'stench') {
      this.auraMat = new THREE.MeshBasicMaterial({
        color: 0x8bc34a,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      this.aura = new THREE.Mesh(G.aura, this.auraMat);
      this.aura.rotation.x = -Math.PI / 2;
      this.aura.position.y = 0.04;
      this.mesh.add(this.aura);
    }
    if (agent.kind === 'family') {
      const disc = new THREE.Mesh(G.disc, M.familyDisc);
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = 0.02;
      this.mesh.add(disc);
    }
    if (agent.caseBody) {
      this.suitcase = new THREE.Group();
      const c = new THREE.Mesh(G.suitcase, M.suitcase);
      c.position.y = 0.3;
      c.castShadow = true;
      const h = new THREE.Mesh(G.handle, M.handle);
      h.position.y = 0.7;
      this.suitcase.add(c, h);
      this.extras.push(this.suitcase);
    }
    // Boarders walk in (+Z); riders face random-ish.
    this.yaw = agent.mode === 'boarder' ? 0 : Math.random() * Math.PI * 2;
    this.update(1, 0, 0);
  }

  update(alpha: number, dt: number, time: number): void {
    const a = this.agent;
    const b = a.body;
    const x = b.px + (b.x - b.px) * alpha;
    const z = b.pz + (b.z - b.pz) * alpha;
    const speed = Math.hypot(b.vx, b.vz);

    // Bump → squash spring kick.
    if (a.bumpAcc > 0) {
      this.squashV += a.bumpAcc * 4;
      this.flash = Math.max(this.flash, a.bumpAcc * 0.6);
      a.bumpAcc = 0;
    }
    this.squashV += (-240 * this.squash - 15 * this.squashV) * dt;
    this.squash = Math.max(-0.3, Math.min(0.35, this.squash + this.squashV * dt));
    const squeeze = Math.min(0.16, b.pressure * 0.9);
    const sy = (1 - this.squash) * (1 - squeeze);
    const sxz = (1 + this.squash * 0.5) * (1 + squeeze * 0.8);
    this.rig.scale.set(sxz, sy, sxz);

    // Walk bob (brats hop).
    const hop = a.kind === 'brat' ? 0.09 : 0.035;
    this.bob += dt * (4 + speed * 7);
    const bobY = Math.abs(Math.sin(this.bob)) * hop * Math.min(1, speed * 1.5 + 0.15);
    this.mesh.position.set(x, bobY, z);

    // Face movement, lean into velocity.
    if (speed > 0.25) this.yaw = angleLerp(this.yaw, Math.atan2(b.vx, b.vz), 1 - Math.exp(-6 * dt));
    this.rig.rotation.y = this.yaw;
    const lx = Math.max(-0.28, Math.min(0.28, b.vz * 0.09));
    const lz = Math.max(-0.28, Math.min(0.28, -b.vx * 0.09));
    this.lean.rotation.x += (lx - this.lean.rotation.x) * Math.min(1, dt * 10);
    this.lean.rotation.z += (lz - this.lean.rotation.z) * Math.min(1, dt * 10);

    // Angry wind-up: swell + red glow; otherwise decay hit flash.
    this.flash = Math.max(0, this.flash - dt * 3);
    if (a.windup >= 0) {
      const p = 1 - a.windup / TUNING.types.angry.windup;
      this.rig.scale.multiplyScalar(1 + p * 0.18);
      this.bodyMat.emissive.setRGB(1, 0.1 * (1 - p), 0);
      this.bodyMat.emissiveIntensity = 0.4 + p * 1.2;
    } else if (this.flash > 0.01) {
      this.bodyMat.emissive.setRGB(1, 1, 1);
      this.bodyMat.emissiveIntensity = this.flash;
    } else {
      this.bodyMat.emissiveIntensity = 0;
    }
    if (a.kind === 'angry' && a.windup < 0) {
      // Simmering: subtle pulse so the type reads at a glance.
      this.bodyMat.color.copy(this.baseColor).multiplyScalar(0.85 + 0.15 * Math.sin(time * 6 + a.id));
    }

    if (this.aura && this.auraMat) {
      const s = 1 + Math.sin(time * 3 + a.id) * 0.1;
      this.aura.scale.setScalar(s);
      this.auraMat.opacity = 0.18 + 0.1 * Math.sin(time * 2.3 + a.id);
    }

    if (this.suitcase && a.caseBody) {
      const c = a.caseBody;
      const cx = c.px + (c.x - c.px) * alpha;
      const cz = c.pz + (c.z - c.pz) * alpha;
      this.suitcase.position.set(cx, 0, cz);
      this.suitcase.rotation.y = Math.atan2(cx - x, cz - z);
      this.suitcase.rotation.z = Math.max(-0.2, Math.min(0.2, -c.vx * 0.1));
    }
  }

  dispose(): void {
    this.bodyMat.dispose();
    this.auraMat?.dispose();
  }
}
