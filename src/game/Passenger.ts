import * as THREE from 'three';
import { TUNING } from './sim/tuning';
import type { Agent } from './sim/CrowdSim';
import { lookFor, type Look } from './characters';
import { bossTagTexture, shoutBubbleTexture } from './badges';
import { BOSSES } from './bosses';

/** Shared geometry / materials for the per-agent floor decals (never disposed per passenger). */
export const G = {
  aura: new THREE.RingGeometry(0.55, 0.95, 24),
  disc: new THREE.CircleGeometry(0.32, 16),
  shadow: new THREE.CircleGeometry(0.3, 14),
  loudFill: new THREE.CircleGeometry(TUNING.types.loud.radius, 40),
  loudRim: new THREE.RingGeometry(TUNING.types.loud.radius - 0.06, TUNING.types.loud.radius, 48),
  loudWave: new THREE.RingGeometry(0.88, 1, 40),
  bossRing: new THREE.RingGeometry(0.36, 0.44, 40),
  crownBand: new THREE.CylinderGeometry(0.15, 0.13, 0.08, 14, 1, true),
  crownSpike: new THREE.ConeGeometry(0.035, 0.1, 6),
  crownGem: new THREE.OctahedronGeometry(0.028, 0),
};
export const M = {
  familyDisc: new THREE.MeshBasicMaterial({ color: 0xf08a3c, transparent: true, opacity: 0.22, depthWrite: false }),
  shadow: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.24, depthWrite: false }),
  loudFill: new THREE.MeshBasicMaterial({ color: 0xff9f1a, transparent: true, opacity: 0.1, depthWrite: false }),
  crown: new THREE.MeshLambertMaterial({ color: 0xffc928, emissive: 0x6b4a00, side: THREE.DoubleSide }),
  gem: new THREE.MeshBasicMaterial({ color: 0xe53935 }),
  barBg: new THREE.SpriteMaterial({ color: 0x0d0a06, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false }),
  barFrame: new THREE.SpriteMaterial({ color: 0xffcc33, depthTest: false, depthWrite: false }),
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
  /** v0.7 cutscene: when set, the figure turns to this yaw (boss poses for the camera). */
  faceYaw: number | null = null;
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
  /** v0.7 boss: crown, name tag, stubbornness bar, gold floor ring. */
  private boss: {
    crown: THREE.Group;
    ring: THREE.Mesh;
    ringMat: THREE.MeshBasicMaterial;
    tag: THREE.Sprite;
    frame: THREE.Sprite;
    barBg: THREE.Sprite;
    bar: THREE.Sprite;
    barMat: THREE.SpriteMaterial;
    tint: [number, number, number];
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
    if (agent.boss) this.buildBoss();
    // Boarders walk in (+Z); riders face random-ish.
    this.yaw = agent.seatYaw ?? (agent.mode === 'boarder' ? 0 : Math.random() * Math.PI * 2);
    if (agent.seatYaw !== null) this.faceYaw = agent.seatYaw;
    this.update(1, 0, 0);
  }

  private buildBoss(): void {
    const a = this.agent;
    const def = BOSSES[a.boss!.kind];
    const crouch = a.kind === 'squat';
    const kid = a.kind === 'brat';
    // Crown sits on the head (follows squash / yaw as a child of the body rig).
    const crown = new THREE.Group();
    const band = new THREE.Mesh(G.crownBand, M.crown);
    crown.add(band);
    for (let k = 0; k < 5; k++) {
      const ang = (k / 5) * Math.PI * 2;
      const sp = new THREE.Mesh(G.crownSpike, M.crown);
      sp.position.set(Math.sin(ang) * 0.13, 0.08, Math.cos(ang) * 0.13);
      crown.add(sp);
    }
    const gem = new THREE.Mesh(G.crownGem, M.gem);
    gem.position.set(0, 0.0, 0.15);
    crown.add(gem);
    const headTop = (crouch ? 0.72 : 0.99) + (kid ? 0.014 : 0) + 0.215 * (kid ? 1.12 : 1) * 0.9;
    // Sun hat (luggage) / cap (brat): perch the crown on top of the headwear.
    const hatLift = a.kind === 'luggage' ? 0.13 : kid ? 0.06 : 0;
    crown.position.set(0, headTop + 0.02 + hatLift, -0.01);
    crown.rotation.z = 0.12;
    this.rig.add(crown);
    // Gold floor ring.
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffc928, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(G.bossRing, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    ring.renderOrder = 3;
    this.mesh.add(ring);
    // Name tag + stubbornness bar (constant world size: undo the body scale).
    const inv = 1 / a.scale;
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: bossTagTexture(def.zh, def.en, def.accent), transparent: true, depthTest: false, depthWrite: false }));
    tag.scale.set(1.45 * inv, 1.45 * (168 / 512) * inv, 1);
    tag.renderOrder = 8;
    // Bar just above the crown, tag above the bar (local units; sprite sizes are world-constant).
    const barY = headTop + hatLift + 0.2 + 0.16 * inv; // clear of the crown spikes (sprites draw over it)
    tag.position.set(0, barY + 0.16 * inv + 0.12 * inv * 1.45, 0);
    this.mesh.add(tag);
    const frame = new THREE.Sprite(M.barFrame);
    frame.scale.set(1.21 * inv, 0.19 * inv, 1);
    frame.position.set(0, barY, 0);
    frame.renderOrder = 8;
    this.mesh.add(frame);
    const barBg = new THREE.Sprite(M.barBg);
    barBg.scale.set(1.15 * inv, 0.13 * inv, 1);
    barBg.renderOrder = 9;
    barBg.position.set(0, barY, 0);
    this.mesh.add(barBg);
    const barMat = new THREE.SpriteMaterial({ color: 0xff7043, depthTest: false, depthWrite: false });
    const bar = new THREE.Sprite(barMat);
    bar.position.copy(barBg.position);
    bar.renderOrder = 10;
    this.mesh.add(bar);
    this.boss = { crown, ring, ringMat, tag, frame, barBg, bar, barMat, tint: def.tint };
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
    // Collision stays in the aisle (the bench box rejects a body on the cushion).
    // Shift the drawing back so the hips land on the pad and the knees stay forward.
    const seated = a.seated && a.seatYaw !== null;
    const backX = seated ? (a.seatYaw! > 0 ? -1 : 1) : 0;
    const seatShift = 0.52;
    const seatY = seated ? 0.4 - 0.3 * a.scale : bobY;
    this.mesh.position.set(x + backX * seatShift, seatY, z);
    if (seated) {
      const s = a.scale || 1;
      this.shadowAnchor.position.set((-backX * seatShift) / s, (0.012 - seatY) / s, 0);
    } else {
      this.shadowAnchor.position.set(0, 0.012, 0);
    }
    const waddle = seated ? 0 : Math.sin(this.bob) * (a.isKid ? 0.12 : 0.07) * Math.min(1, speed * 1.2);

    // Face movement, lean into velocity.
    if (this.faceYaw !== null) this.yaw = angleLerp(this.yaw, this.faceYaw, 1 - Math.exp(-10 * dt));
    else if (speed > 0.25) this.yaw = angleLerp(this.yaw, Math.atan2(b.vx, b.vz), 1 - Math.exp(-6 * dt));
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
      if (a.freezeUntil > this.agentTime(time)) {
        // Frozen: icy cyan tint so freeze reads from iso cam.
        const pulse = 0.85 + 0.15 * Math.sin(time * 8 + a.id);
        this.tint.setRGB(0.35 * pulse, 0.55 * pulse, 1.35 * pulse);
      } else if (a.chillUntil > this.agentTime(time)) {
        this.tint.setRGB(0.55, 0.7, 1.2);
      } else if (this.flash > 0.01) {
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

    if (this.boss && a.boss) {
      const B = this.boss;
      const st = a.boss;
      const yielding = st.yieldUntil > 0 && this.agentTime(time) < st.yieldUntil;
      const t = B.tint;
      const k = yielding ? 0.82 : 1;
      this.tint.setRGB(this.tint.r * t[0] * k, this.tint.g * t[1] * k, this.tint.b * t[2] * k);
      // Stubbornness bar: full = immovable (red-orange) … empty = yields (green flash).
      const inv = 1 / a.scale;
      const w = 1.09 * inv;
      const f = Math.max(0.001, st.stub);
      B.bar.visible = this.hudOn && (st.stub > 0.01 || yielding);
      const shown = yielding ? 1 : f;
      B.bar.scale.set(w * shown, 0.085 * inv, 1);
      B.bar.center.set(0.5 / shown, 0.5);
      if (yielding) B.barMat.color.setRGB(0.45 + 0.3 * Math.sin(time * 14), 0.9, 0.5);
      else B.barMat.color.setRGB(1, 0.22 + 0.4 * (1 - f), 0.08);
      B.ringMat.opacity = yielding ? 0.25 : 0.55 + 0.25 * Math.sin(time * 4 + a.id);
      B.crown.rotation.z = yielding ? 0.5 + Math.sin(time * 10) * 0.15 : 0.12 + Math.sin(time * 2.2) * 0.04;
    }

    if (this.caseAnchor && a.caseBody) {
      const c = a.caseBody;
      const cx = c.px + (c.x - c.px) * alpha;
      const cz = c.pz + (c.z - c.pz) * alpha;
      this.caseAnchor.position.set(cx, 0, cz);
      this.caseAnchor.rotation.set(0, Math.atan2(cx - x, cz - z), Math.max(-0.2, Math.min(0.2, -c.vx * 0.1)));
      // Boss suitcase: scaled up to its (giant) collider.
      if (a.boss) this.caseAnchor.scale.setScalar(c.r / TUNING.types.luggage.caseRadius);
      this.caseAnchor.updateMatrix();
    }
  }

  /** L100: tag + bar only on the nearest king (all eight would bury the car). */
  setTagVisible(on: boolean): void {
    this.hudOn = on;
    if (!this.boss) return;
    this.boss.tag.visible = on;
    this.boss.frame.visible = on;
    this.boss.barBg.visible = on;
  }
  private hudOn = true;

  /** Boss yield timing is in sim time; the view gets it from the crowd each frame. */
  simTime = 0;
  private agentTime(_t: number): number {
    return this.simTime;
  }

  dispose(): void {
    this.auraMat?.dispose();
    if (this.boss) {
      this.boss.ringMat.dispose();
      this.boss.barMat.dispose();
      (this.boss.tag.material as THREE.SpriteMaterial).dispose();
    }
    if (this.loud) {
      this.loud.rimMat.dispose();
      for (const w of this.loud.waves) w.mat.dispose();
      this.loud.bubbleMat.dispose();
    }
  }
}
