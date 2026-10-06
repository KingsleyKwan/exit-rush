import * as THREE from 'three';
import type { PlayerSim } from './sim/PlayerSim';
import { TUNING } from './sim/tuning';
import { heroGeometry, heroShellGeometry } from './characters';

/**
 * Player visual (v0.3 chibi hero: blue shirt, lanyard, cyan glow outline).
 * Physics/state live in sim/PlayerSim; this reads it each frame and adds
 * squash/stretch, lean, waddle, a stamina/charge ring and ult tints. A see-through
 * silhouette (drawn only where the crowd hides the hero) keeps the player findable.
 */
export class Player {
  readonly mesh = new THREE.Group();
  private lean = new THREE.Group();
  private rig = new THREE.Group();
  private bodyMat: THREE.MeshLambertMaterial;
  private glowMat: THREE.MeshBasicMaterial;
  private xrayMat: THREE.MeshBasicMaterial;
  private ring: THREE.Mesh;
  private ringMat: THREE.MeshBasicMaterial;
  private aim: THREE.Mesh;
  private aimMat: THREE.MeshBasicMaterial;
  private squash = 0;
  private squashV = 0;
  private bob = 0;
  private yaw = Math.PI;
  private lastImpact = 0;

  constructor() {
    this.bodyMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const body = new THREE.Mesh(heroGeometry(), this.bodyMat);
    body.castShadow = true;
    body.renderOrder = 2;
    // Rim glow: inflated back-face shell.
    this.glowMat = new THREE.MeshBasicMaterial({ color: 0x5ad2ff, side: THREE.BackSide, transparent: true, opacity: 0.95 });
    const glow = new THREE.Mesh(heroShellGeometry(), this.glowMat);
    glow.renderOrder = 2;
    // X-ray silhouette: drawn in the opaque pass after the crowd (renderOrder 1)
    // but before the hero body (2), with GreaterDepth — so it only lights up
    // where passengers stand in front of the hero, never over the hero itself.
    const xr = new THREE.CapsuleGeometry(0.24, 0.62, 3, 10);
    xr.translate(0, 0.62, 0);
    this.xrayMat = new THREE.MeshBasicMaterial({
      color: 0x5ad2ff,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthFunc: THREE.GreaterDepth,
    });
    const xray = new THREE.Mesh(xr, this.xrayMat);
    xray.renderOrder = 1;
    this.rig.add(body, glow, xray);
    this.lean.add(this.rig);
    this.mesh.add(this.lean);

    this.ringMat = new THREE.MeshBasicMaterial({ color: 0x4fc3f7, side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthWrite: false });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.44, 32), this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.03;
    this.mesh.add(this.ring);

    // Direction chevron on the floor (shows assisted aim).
    const tri = new THREE.Shape();
    tri.moveTo(0, 0.22);
    tri.lineTo(0.12, 0);
    tri.lineTo(-0.12, 0);
    tri.closePath();
    this.aimMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    this.aim = new THREE.Mesh(new THREE.ShapeGeometry(tri), this.aimMat);
    this.aim.rotation.x = -Math.PI / 2;
    this.aim.position.y = 0.035;
    this.mesh.add(this.aim);
  }

  /** Kick squash externally (e.g. angry hit). */
  punch(amount: number): void {
    this.squashV += amount;
  }

  update(p: PlayerSim, alpha: number, dt: number, now: number, time: number): void {
    const b = p.body;
    const x = b.px + (b.x - b.px) * alpha;
    const z = b.pz + (b.z - b.pz) * alpha;
    const speed = Math.hypot(b.vx, b.vz);

    if (b.impact > this.lastImpact + 0.4) this.squashV += Math.min(3, b.impact * 1.2);
    this.lastImpact = b.impact;
    this.squashV += (-260 * this.squash - 16 * this.squashV) * dt;
    this.squash = Math.max(-0.3, Math.min(0.32, this.squash + this.squashV * dt));
    const squeeze = Math.min(0.14, b.pressure * 0.8);
    const charge = p.shoveCharge;
    // Wind up for a shove: crouch + widen.
    const sy = (1 - this.squash) * (1 - squeeze) * (1 - charge * 0.12);
    const sxz = (1 + this.squash * 0.5) * (1 + squeeze * 0.7) * (1 + charge * 0.1);
    this.rig.scale.set(sxz, sy, sxz);

    this.bob += dt * (4 + speed * 6);
    const bobY = Math.abs(Math.sin(this.bob)) * 0.04 * Math.min(1, speed);
    let wob = 0;
    if (p.stunT > 0) wob = Math.sin(time * 40) * 0.12 * (p.stunT / TUNING.player.stunTime);
    this.mesh.position.set(x, bobY, z);
    // Tier 3 Hurdle hop / Leap arc (body only; ring stays on the floor).
    this.lean.position.y = p.airHeight(now);

    const tgtYaw = Math.atan2(p.faceX, p.faceZ);
    let d = tgtYaw - this.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.yaw += d * (1 - Math.exp(-12 * dt));
    const waddle = Math.sin(this.bob) * 0.08 * Math.min(1, speed);
    this.rig.rotation.set(0, this.yaw, waddle);
    const lx = Math.max(-0.3, Math.min(0.3, b.vz * 0.08 + (p.pushing ? p.faceZ * 0.12 : 0)));
    const lz = Math.max(-0.3, Math.min(0.3, -b.vx * 0.08 - (p.pushing ? p.faceX * 0.12 : 0) + wob));
    this.lean.rotation.x += (lx - this.lean.rotation.x) * Math.min(1, dt * 12);
    this.lean.rotation.z += (lz - this.lean.rotation.z) * Math.min(1, dt * 12);

    // Ring: stamina colour, shove charge growth, cooldown dim.
    const st = p.stamina / p.staminaMax;
    const c = this.ringMat.color;
    if (p.winded) c.setRGB(0.9, 0.2, 0.2);
    else if (charge > 0) c.setRGB(1, 0.6 - charge * 0.3, 0.1);
    else if (p.isSensing(now)) c.setRGB(0.3, 1, 0.85);
    else c.setRGB(0.3 + (1 - st) * 0.6, 0.76 * st + 0.2, 0.97 * st);
    this.ring.scale.setScalar(1 + charge * 0.6 + (p.isSensing(now) ? Math.sin(time * 8) * 0.08 : 0));
    this.ringMat.opacity = p.shoveCd > 0 ? 0.45 : 0.9;

    // Ult tints.
    if (p.isCharging(now)) {
      this.bodyMat.emissive.setRGB(1, 0.45, 0.05);
      this.bodyMat.emissiveIntensity = 0.6 + Math.sin(time * 20) * 0.25;
    } else if (p.isDashing(now) || p.isLeaping(now)) {
      this.bodyMat.emissive.setRGB(0.2, 0.9, 1);
      this.bodyMat.emissiveIntensity = 0.8;
    } else if (p.winded) {
      this.bodyMat.emissive.setRGB(0.4, 0, 0);
      this.bodyMat.emissiveIntensity = 0.25 + Math.sin(time * 6) * 0.15;
    } else {
      this.bodyMat.emissiveIntensity = 0;
    }
    // Glow: breathes gently; matches ult / winded state.
    const g = this.glowMat.color;
    if (p.isCharging(now)) g.setRGB(1, 0.6, 0.15);
    else if (p.isDashing(now)) g.setRGB(0.4, 1, 1);
    else if (p.winded) g.setRGB(1, 0.3, 0.3);
    else g.setRGB(0.35, 0.82, 1);
    this.glowMat.opacity = 0.75 + 0.25 * Math.sin(time * 4);
    this.xrayMat.color.copy(g);

    // Aim chevron in front of the player while steering.
    const show = p.moving > 0.15 ? 0.55 : 0;
    this.aimMat.opacity += (show - this.aimMat.opacity) * Math.min(1, dt * 10);
    this.aim.position.set(p.aimX * 0.62, 0.035, p.aimZ * 0.62);
    this.aim.rotation.z = Math.atan2(-p.aimX, -p.aimZ);
  }

  /** Simple pose for menus (no sim). */
  idle(x: number, z: number): void {
    this.mesh.position.set(x, 0, z);
  }
}
