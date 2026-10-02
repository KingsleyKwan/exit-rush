import * as THREE from 'three';
import type { SkillModifiers } from './SkillTree';
import { PLAYER_START } from './TrainScene';

export class Player {
  readonly mesh: THREE.Group;
  position = PLAYER_START.clone();
  velocity = new THREE.Vector3();
  stamina: number;
  staminaMax: number;
  chargeUntil = 0;
  dashUntil = 0;
  senseUntil = 0;
  private bob = 0;

  constructor() {
    this.mesh = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 0.55, 4, 10),
      new THREE.MeshStandardMaterial({ color: 0x2196f3, roughness: 0.5 }),
    );
    body.position.y = 0.7;
    body.castShadow = true;
    this.mesh.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xf1c27d }),
    );
    head.position.y = 1.25;
    this.mesh.add(head);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.45, 24),
      new THREE.MeshBasicMaterial({ color: 0x4fc3f7, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    this.mesh.add(ring);

    this.staminaMax = 100;
    this.stamina = 100;
    this.sync();
  }

  reset(mods: SkillModifiers): void {
    this.position.copy(PLAYER_START);
    this.velocity.set(0, 0, 0);
    this.staminaMax = mods.staminaMax;
    this.stamina = this.staminaMax;
    this.chargeUntil = 0;
    this.dashUntil = 0;
    this.senseUntil = 0;
    this.sync();
  }

  sync(): void {
    this.mesh.position.set(this.position.x, 0, this.position.z);
  }

  activateUltimate(kind: 'str' | 'spd' | 'wis', now: number): boolean {
    if (kind === 'str') {
      this.chargeUntil = now + 2.2;
      return true;
    }
    if (kind === 'spd') {
      this.dashUntil = now + 1.1;
      return true;
    }
    if (kind === 'wis') {
      this.senseUntil = now + 3.5;
      return true;
    }
    return false;
  }

  update(
    dt: number,
    now: number,
    intentX: number,
    intentZ: number,
    magnitude: number,
    mods: SkillModifiers,
    crowdBlock: number,
    crowdSlow: number,
    doorZ: number,
  ): { pushing: boolean } {
    const charging = now < this.chargeUntil;
    const dashing = now < this.dashUntil;
    const sensing = now < this.senseUntil;

    let speed = 2.4 * mods.moveSpeed * (1 - crowdSlow);
    let pushMul = mods.pushForce;
    if (charging) {
      speed *= 1.8;
      pushMul *= 2.5;
      crowdBlock *= 0.15;
    }
    if (dashing) {
      speed *= 2.6;
      crowdBlock *= 0.35;
    }
    if (sensing) {
      crowdBlock *= 1 - mods.gapSense * 0.5;
      intentZ = Math.max(intentZ, 0.35);
      magnitude = Math.max(magnitude, 0.35);
    }

    const pushing = magnitude > 0.12;
    // Swipe up → intentZ > 0 → move toward door (−Z)
    const dir = new THREE.Vector3(intentX, 0, -Math.max(0.2, intentZ));
    if (dir.lengthSq() > 0) dir.normalize();

    const effectiveBlock = Math.max(0, crowdBlock * (1 - mods.resist * 0.5));
    const drain = pushing ? (8 + effectiveBlock * 6) * dt : 0;
    if (pushing && this.stamina > 0) {
      this.stamina = Math.max(0, this.stamina - drain);
      const staminaFactor = this.stamina > 0 ? 1 : 0.15;
      const move = speed * magnitude * pushMul * staminaFactor;
      const resist = 1 / (1 + effectiveBlock);
      this.velocity.addScaledVector(dir, move * resist);
    } else if (!pushing) {
      this.stamina = Math.min(this.staminaMax, this.stamina + mods.staminaRegen * dt);
    } else {
      // pinned with no stamina — tiny crawl + slow regen
      this.stamina = Math.min(this.staminaMax, this.stamina + mods.staminaRegen * 0.25 * dt);
      this.velocity.addScaledVector(dir, 0.3 * magnitude * dt);
    }

    this.velocity.multiplyScalar(Math.exp(-5 * dt));
    this.position.addScaledVector(this.velocity, dt);
    this.position.x = THREE.MathUtils.clamp(this.position.x, -1.7, 1.7);
    this.position.z = THREE.MathUtils.clamp(this.position.z, doorZ - 0.15, 4.5);

    this.bob += dt * (pushing ? 12 : 4);
    this.mesh.position.set(this.position.x, Math.sin(this.bob) * 0.03, this.position.z);
    return { pushing };
  }

  reachedDoor(doorZ: number): boolean {
    return this.position.z <= doorZ + 0.55 && Math.abs(this.position.x) < 0.95;
  }

  doorProgress(doorZ: number, startZ: number): number {
    const t = (startZ - this.position.z) / (startZ - doorZ);
    return THREE.MathUtils.clamp(t, 0, 1);
  }
}
