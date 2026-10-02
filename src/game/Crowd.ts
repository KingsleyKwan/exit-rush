import * as THREE from 'three';
import { Passenger } from './Passenger';
import { PASSENGER_DEFS, type PassengerKind } from './PassengerTypes';
import { crowdCount, type LevelDef } from './levels';

function pickKind(mix: LevelDef['mix']): PassengerKind {
  const entries = Object.entries(mix) as [PassengerKind, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r <= 0) return k;
  }
  return 'normal';
}

export class Crowd {
  passengers: Passenger[] = [];
  readonly group = new THREE.Group();
  private spawnAcc = 0;
  private clusterSeq = 0;

  clear(): void {
    for (const p of this.passengers) {
      this.group.remove(p.mesh);
      p.mesh.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const m = o.material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m.dispose();
        }
      });
    }
    this.passengers = [];
  }

  spawnForLevel(level: LevelDef, doorZ: number): void {
    this.clear();
    const n = crowdCount(level.density);
    let i = 0;
    while (i < n) {
      const kind = pickKind(level.mix);
      if (kind === 'family') {
        const cid = ++this.clusterSeq;
        const cx = (Math.random() - 0.5) * 2.4;
        const cz = doorZ + 1.2 + Math.random() * 3.2;
        for (let k = 0; k < 3 && i < n; k++, i++) {
          const p = new Passenger('family', cx + (k - 1) * 0.4, cz + (k % 2) * 0.25);
          p.clusterId = cid;
          this.add(p);
        }
        continue;
      }
      if (kind === 'couple') {
        const cx = (Math.random() - 0.5) * 2.2;
        const cz = doorZ + 1.0 + Math.random() * 3.4;
        const a = new Passenger('couple', cx - 0.28, cz);
        const b = new Passenger('couple', cx + 0.28, cz);
        a.partner = b;
        b.partner = a;
        this.add(a);
        this.add(b);
        i += 2;
        continue;
      }
      const x = (Math.random() - 0.5) * 2.8;
      const z = doorZ + 0.9 + Math.random() * 3.6;
      this.add(new Passenger(kind, x, z));
      i++;
    }
  }

  private add(p: Passenger): void {
    this.passengers.push(p);
    this.group.add(p.mesh);
  }

  /** Boarding spawns near door */
  tickSpawn(dt: number, level: LevelDef, doorZ: number): void {
    this.spawnAcc += dt * level.pressure * 0.55;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (this.passengers.length > crowdCount(level.density) + 8) break;
      const kind = pickKind(level.mix);
      const p = new Passenger(kind, (Math.random() - 0.5) * 1.2, doorZ + 0.55);
      // Push into car
      p.velocity.z = 1.2 + Math.random();
      this.add(p);
    }
  }

  update(
    dt: number,
    doorZ: number,
    pressure: number,
    playerPos: THREE.Vector3,
    onShove: (impulse: THREE.Vector3) => void,
  ): void {
    for (const p of this.passengers) {
      const shove = p.update(dt, doorZ, pressure);
      if (shove && p.position.distanceTo(playerPos) < 1.1) {
        onShove(shove);
      }
    }
    // Couple spring
    for (const p of this.passengers) {
      if (p.partner && p.id < p.partner.id) {
        const mid = p.position.clone().add(p.partner.position).multiplyScalar(0.5);
        const ideal = 0.55;
        const delta = p.partner.position.clone().sub(p.position);
        const dist = delta.length() || 0.001;
        const corr = ((dist - ideal) * 0.5) * dt * 4;
        delta.normalize().multiplyScalar(corr);
        p.position.add(delta);
        p.partner.position.sub(delta);
        // Keep near mid laterally
        p.position.lerp(mid.clone().setX(mid.x - 0.28), 0.02);
        p.partner.position.lerp(mid.clone().setX(mid.x + 0.28), 0.02);
        p.syncMesh();
        p.partner.syncMesh();
      }
    }
    // Family soft cluster
    const byCluster = new Map<number, Passenger[]>();
    for (const p of this.passengers) {
      if (p.clusterId == null) continue;
      const arr = byCluster.get(p.clusterId) ?? [];
      arr.push(p);
      byCluster.set(p.clusterId, arr);
    }
    for (const members of byCluster.values()) {
      const c = new THREE.Vector3();
      for (const m of members) c.add(m.position);
      c.multiplyScalar(1 / members.length);
      for (const m of members) {
        m.position.lerp(c, 0.015);
        m.syncMesh();
      }
    }
    // Passenger–passenger soft separation
    for (let i = 0; i < this.passengers.length; i++) {
      for (let j = i + 1; j < this.passengers.length; j++) {
        const a = this.passengers[i];
        const b = this.passengers[j];
        const d = a.position.distanceTo(b.position);
        const min = a.radius + b.radius;
        if (d < min && d > 0.001) {
          const push = (min - d) * 0.5;
          const dir = a.position.clone().sub(b.position).normalize();
          const invA = 1 / a.mass;
          const invB = 1 / b.mass;
          const sum = invA + invB;
          a.position.addScaledVector(dir, (push * invA) / sum);
          b.position.addScaledVector(dir, (-push * invB) / sum);
          a.syncMesh();
          b.syncMesh();
        }
      }
    }
  }

  /** Combined push resistance & slow from crowd near player */
  sampleCrowdForce(
    playerPos: THREE.Vector3,
    pushDir: THREE.Vector3,
    auraResist: number,
  ): { block: number; slow: number; hitMass: number } {
    let block = 0;
    let slow = 0;
    let hitMass = 0;
    for (const p of this.passengers) {
      const dist = playerPos.distanceTo(p.position);
      const def = PASSENGER_DEFS[p.kind];
      if (def.auraSlow && dist < 1.4) {
        const t = 1 - dist / 1.4;
        slow += def.auraSlow * t * (1 - auraResist);
      }
      if (dist < p.radius + 0.45) {
        const away = playerPos.clone().sub(p.position);
        const align = pushDir.lengthSq() > 0 ? away.normalize().dot(pushDir.clone().normalize()) : 0;
        // Harder when pushing into them
        const into = Math.max(0, -align);
        block += into * p.mass * 0.55;
        hitMass += p.mass;
        // Separate player handled externally; nudge passenger
        if (dist > 0.01) {
          p.position.addScaledVector(away.normalize(), -0.02 * (1 / p.mass));
          p.syncMesh();
        }
      }
    }
    return { block, slow: Math.min(0.75, slow), hitMass };
  }
}
