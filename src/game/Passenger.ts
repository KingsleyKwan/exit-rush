import * as THREE from 'three';
import { TUNING } from './sim/tuning';
import type { Agent } from './sim/CrowdSim';
import { lookFor, type Look } from './characters';
import { shoutBubbleTexture } from './badges';

/** Shared geometry / materials for the per-agent floor decals (never disposed per passenger). */
export const G = {
  aura: new THREE.RingGeometry(0.55, 0.95, 24),
  disc: new THREE.CircleGeometry(0.32, 16),
  shadow: new THREE.CircleGeometry(0.3, 14),
  loudFill: new THREE.CircleGeometry(TUNING.types.loud.radius, 40),
  loudRim: new THREE.RingGeometry(TUNING.types.loud.radius - 0.06, TUNING.types.loud.radius, 48),
  loudWave: new THREE.RingGeometry(0.88, 1, 40),
};
export const M = {
  familyDisc: new THREE.MeshBasicMaterial({ color: 0xf08a3c, transparent: true, opacity: 0.22, depthWrite: false }),
  shadow: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.24, depthWrite: false }),
  loudFill: new THREE.MeshBasicMaterial({ color: 0xff9f1a, transparent: true, opacity: 0.1, depthWrite: false }),
};

function angleLerp(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

/**
 * Transform + tint state for one crowd agent. The body itself is drawn by Crowd
 * as an instance of the agent's look (see characters.ts); this class owns only
 * anchors: squash/stretch on bumps, compression squish, lean into velocity,
 * walk bob + waddle, angry wind-up swell/redden and hit flashes (instance tint).
 */
export class Passenger {
  readonly agent: Agent;
  readonly look: Look;
  /** World position + bob (added to the crowd group; carries floor decals). */
  readonly mesh = new THREE.Group();
  /** Body instance transform (yaw, squash, waddle). */
  readonly rig = new THREE.Object3D();
  readonly shadowAnchor = new THREE.Object3D();
  /** Suitcase transform (world space), luggage only. */
  readonly caseAnchor: THREE.Object3D | null = null;
  /** Instance tint (multiplies vertex colours; >1 brightens for hit flash). */
  readonly tint = new THREE.Color(1, 1, 1);
  /** 0–1 angry wind-up progress (for the floating icon / steam). */
  windupP = 0;
  private lean = new THREE.Object3D();
  private aura: THREE.Mesh | null = null;
  private auraMat: THREE.MeshBasicMaterial | null = null;
  /** 大聲公: noise-zone rim, expanding sound-wave rings and the 「喂！！」 bubble. */
  private loud: {
    rim: THREE.Mesh;
    rimMat: THREE.MeshBasicMaterial;
    waves: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }[];
    bubble: THREE.Sprite;
    bubbleMat: THREE.SpriteMaterial;
  } | null = null;
  private squash = 0;
  private squashV = 0;
  private flash = 0;
  private bob = Math.random() * 10;
  private yaw: number;

  constructor(agent: Agent) {
    this.agent = agent;
    this.look = lookFor(agent);
    this.lean.add(this.rig);
    this.mesh.add(this.lean);
    this.mesh.scale.setScalar(agent.scale);

    this.shadowAnchor.rotation.x = -Math.PI / 2;
    this.shadowAnchor.position.y = 0.012;
    this.mesh.add(this.shadowAnchor);

    if (agent.kind === 'stench') {
      this.auraMat = new THREE.MeshBasicMaterial({
        color: 0x8bc34a,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      this.aura = new THREE.Mesh(G.aura, this.auraMat);
      this.aura.rotation.x = -Math.PI / 2;
      this.aura.position.y = 0.04;
      this.mesh.add(this.aura);
    }
    if (agent.kind === 'loud') {
      const flat = (m: THREE.Object3D, y: number) => {
        m.rotation.x = -Math.PI / 2;
        m.position.y = y;
        m.renderOrder = 2;
        this.mesh.add(m);
      };
      flat(new THREE.Mesh(G.loudFill, M.loudFill), 0.03);
      const rimMat = new THREE.MeshBasicMaterial({ color: 0xff8f00, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
      const rim = new THREE.Mesh(G.loudRim, rimMat);
      flat(rim, 0.035);
      const waves = [0, 1, 2].map(() => {
        const mat = new THREE.MeshBasicMaterial({ color: 0xffb74d, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(G.loudWave, mat);
        flat(mesh, 0.045);
        return { mesh, mat };
      });
      const bubbleMat = new THREE.SpriteMaterial({ map: shoutBubbleTexture(), transparent: true, depthWrite: false, depthTest: false });
      const bubble = new THREE.Sprite(bubbleMat);
      bubble.center.set(0.3, 0);
      bubble.renderOrder = 7;
      this.mesh.add(bubble);
      this.loud = { rim, rimMat, waves, bubble, bubbleMat };
    }
    if (agent.kind === 'family' && !agent.isKid) {
      const disc = new THREE.Mesh(G.disc, M.familyDisc);
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = 0.02;
      this.mesh.add(disc);
    }
    if (agent.caseBody) this.caseAnchor = new THREE.Object3D();
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

    // Walk bob + chibi waddle (brats hop, kids toddle).
    const brat = a.kind === 'brat';
    const hop = brat ? 0.12 : a.isKid ? 0.05 : 0.035;
    this.bob += dt * (brat ? 7 + speed * 6 : 4 + speed * 7);
    const moving = Math.min(1, speed * 1.5 + (brat ? 0.6 : 0.15));
    const bobY = Math.abs(Math.sin(this.bob)) * hop * moving;
    this.mesh.position.set(x, bobY, z);
    const waddle = Math.sin(this.bob) * (a.isKid ? 0.12 : 0.07) * Math.min(1, speed * 1.2);

    // Face movement, lean into velocity.
    if (speed > 0.25) this.yaw = angleLerp(this.yaw, Math.atan2(b.vx, b.vz), 1 - Math.exp(-6 * dt));
    this.rig.rotation.set(0, this.yaw, waddle);
    const lx = Math.max(-0.28, Math.min(0.28, b.vz * 0.09));
    const lz = Math.max(-0.28, Math.min(0.28, -b.vx * 0.09));
    this.lean.rotation.x += (lx - this.lean.rotation.x) * Math.min(1, dt * 10);
    this.lean.rotation.z += (lz - this.lean.rotation.z) * Math.min(1, dt * 10);

    // Angry wind-up: swell + red tint; otherwise decay hit flash.
    this.flash = Math.max(0, this.flash - dt * 3);
    if (a.windup >= 0) {
      const p = 1 - a.windup / TUNING.types.angry.windup;
      this.windupP = p;
      this.rig.scale.multiplyScalar(1 + p * 0.18);
      const k = 1 + p * 0.5 + Math.sin(time * 30) * 0.1 * p;
      this.tint.setRGB(k * (1 + p * 0.5), k * (1 - p * 0.5), k * (1 - p * 0.55));
    } else {
      this.windupP = 0;
      if (this.flash > 0.01) {
        const k = 1 + this.flash * 1.6;
        this.tint.setRGB(k, k, k);
      } else if (a.kind === 'angry') {
        // Simmering: subtle pulse so the type reads at a glance.
        const k = 0.9 + 0.1 * Math.sin(time * 6 + a.id);
        this.tint.setRGB(k * 1.06, k, k);
      } else {
        this.tint.setRGB(1, 1, 1);
      }
    }

    if (this.aura && this.auraMat) {
      const s = 1 + Math.sin(time * 3 + a.id) * 0.1;
      this.aura.scale.setScalar(s);
      this.auraMat.opacity = 0.14 + 0.08 * Math.sin(time * 2.3 + a.id);
    }

    if (this.loud) {
      const R = TUNING.types.loud.radius;
      const L = this.loud;
      L.rimMat.opacity = 0.42 + 0.18 * Math.sin(time * 5 + a.id);
      // Sound waves: three rings expanding from the speaker to the zone rim.
      L.waves.forEach((w, k) => {
        const ph = (time * 0.85 + k / 3 + a.id * 0.21) % 1;
        w.mesh.scale.setScalar(0.25 * R + ph * 0.75 * R);
        w.mat.opacity = 0.55 * (1 - ph) * Math.min(1, ph * 6);
      });
      // 「喂！！」 pops in bursts (talking), above the floating type badge.
      const talk = (time * 0.7 + a.id * 0.37) % 1;
      const on = talk < 0.62;
      L.bubble.visible = on;
      if (on) {
        const pop = Math.min(1, talk * 12);
        const s = (0.5 + 0.08 * Math.sin(time * 14)) * (0.6 + 0.4 * pop);
        L.bubble.scale.set(s, s * (168 / 256), 1);
        L.bubble.position.set(0, 1.86, 0);
      }
    }

    if (this.caseAnchor && a.caseBody) {
      const c = a.caseBody;
      const cx = c.px + (c.x - c.px) * alpha;
      const cz = c.pz + (c.z - c.pz) * alpha;
      this.caseAnchor.position.set(cx, 0, cz);
      this.caseAnchor.rotation.set(0, Math.atan2(cx - x, cz - z), Math.max(-0.2, Math.min(0.2, -c.vx * 0.1)));
      this.caseAnchor.updateMatrix();
    }
  }

  dispose(): void {
    this.auraMat?.dispose();
    if (this.loud) {
      this.loud.rimMat.dispose();
      for (const w of this.loud.waves) w.mat.dispose();
      this.loud.bubbleMat.dispose();
    }
  }
}
