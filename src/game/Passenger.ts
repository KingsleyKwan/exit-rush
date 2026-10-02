import * as THREE from 'three';
import { PASSENGER_DEFS, type PassengerKind } from './PassengerTypes';

let _id = 0;

export class Passenger {
  readonly id = ++_id;
  readonly kind: PassengerKind;
  readonly mesh: THREE.Group;
  readonly body: THREE.Mesh;
  position: THREE.Vector3;
  velocity = new THREE.Vector3();
  mass: number;
  radius: number;
  /** Pair partner for couples */
  partner: Passenger | null = null;
  /** Family cluster id */
  clusterId: number | null = null;
  private shoveTimer: number;
  private zigzagPhase: number;
  private luggageMesh: THREE.Mesh | null = null;

  constructor(kind: PassengerKind, x: number, z: number) {
    const def = PASSENGER_DEFS[kind];
    this.kind = kind;
    this.mass = def.mass;
    this.radius = def.radius * (def.widthMul ?? 1) * 0.55;
    this.position = new THREE.Vector3(x, 0, z);
    this.shoveTimer = (def.shoveInterval ?? 3) * Math.random();
    this.zigzagPhase = Math.random() * Math.PI * 2;

    this.mesh = new THREE.Group();
    const w = 0.45 * (def.widthMul ?? 1);
    const bodyGeo = new THREE.BoxGeometry(w, 0.85, 0.35);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: def.color,
      roughness: 0.65,
      metalness: 0.05,
    });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.position.y = 0.55;
    this.body.castShadow = true;
    this.mesh.add(this.body);

    const headGeo = new THREE.SphereGeometry(0.18, 10, 10);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xf1c27d,
      roughness: 0.7,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.15;
    head.castShadow = true;
    this.mesh.add(head);

    if (kind === 'luggage') {
      const caseGeo = new THREE.BoxGeometry(0.35, 0.5, 0.55);
      const caseMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.5 });
      this.luggageMesh = new THREE.Mesh(caseGeo, caseMat);
      this.luggageMesh.position.set(0.4, 0.35, 0);
      this.mesh.add(this.luggageMesh);
    }

    if (kind === 'stench') {
      const aura = new THREE.Mesh(
        new THREE.RingGeometry(0.5, 0.85, 20),
        new THREE.MeshBasicMaterial({
          color: 0x8bc34a,
          transparent: true,
          opacity: 0.25,
          side: THREE.DoubleSide,
        }),
      );
      aura.rotation.x = -Math.PI / 2;
      aura.position.y = 0.05;
      this.mesh.add(aura);
    }

    this.syncMesh();
  }

  syncMesh(): void {
    this.mesh.position.copy(this.position);
  }

  /** Simple AI / special behaviour; returns shove impulse on player if any */
  update(
    dt: number,
    doorZ: number,
    pressure: number,
  ): THREE.Vector3 | null {
    const def = PASSENGER_DEFS[this.kind];
    let shove: THREE.Vector3 | null = null;

    // Boarding pressure: drift toward deeper into car (positive Z if door at -Z)
    // Door is at negative Z; boarders push +Z into car
    this.velocity.z += pressure * 0.35 * dt;

    if (def.zigzag) {
      this.zigzagPhase += dt * 5;
      this.velocity.x += Math.sin(this.zigzagPhase) * 2.2 * dt;
    }

    if (def.shoveInterval && def.shoveForce) {
      this.shoveTimer -= dt;
      if (this.shoveTimer <= 0) {
        this.shoveTimer = def.shoveInterval * (0.7 + Math.random() * 0.6);
        shove = new THREE.Vector3(
          (Math.random() - 0.5) * def.shoveForce,
          0,
          def.shoveForce * 0.6,
        );
        // Visual punch
        this.body.scale.set(1.15, 0.9, 1.15);
      }
    } else {
      this.body.scale.lerp(new THREE.Vector3(1, 1, 1), 1 - Math.exp(-8 * dt));
    }

    // Mild wander
    this.velocity.x += (Math.random() - 0.5) * 0.4 * dt;
    this.velocity.multiplyScalar(Math.exp(-1.8 * dt));
    this.position.addScaledVector(this.velocity, dt);

    // Soft clamp inside car
    this.position.x = THREE.MathUtils.clamp(this.position.x, -1.55, 1.55);
    this.position.z = THREE.MathUtils.clamp(this.position.z, doorZ + 0.4, 4.2);

    this.syncMesh();
    return shove;
  }
}
