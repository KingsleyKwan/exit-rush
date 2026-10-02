import * as THREE from 'three';

/** MTR-inspired red (not official brand guideline lockup) */
export const MTR_RED = 0xb01c2e;
export const MTR_SILVER = 0xc5ccd3;
export const MTR_FLOOR = 0x3a3f46;

export const DOOR_Z = -3.6;
export const PLAYER_START = new THREE.Vector3(0, 0, 3.2);

export class TrainScene {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly doorGroup = new THREE.Group();
  private doorL: THREE.Mesh;
  private doorR: THREE.Mesh;
  private doorOpen = 0; // 0 closed … 1 open
  private targetOpen = 1;

  constructor(aspect: number) {
    this.scene.background = new THREE.Color(0x1a1d22);
    this.scene.fog = new THREE.Fog(0x1a1d22, 8, 18);

    this.camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 50);
    this.camera.position.set(0, 5.2, 5.5);
    this.camera.lookAt(0, 0.6, -0.5);

    const hemi = new THREE.HemisphereLight(0xfff5f0, 0x334455, 0.85);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.75);
    dir.position.set(2, 6, 3);
    dir.castShadow = true;
    this.scene.add(dir);

    this.buildCar();
    this.doorL = this.makeDoorLeaf(-0.55);
    this.doorR = this.makeDoorLeaf(0.55);
    this.doorGroup.position.set(0, 0, DOOR_Z);
    this.doorGroup.add(this.doorL, this.doorR);
    this.scene.add(this.doorGroup);

    // Door glow strip
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.06, 0.08),
      new THREE.MeshStandardMaterial({
        color: MTR_RED,
        emissive: MTR_RED,
        emissiveIntensity: 0.45,
      }),
    );
    strip.position.set(0, 2.05, DOOR_Z);
    this.scene.add(strip);

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
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 0.6),
      new THREE.MeshBasicMaterial({ map: tex }),
    );
    sign.position.set(0, 2.5, 0.2);
    sign.rotation.y = Math.PI;
    this.scene.add(sign);
  }

  private buildCar(): void {
    const floorMat = new THREE.MeshStandardMaterial({
      color: MTR_FLOOR,
      roughness: 0.85,
    });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 9), floorMat);
    floor.position.y = -0.06;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xe8eaed,
      roughness: 0.55,
    });
    const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.4, 9), wallMat);
    wallL.position.set(-2.05, 1.1, 0);
    const wallR = wallL.clone();
    wallR.position.x = 2.05;
    this.scene.add(wallL, wallR);

    const ceiling = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.1, 9),
      new THREE.MeshStandardMaterial({ color: 0xd0d5db, roughness: 0.4 }),
    );
    ceiling.position.y = 2.35;
    this.scene.add(ceiling);

    // Pole
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 2.2, 12),
      new THREE.MeshStandardMaterial({ color: MTR_SILVER, metalness: 0.8, roughness: 0.3 }),
    );
    pole.position.set(0.9, 1.1, 1.2);
    this.scene.add(pole);

    // Seat benches along sides (simplified)
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x4a5560, roughness: 0.7 });
    for (const x of [-1.55, 1.55]) {
      for (const z of [-1.5, 0.5, 2.5]) {
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 1.4), seatMat);
        seat.position.set(x, 0.25, z);
        this.scene.add(seat);
      }
    }

    // Floor arrow toward door
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.25, 0.5, 3),
      new THREE.MeshBasicMaterial({ color: MTR_RED }),
    );
    arrow.rotation.x = -Math.PI / 2;
    arrow.position.set(0, 0.02, -1.5);
    this.scene.add(arrow);
  }

  private makeDoorLeaf(x: number): THREE.Mesh {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x9aa3ad,
      metalness: 0.35,
      roughness: 0.4,
      transparent: true,
      opacity: 0.92,
    });
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.1, 0.08), mat);
    m.position.set(x, 1.05, 0);
    // Red accent bar
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.08, 0.09),
      new THREE.MeshStandardMaterial({ color: MTR_RED, emissive: MTR_RED, emissiveIntensity: 0.3 }),
    );
    bar.position.y = 0.85;
    m.add(bar);
    return m;
  }

  setDoorsOpen(open: boolean): void {
    this.targetOpen = open ? 1 : 0;
  }

  update(dt: number): void {
    this.doorOpen += (this.targetOpen - this.doorOpen) * Math.min(1, dt * 3);
    this.doorL.position.x = -0.55 - this.doorOpen * 0.7;
    this.doorR.position.x = 0.55 + this.doorOpen * 0.7;
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** Camera follow soft */
  follow(target: THREE.Vector3, dt: number): void {
    const desired = new THREE.Vector3(target.x * 0.35, 5.0, target.z + 4.2);
    this.camera.position.lerp(desired, 1 - Math.exp(-3 * dt));
    const look = new THREE.Vector3(target.x * 0.2, 0.7, DOOR_Z + 1);
    const cur = new THREE.Vector3();
    this.camera.getWorldDirection(cur);
    // simple lookAt each frame is fine for slice
    this.camera.lookAt(look);
  }
}
