import * as THREE from 'three';
import type { PlayerSim } from './sim/PlayerSim';
import { TUNING } from './sim/tuning';

/**
 * Player visual. Physics/state live in sim/PlayerSim; this reads it each frame
 * and adds squash/stretch, lean, a stamina/charge ring and ult tints.
 */
export class Player {
  readonly mesh = new THREE.Group();
  private lean = new THREE.Group();
  private rig = new THREE.Group();
  private bodyMat: THREE.MeshStandardMaterial;
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
    this.bodyMat = new THREE.MeshStandardMaterial({ color: 0x2196f3, roughness: 0.5 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.5, 4, 10), this.bodyMat);
    body.position.y = 0.66;
    body.castShadow = true;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xf1c27d }),
    );
    head.position.y = 1.2;
    head.castShadow = true;
    // Little backpack so facing reads.
    const pack = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.34, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x0d47a1, roughness: 0.6 }),
    );
    pack.position.set(0, 0.72, -0.27);
    this.rig.add(body, head, pack);
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

    const tgtYaw = Math.atan2(p.faceX, p.faceZ);
    let d = tgtYaw - this.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.yaw += d * (1 - Math.exp(-12 * dt));
    this.rig.rotation.y = this.yaw;
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
    } else if (p.isDashing(now)) {
      this.bodyMat.emissive.setRGB(0.2, 0.9, 1);
      this.bodyMat.emissiveIntensity = 0.8;
    } else if (p.winded) {
      this.bodyMat.emissive.setRGB(0.4, 0, 0);
      this.bodyMat.emissiveIntensity = 0.25 + Math.sin(time * 6) * 0.15;
    } else {
      this.bodyMat.emissiveIntensity = 0;
    }

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
