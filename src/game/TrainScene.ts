import * as THREE from 'three';
import { DOOR_Z, PLAYER_START_X, PLAYER_START_Z, TUNING } from './sim/tuning';

/** MTR-inspired red (not official brand guideline lockup) */
export const MTR_RED = 0xb01c2e;
export const MTR_SILVER = 0xc5ccd3;
export const MTR_FLOOR = 0x3a3f46;

export { DOOR_Z };
export const PLAYER_START = new THREE.Vector3(PLAYER_START_X, 0, PLAYER_START_Z);

/** Live `prefers-reduced-motion` flag (follows OS setting changes while running). */
let REDUCED_MOTION = false;
if (typeof window !== 'undefined' && window.matchMedia) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  REDUCED_MOTION = mq.matches;
  const onChange = (e: MediaQueryListEvent) => {
    REDUCED_MOTION = e.matches;
  };
  if (mq.addEventListener) mq.addEventListener('change', onChange);
  else mq.addListener?.(onChange);
}

/**
 * Car + platform scene, door leaves & warning lights, and a juicy camera rig
 * (critically-damped follow, trauma-based shake, directional kicks, FOV punch).
 */
export class TrainScene {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly doorGroup = new THREE.Group();
  private doorL: THREE.Mesh;
  private doorR: THREE.Mesh;
  private doorOpen = 0; // 0 closed … 1 open (visual)
  private targetOpen = 1;
  private warnMats: THREE.MeshStandardMaterial[] = [];
  private exitZone: THREE.Mesh;
  private exitMat: THREE.MeshBasicMaterial;
  private warn = 0;
  private dirLight: THREE.DirectionalLight;

  // Camera rig state
  private camPos = new THREE.Vector3(0, 6.3, 6.8);
  private camVel = new THREE.Vector3();
  private look = new THREE.Vector3(0, 0.6, 0.5);
  private lookVel = new THREE.Vector3();
  private kick = new THREE.Vector3();
  private kickVel = new THREE.Vector3();
  private trauma = 0;
  private fovKick = 0;
  private fovExtra = 0;
  private baseFov = 55;
  private tmp = new THREE.Vector3();
  private time = 0;

  constructor(aspect: number) {
    this.scene.background = new THREE.Color(0x1a1d22);
    this.scene.fog = new THREE.Fog(0x1a1d22, 9, 20);

    this.camera = new THREE.PerspectiveCamera(this.baseFov, aspect, 0.1, 50);
    this.fitAspect(aspect);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.look);

    const hemi = new THREE.HemisphereLight(0xfff5f0, 0x334455, 0.95);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(2, 7, 3);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    const sc = dir.shadow.camera;
    sc.left = -4;
    sc.right = 4;
    sc.top = 7;
    sc.bottom = -7;
    sc.near = 1;
    sc.far = 20;
    this.scene.add(dir);
    this.dirLight = dir;

    this.buildCar();
    this.buildPlatform();
    this.doorL = this.makeDoorLeaf();
    this.doorR = this.makeDoorLeaf();
    this.doorGroup.position.set(0, 0, DOOR_Z - 0.1);
    this.doorGroup.add(this.doorL, this.doorR);
    this.scene.add(this.doorGroup);

    // Door glow strip + side warning lamps (flash in the last seconds).
    const stripMat = new THREE.MeshStandardMaterial({ color: MTR_RED, emissive: MTR_RED, emissiveIntensity: 0.45 });
    const strip = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.07, 0.08), stripMat);
    strip.position.set(0, 2.15, DOOR_Z + 0.12);
    this.scene.add(strip);
    this.warnMats.push(stripMat);
    for (const sx of [-1, 1]) {
      const lampMat = new THREE.MeshStandardMaterial({ color: 0x552222, emissive: 0xff3030, emissiveIntensity: 0.1 });
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.6, 0.06), lampMat);
      lamp.position.set(sx * 0.9, 1.1, DOOR_Z + 0.12);
      this.scene.add(lamp);
      this.warnMats.push(lampMat);
    }

    // Exit zone marker on the floor (goal + progress feedback).
    this.exitMat = new THREE.MeshBasicMaterial({ color: 0x66ff99, transparent: true, opacity: 0.25, depthWrite: false });
    this.exitZone = new THREE.Mesh(
      new THREE.PlaneGeometry(TUNING.car.winHalf * 2 - 0.2, TUNING.car.winDepth),
      this.exitMat,
    );
    this.exitZone.rotation.x = -Math.PI / 2;
    this.exitZone.position.set(0, 0.013, DOOR_Z + 0.08 + TUNING.car.winDepth / 2);
    this.scene.add(this.exitZone);

    // Station-style bilingual placard (generic, not MTR logo)
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#B01C2E';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('EXIT RUSH  逼落車', 24, 52);
    ctx.font = '24px sans-serif';
    ctx.fillText('Inspired look · not affiliated', 24, 92);
    const tex = new THREE.CanvasTexture(canvas);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), new THREE.MeshBasicMaterial({ map: tex }));
    sign.position.set(0, 2.55, DOOR_Z + 0.13);
    this.scene.add(sign);
  }

  private buildCar(): void {
    const C = TUNING.car;
    const len = C.backZ + 0.05 - DOOR_Z;
    const midZ = (C.backZ + 0.05 + DOOR_Z) / 2;
    const floorMat = new THREE.MeshStandardMaterial({ color: MTR_FLOOR, roughness: 0.85 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, len), floorMat);
    floor.position.set(0, -0.06, midZ);
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Aisle stripe (subtle) to read the walkable lane.
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(2.3, len - 0.2),
      new THREE.MeshStandardMaterial({ color: 0x454b53, roughness: 0.9 }),
    );
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(0, 0.005, midZ);
    stripe.receiveShadow = true;
    this.scene.add(stripe);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xe8eaed, roughness: 0.55 });
    const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.4, len), wallMat);
    wallL.position.set(-2.05, 1.1, midZ);
    const wallR = wallL.clone();
    wallR.position.x = 2.05;
    const back = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.4, 0.12), wallMat);
    back.position.set(0, 1.1, C.backZ + 0.06);
    this.scene.add(wallL, wallR, back);

    // End wall with doorway.
    const endMat = new THREE.MeshStandardMaterial({ color: 0xdfe2e6, roughness: 0.5 });
    const sideW = 2.1 - C.doorHalf;
    for (const sx of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(sideW, 2.4, 0.12), endMat);
      p.position.set(sx * (C.doorHalf + sideW / 2), 1.1, DOOR_Z + 0.02);
      this.scene.add(p);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(C.doorHalf * 2, 0.3, 0.12), endMat);
    lintel.position.set(0, 2.25, DOOR_Z + 0.02);
    this.scene.add(lintel);

    // Cutaway ceiling: a downward-facing plane is invisible from the top-down camera.
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, len),
      new THREE.MeshStandardMaterial({ color: 0xd0d5db, roughness: 0.4 }),
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 2.35, midZ);
    this.scene.add(ceiling);

    // Pole
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 2.2, 12),
      new THREE.MeshStandardMaterial({ color: MTR_SILVER, metalness: 0.8, roughness: 0.3 }),
    );
    pole.position.set(0.9, 1.1, 1.2);
    pole.castShadow = true;
    this.scene.add(pole);

    // Longitudinal bench seats (match physics boxes in sim/Sim.ts).
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x4a5560, roughness: 0.7 });
    const backMat = new THREE.MeshStandardMaterial({ color: 0x5c6773, roughness: 0.7 });
    for (const sx of [-1, 1]) {
      for (const z of [-1.5, 0.5, 2.5]) {
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.42, 1.4), seatMat);
        seat.position.set(sx * 1.59, 0.21, z);
        seat.receiveShadow = true;
        const sb = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 1.4), backMat);
        sb.position.set(sx * 1.92, 0.7, z);
        this.scene.add(seat, sb);
      }
    }
  }

  private buildPlatform(): void {
    const C = TUNING.car;
    const depth = C.platformDepth + 1.5;
    const plat = new THREE.Mesh(
      new THREE.BoxGeometry(C.platformHalfWidth * 2 + 2, 0.12, depth),
      new THREE.MeshStandardMaterial({ color: 0x8d939b, roughness: 0.9 }),
    );
    plat.position.set(0, -0.07, DOOR_Z - depth / 2);
    plat.receiveShadow = true;
    this.scene.add(plat);
    // Yellow tactile safety line.
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(C.platformHalfWidth * 2 + 2, 0.02, 0.22),
      new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.6 }),
    );
    line.position.set(0, 0.0, DOOR_Z - 0.55);
    this.scene.add(line);
    // Boarding arrows (inbound) either side — the crowd you're fighting.
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x2e7d32, transparent: true, opacity: 0.55 });
    for (const sx of [-1.4, 1.4]) {
      const a = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 3), arrowMat);
      a.rotation.x = Math.PI / 2;
      a.position.set(sx, 0.01, DOOR_Z - 1.3);
      this.scene.add(a);
    }
  }

  private makeDoorLeaf(): THREE.Mesh {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x9aa3ad,
      metalness: 0.35,
      roughness: 0.4,
      transparent: true,
      opacity: 0.92,
    });
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.1, 0.08), mat);
    m.position.y = 1.05;
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.08, 0.09),
      new THREE.MeshStandardMaterial({ color: MTR_RED, emissive: MTR_RED, emissiveIntensity: 0.3 }),
    );
    bar.position.y = 0.85;
    m.add(bar);
    return m;
  }

  /** Menu use: animate toward open/closed. */
  setDoorsOpen(open: boolean): void {
    this.targetOpen = open ? 1 : 0;
  }

  /** In-game: mirror the sim's physical door opening exactly. */
  setDoorOpenValue(v: number): void {
    this.targetOpen = v;
    this.doorOpen = v;
  }

  /** 0 = calm; 0..1 = door-closing urgency (lights flash faster). */
  setWarning(u: number): void {
    this.warn = u;
  }

  update(dt: number): void {
    this.time += dt;
    this.doorOpen += (this.targetOpen - this.doorOpen) * Math.min(1, dt * 6);
    const half = TUNING.car.doorHalf;
    this.doorL.position.x = -(0.475 + half * this.doorOpen);
    this.doorR.position.x = 0.475 + half * this.doorOpen;

    const t = this.time;
    if (this.warn > 0) {
      const hz = 2 + this.warn * 7;
      const on = Math.sin(t * hz * Math.PI * 2) > 0;
      for (const m of this.warnMats) {
        m.emissive.setHex(on ? 0xff2020 : 0xffa000);
        m.emissiveIntensity = on ? 2.2 : 0.5;
      }
      this.exitMat.color.setHex(on ? 0xff5050 : 0xffcc33);
      this.exitMat.opacity = on ? 0.45 : 0.2;
    } else {
      this.warnMats.forEach((m, i) => {
        m.emissive.setHex(i === 0 ? MTR_RED : 0xff3030);
        m.emissiveIntensity = i === 0 ? 0.45 : 0.1;
      });
      this.exitMat.color.setHex(0x66ff99);
      this.exitMat.opacity = 0.18 + 0.12 * Math.sin(t * 3);
    }
  }

  /** Quality tier: toggle the shadow-casting light (renderer.shadowMap is toggled by Game). */
  setShadows(on: boolean): void {
    this.dirLight.castShadow = on;
  }

  private fitAspect(aspect: number): void {
    // Portrait phones: widen vertical FOV a bit so the car width still fits.
    this.baseFov = aspect < 0.7 ? 62 : 55;
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.fitAspect(aspect);
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
  }

  addTrauma(a: number): void {
    this.trauma = Math.min(1, this.trauma + a * (REDUCED_MOTION ? 0.3 : 1));
  }

  kickCamera(dx: number, dz: number, amount: number): void {
    const k = REDUCED_MOTION ? 0.3 : 1;
    this.kickVel.x += dx * amount * k;
    this.kickVel.z += dz * amount * k;
  }

  punchFov(a: number): void {
    this.fovKick += REDUCED_MOTION ? a * 0.3 : a;
  }

  /** Persistent extra FOV (e.g. while dashing). */
  setFovExtra(a: number): void {
    this.fovExtra = a;
  }

  /** Critically-damped follow with lag + shake. Call once per rendered frame. */
  follow(target: { x: number; z: number }, dt: number): void {
    const C = TUNING.car;
    // Desired camera: behind & above the player, always framing the door ahead.
    const want = this.tmp.set(target.x * 0.4, 6.6, Math.min(target.z + 3.2, C.backZ + 2.4));
    const w = 5;
    this.camVel.addScaledVector(want.sub(this.camPos), w * w * dt).multiplyScalar(Math.max(0, 1 - 2 * w * dt));
    this.camPos.addScaledVector(this.camVel, dt);
    const lookWant = this.tmp.set(target.x * 0.3, 0.3, Math.max(DOOR_Z - 1.4, target.z - 3.4));
    const wl = 7;
    this.lookVel.addScaledVector(lookWant.sub(this.look), wl * wl * dt).multiplyScalar(Math.max(0, 1 - 2 * wl * dt));
    this.look.addScaledVector(this.lookVel, dt);

    // Directional kick (spring back to rest).
    this.kickVel.addScaledVector(this.kick, -140 * dt).multiplyScalar(Math.exp(-12 * dt));
    this.kick.addScaledVector(this.kickVel, dt);

    // Trauma shake.
    this.trauma = Math.max(0, this.trauma - dt * 1.7);
    const amp = this.trauma * this.trauma;
    const t = this.time;
    const ox = amp * 0.22 * (Math.sin(t * 31.1) + 0.5 * Math.sin(t * 17.3 + 1.1));
    const oy = amp * 0.16 * (Math.sin(t * 27.7 + 2.3) + 0.5 * Math.sin(t * 13.1));
    const roll = amp * 0.05 * Math.sin(t * 23.3 + 0.7);

    this.camera.position.set(this.camPos.x + ox + this.kick.x, this.camPos.y + oy, this.camPos.z + this.kick.z);
    this.camera.lookAt(this.look.x + this.kick.x * 0.5, this.look.y, this.look.z + this.kick.z * 0.5);
    this.camera.rotateZ(roll);

    this.fovKick *= Math.exp(-7 * dt);
    const fov = this.baseFov + this.fovKick + this.fovExtra;
    if (Math.abs(fov - this.camera.fov) > 0.01) {
      this.camera.fov += (fov - this.camera.fov) * Math.min(1, dt * 14);
      this.camera.updateProjectionMatrix();
    }
  }
}
