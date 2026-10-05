import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { DOOR_Z, PLAYER_START_X, PLAYER_START_Z, TUNING } from './sim/tuning';
import { LINE_COLORS, linesFor } from './lines';
import type { LevelDef } from './levels';

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

type LevelLike = Pick<LevelDef, 'id' | 'stationEn' | 'stationZh'>;

const CJK = "'PingFang HK','Noto Sans HK','Noto Sans CJK HK','Microsoft JhengHei',system-ui,sans-serif";

function canvasTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat?: [number, number]): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx) draw(ctx);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

/** Deterministic speckle noise (no Math.random so every boot looks identical). */
function speckle(ctx: CanvasRenderingContext2D, w: number, h: number, n: number, cols: string[]): void {
  let r = 12345;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = cols[i % cols.length];
    ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
  }
}

/** Collects static parts per material and merges them into one mesh each (few draw calls). */
class Batch {
  private map = new Map<THREE.Material, THREE.BufferGeometry[]>();
  private m = new THREE.Matrix4();
  private e = new THREE.Euler();
  private q = new THREE.Quaternion();
  add(mat: THREE.Material, geo: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): void {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    geo.dispose();
    this.m.compose(new THREE.Vector3(x, y, z), this.q.setFromEuler(this.e.set(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(this.m);
    const list = this.map.get(mat) ?? [];
    list.push(g);
    this.map.set(mat, list);
  }
  box(mat: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): void {
    this.add(mat, new THREE.BoxGeometry(w, h, d), x, y, z, rx, ry, rz);
  }
  flush(scene: THREE.Object3D, cast: Set<THREE.Material>, receive: Set<THREE.Material>): THREE.Mesh[] {
    const out: THREE.Mesh[] = [];
    for (const [mat, list] of this.map) {
      const g = mergeGeometries(list, false);
      list.forEach((x) => x.dispose());
      if (!g) continue;
      const mesh = new THREE.Mesh(g, mat);
      mesh.castShadow = cast.has(mat);
      mesh.receiveShadow = receive.has(mat);
      scene.add(mesh);
      out.push(mesh);
    }
    this.map.clear();
    return out;
  }
}

/**
 * v0.3 MTR-inspired car + platform (original art, no logos): white/light-grey
 * interior with red accents, stainless longitudinal benches, poles + overhead
 * rails with red grips, strip line-map above the door, red door frame with
 * indicator lamps, yellow edge lines, platform screen doors, red/white tiled
 * pillars and a navy bilingual station sign that follows the current level.
 * Plus the juicy camera rig (critically-damped follow, trauma shake, kicks, FOV punch).
 */
export class TrainScene {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly doorGroup = new THREE.Group();
  private doorL: THREE.Object3D;
  private doorR: THREE.Object3D;
  private psdL: THREE.Object3D;
  private psdR: THREE.Object3D;
  private doorOpen = 0; // 0 closed … 1 open (visual)
  private targetOpen = 1;
  private warnMats: THREE.MeshStandardMaterial[] = [];
  private exitZone: THREE.Mesh;
  private exitMat: THREE.MeshBasicMaterial;
  private warn = 0;
  private dirLight: THREE.DirectionalLight;
  private signTex: THREE.CanvasTexture;
  private mapTex: THREE.CanvasTexture;
  private stationKey = '';

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

  // Shared materials
  private mat = {
    wall: new THREE.MeshLambertMaterial({ color: 0xf1f3f5 }),
    wallGrey: new THREE.MeshLambertMaterial({ color: 0xd5dae0 }),
    red: new THREE.MeshLambertMaterial({ color: MTR_RED }),
    steel: new THREE.MeshPhongMaterial({ color: MTR_SILVER, specular: 0x9aa3ad, shininess: 70 }),
    glass: new THREE.MeshLambertMaterial({ color: 0xa9d2e6, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
    window: new THREE.MeshLambertMaterial({ color: 0x1d2631 }),
    yellow: new THREE.MeshLambertMaterial({ color: 0xf2c230 }),
    light: new THREE.MeshBasicMaterial({ color: 0xfdfcf6 }),
    dark: new THREE.MeshLambertMaterial({ color: 0x2b3038 }),
    navy: new THREE.MeshLambertMaterial({ color: 0x1b2a4e }),
  };

  constructor(aspect: number) {
    this.scene.background = new THREE.Color(0x141820);
    this.scene.fog = new THREE.Fog(0x141820, 11, 24);

    this.camera = new THREE.PerspectiveCamera(this.baseFov, aspect, 0.1, 50);
    this.fitAspect(aspect);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.look);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x5a6270, 1.15);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xfff8ee, 1.05);
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

    this.signTex = canvasTex(1024, 256, () => undefined);
    this.mapTex = canvasTex(1024, 160, () => undefined);

    const batch = new Batch();
    this.buildCar(batch);
    this.buildTunnel(batch);
    this.buildPlatform(batch);
    const M = this.mat;
    batch.flush(this.scene, new Set<THREE.Material>([M.steel, M.red, M.wallGrey]), new Set<THREE.Material>([M.wall, M.steel, M.yellow, M.wallGrey]));

    this.doorL = this.makeDoorLeaf(1);
    this.doorR = this.makeDoorLeaf(-1);
    this.doorGroup.position.set(0, 0, DOOR_Z - 0.1);
    this.doorGroup.add(this.doorL, this.doorR);
    this.scene.add(this.doorGroup);
    this.psdL = this.makePsdLeaf();
    this.psdR = this.makePsdLeaf();
    this.psdL.position.z = this.psdR.position.z = DOOR_Z - 0.24;
    this.scene.add(this.psdL, this.psdR);

    // Door warning strip + indicator lamps (flash in the last seconds).
    const stripMat = new THREE.MeshStandardMaterial({ color: MTR_RED, emissive: MTR_RED, emissiveIntensity: 0.45 });
    const strip = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.05), stripMat);
    strip.position.set(0, 2.17, DOOR_Z + 0.14);
    this.scene.add(strip);
    this.warnMats.push(stripMat);
    for (const sx of [-1, 1]) {
      const lampMat = new THREE.MeshStandardMaterial({ color: 0x552222, emissive: 0xff3030, emissiveIntensity: 0.1 });
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 12), lampMat);
      lamp.rotation.x = Math.PI / 2;
      lamp.position.set(sx * 0.98, 2.2, DOOR_Z + 0.15);
      this.scene.add(lamp);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.5, 0.04), lampMat);
      bar.position.set(sx * 0.98, 1.2, DOOR_Z + 0.15);
      this.scene.add(bar);
      this.warnMats.push(lampMat);
    }

    // Exit zone marker on the floor (goal + progress feedback).
    this.exitMat = new THREE.MeshBasicMaterial({ color: 0x66ff99, transparent: true, opacity: 0.25, depthWrite: false });
    this.exitZone = new THREE.Mesh(new THREE.PlaneGeometry(TUNING.car.winHalf * 2 - 0.2, TUNING.car.winDepth), this.exitMat);
    this.exitZone.rotation.x = -Math.PI / 2;
    this.exitZone.position.set(0, 0.013, DOOR_Z + 0.16 + TUNING.car.winDepth / 2);
    this.scene.add(this.exitZone);

    // Strip line-map above the door (inside the car, facing the camera).
    const map = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.36), new THREE.MeshBasicMaterial({ map: this.mapTex }));
    map.position.set(0, 2.52, DOOR_Z + 0.14);
    this.scene.add(map);
    // Navy bilingual station sign on the platform's back wall.
    const C = TUNING.car;
    const backZ = DOOR_Z - C.platformDepth - 0.05;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshBasicMaterial({ map: this.signTex, fog: false }));
    sign.position.set(0, 2.0, backZ + 0.08);
    this.scene.add(sign);
    this.setStation({ id: 0, stationEn: 'Exit Rush', stationZh: '逼落車' });
  }

  /** Redraw the platform sign + strip map for a level (EN + 中). */
  setStation(level: LevelLike, neighbours: LevelLike[] = []): void {
    const key = `${level.id}|${level.stationEn}`;
    if (key === this.stationKey) return;
    this.stationKey = key;
    const lines = linesFor(level.stationEn);
    const col = LINE_COLORS[lines[0]];
    // --- platform sign
    const sc = this.signTex.image as HTMLCanvasElement;
    const s = sc.getContext('2d');
    if (s) {
      s.fillStyle = '#1b2a4e';
      s.fillRect(0, 0, 1024, 256);
      s.fillStyle = col;
      s.fillRect(0, 0, 1024, 18);
      s.fillStyle = '#ffffff';
      s.textBaseline = 'middle';
      s.font = `900 104px ${CJK}`;
      s.fillText(level.stationZh, 54, 118);
      const zw = s.measureText(level.stationZh).width;
      s.font = `700 60px ${CJK}`;
      s.fillText(level.stationEn, 54 + zw + 40, 104);
      s.font = `500 26px ${CJK}`;
      s.globalAlpha = 0.6;
      s.fillText('Inspired look · not affiliated  示意 · 非官方', 54 + zw + 42, 170);
      s.globalAlpha = 1;
      lines.forEach((l, i) => {
        s.fillStyle = LINE_COLORS[l];
        s.beginPath();
        s.arc(960 - i * 54, 128, 20, 0, Math.PI * 2);
        s.fill();
      });
      s.fillStyle = '#c8102e';
      s.fillRect(0, 238, 1024, 18);
    }
    this.signTex.needsUpdate = true;
    // --- strip map: generic line with dots, current station highlighted
    const mc = this.mapTex.image as HTMLCanvasElement;
    const m = mc.getContext('2d');
    if (m) {
      m.fillStyle = '#f7f8fa';
      m.fillRect(0, 0, 1024, 160);
      m.fillStyle = '#c8102e';
      m.fillRect(0, 0, 1024, 10);
      m.fillRect(0, 150, 1024, 10);
      const stops: LevelLike[] = [...neighbours];
      if (!stops.some((x) => x.stationEn === level.stationEn)) stops.splice(Math.floor(stops.length / 2), 0, level);
      const n = Math.max(2, stops.length);
      const x0 = 90;
      const x1 = 934;
      const y = 92;
      m.strokeStyle = col;
      m.lineWidth = 16;
      m.lineCap = 'round';
      m.beginPath();
      m.moveTo(40, y);
      m.lineTo(984, y);
      m.stroke();
      // direction chevrons
      m.fillStyle = col;
      for (const ax of [20, 1004]) {
        m.beginPath();
        const d = ax < 512 ? -1 : 1;
        m.moveTo(ax + d * 14, y);
        m.lineTo(ax - d * 6, y - 16);
        m.lineTo(ax - d * 6, y + 16);
        m.fill();
      }
      stops.forEach((st, i) => {
        const x = x0 + ((x1 - x0) * i) / (n - 1);
        const cur = st.stationEn === level.stationEn;
        const ls = linesFor(st.stationEn);
        m.fillStyle = '#ffffff';
        m.strokeStyle = cur ? '#c8102e' : '#30363f';
        m.lineWidth = cur ? 9 : 6;
        m.beginPath();
        m.arc(x, y, cur ? 22 : 15, 0, Math.PI * 2);
        m.fill();
        m.stroke();
        ls.slice(1).forEach((l, k) => {
          m.fillStyle = LINE_COLORS[l];
          m.beginPath();
          m.arc(x + 20 + k * 16, y + 26, 8, 0, Math.PI * 2);
          m.fill();
        });
        m.fillStyle = cur ? '#c8102e' : '#30363f';
        m.textAlign = 'center';
        m.textBaseline = 'alphabetic';
        m.font = `${cur ? 900 : 700} ${cur ? 30 : 26}px ${CJK}`;
        m.fillText(st.stationZh, x, 44);
        m.font = `600 ${cur ? 17 : 15}px ${CJK}`;
        m.fillText(st.stationEn, x, 62);
      });
    }
    this.mapTex.needsUpdate = true;
  }

  private buildCar(b: Batch): void {
    const C = TUNING.car;
    const M = this.mat;
    const len = C.backZ + 0.05 - DOOR_Z;
    const midZ = (C.backZ + 0.05 + DOOR_Z) / 2;

    // Floor: speckled grey with a slightly darker standing aisle.
    const floorTex = canvasTex(256, 256, (ctx) => {
      ctx.fillStyle = '#9aa0a8';
      ctx.fillRect(0, 0, 256, 256);
      speckle(ctx, 256, 256, 2600, ['#8a9098', '#aab0b8', '#7d838b', '#b6bcc3']);
    }, [3, 6]);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, len), new THREE.MeshLambertMaterial({ map: floorTex }));
    floor.position.set(0, -0.06, midZ);
    floor.receiveShadow = true;
    this.scene.add(floor);
    const aisle = new THREE.Mesh(
      new THREE.PlaneGeometry(2.3, len - 0.3),
      new THREE.MeshLambertMaterial({ color: 0x8c929a, transparent: true, opacity: 0.55, depthWrite: false }),
    );
    aisle.rotation.x = -Math.PI / 2;
    aisle.position.set(0, 0.004, midZ + 0.1);
    aisle.receiveShadow = true;
    this.scene.add(aisle);

    // Side + back walls (white), windows above the benches, red accent stripe.
    for (const sx of [-1, 1]) {
      b.box(M.wall, 0.12, 2.4, len, sx * 2.05, 1.1, midZ);
      b.box(M.red, 0.03, 0.07, len, sx * 1.985, 0.98, midZ);
      b.box(M.light, 0.16, 0.06, len - 0.2, sx * 1.97, 2.33, midZ);
      for (const cz of [-1.5, 0.5, 2.5]) {
        b.box(M.window, 0.02, 0.72, 1.25, sx * 1.985, 1.48, cz);
        b.box(M.wallGrey, 0.03, 0.06, 1.33, sx * 1.98, 1.87, cz);
        b.box(M.wallGrey, 0.03, 0.06, 1.33, sx * 1.98, 1.09, cz);
      }
    }
    // Back of the car: cut away to a low partition (like the ceiling) so it never
    // blocks the bottom of the view; the floor carries on into the gangway.
    b.box(M.wall, 4.2, 0.7, 0.12, 0, 0.35, C.backZ + 0.06);
    b.box(M.red, 4.2, 0.06, 0.14, 0, 0.72, C.backZ + 0.06);
    const gang = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 4), new THREE.MeshLambertMaterial({ color: 0x6f757d }));
    gang.position.set(0, -0.07, C.backZ + 2.1);
    this.scene.add(gang);
    for (const sx of [-1, 1]) {
      b.box(M.wall, 0.12, 0.7, 4, sx * 2.05, 0.35, C.backZ + 2.1);
      b.box(M.red, 0.14, 0.06, 4, sx * 2.05, 0.72, C.backZ + 2.1);
    }

    // End wall around the doorway (taller: carries the strip map) + red door frame.
    const sideW = 2.1 - C.doorHalf;
    for (const sx of [-1, 1]) b.box(M.wall, sideW, 2.75, 0.12, sx * (C.doorHalf + sideW / 2), 1.3, DOOR_Z + 0.02);
    b.box(M.wall, C.doorHalf * 2, 0.62, 0.12, 0, 2.44, DOOR_Z + 0.02);
    for (const sx of [-1, 1]) b.box(M.red, 0.1, 2.15, 0.08, sx * (C.doorHalf + 0.05), 1.07, DOOR_Z + 0.1);
    b.box(M.red, C.doorHalf * 2 + 0.2, 0.1, 0.08, 0, 2.15, DOOR_Z + 0.1);
    // Yellow edge line + steel threshold at the doorway.
    b.box(M.yellow, C.doorHalf * 2, 0.012, 0.1, 0, 0.006, DOOR_Z + 0.12);
    b.box(M.steel, C.doorHalf * 2, 0.02, 0.24, 0, 0.0, DOOR_Z - 0.06);

    // Stainless longitudinal benches (match physics boxes in sim/Sim.ts) with seat
    // contours, red end partitions (glass) and poles at every bench end.
    for (const sx of [-1, 1]) {
      for (const cz of [-1.5, 0.5, 2.5]) {
        b.box(M.wallGrey, 0.7, 0.36, 1.38, sx * 1.62, 0.18, cz);
        b.box(M.red, 0.02, 0.12, 1.38, sx * 1.265, 0.08, cz);
        b.box(M.steel, 0.8, 0.07, 1.4, sx * 1.59, 0.4, cz);
        for (const k of [-1, 1]) b.box(M.wallGrey, 0.74, 0.012, 0.025, sx * 1.6, 0.44, cz + k * 0.233);
        b.box(M.steel, 0.07, 0.5, 1.4, sx * 1.95, 0.72, cz, 0, 0, sx * -0.12);
        for (const ez of [-0.71, 0.71]) {
          const z = cz + ez;
          b.box(M.glass, 0.72, 1.05, 0.02, sx * 1.6, 1.0, z);
          b.box(M.red, 0.74, 0.05, 0.05, sx * 1.6, 1.54, z);
          b.add(M.steel, new THREE.CylinderGeometry(0.035, 0.035, 2.3, 10), sx * 1.24, 1.15, z);
        }
      }
    }
    // Physics grab pole in the aisle.
    b.add(M.steel, new THREE.CylinderGeometry(0.04, 0.04, 2.3, 12), 0.9, 1.15, 1.2);

    // Overhead rails with red grips.
    for (const sx of [-1, 1]) {
      const rail = new THREE.CylinderGeometry(0.025, 0.025, len - 0.6, 8);
      b.add(M.steel, rail, sx * 1.18, 2.05, midZ + 0.2, Math.PI / 2, 0, 0);
      for (let z = DOOR_Z + 0.9; z < C.backZ - 0.3; z += 0.75) {
        b.box(M.steel, 0.015, 0.16, 0.015, sx * 1.18, 1.96, z);
        b.add(M.red, new THREE.TorusGeometry(0.055, 0.016, 4, 3), sx * 1.18, 1.84, z, 0, Math.PI / 2, Math.PI / 2);
      }
    }
  }

  /** Dark tunnel + neighbouring track either side of the car (fills wide screens). */
  private buildTunnel(b: Batch): void {
    const M = this.mat;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), new THREE.MeshLambertMaterial({ color: 0x1a1e25 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.62, 9);
    this.scene.add(ground);
    const sleeper = new THREE.MeshLambertMaterial({ color: 0x2c2722 });
    for (const sx of [-1, 1]) {
      const cx = sx * 3.6;
      for (const rx of [-0.5, 0.5]) b.box(M.steel, 0.07, 0.08, 22, cx + rx, -0.5, 9);
      for (let z = DOOR_Z + 0.4; z < 20; z += 0.6) b.box(sleeper, 1.5, 0.06, 0.18, cx, -0.57, z);
      b.box(M.dark, 0.3, 4, 22, sx * 6.2, 1.2, 9);
      for (let z = DOOR_Z + 1.5; z < 20; z += 2.6) b.box(M.light, 0.06, 0.12, 0.9, sx * 6.03, 1.6, z);
      b.box(M.yellow, 0.05, 0.05, 22, sx * 6.03, 0.4, 9);
    }
  }

  private buildPlatform(b: Batch): void {
    const C = TUNING.car;
    const M = this.mat;
    const depth = C.platformDepth + 1.5;
    const tile = canvasTex(256, 256, (ctx) => {
      ctx.fillStyle = '#b9b4aa';
      ctx.fillRect(0, 0, 256, 256);
      speckle(ctx, 256, 256, 900, ['#aaa59b', '#c6c1b7']);
      ctx.strokeStyle = '#8f8a80';
      ctx.lineWidth = 3;
      for (let i = 0; i <= 256; i += 64) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 256);
        ctx.moveTo(0, i);
        ctx.lineTo(256, i);
        ctx.stroke();
      }
    }, [4, 2.5]);
    const plat = new THREE.Mesh(new THREE.BoxGeometry(C.platformHalfWidth * 2 + 3, 0.12, depth), new THREE.MeshLambertMaterial({ map: tile }));
    plat.position.set(0, -0.07, DOOR_Z - depth / 2);
    plat.receiveShadow = true;
    this.scene.add(plat);
    // Yellow tactile safety line.
    const tactile = canvasTex(64, 32, (ctx) => {
      ctx.fillStyle = '#f2c230';
      ctx.fillRect(0, 0, 64, 32);
      ctx.fillStyle = '#d9a91c';
      for (let x = 4; x < 64; x += 10) for (let y = 4; y < 32; y += 10) ctx.fillRect(x, y, 5, 5);
    }, [24, 1]);
    const line = new THREE.Mesh(new THREE.BoxGeometry(C.platformHalfWidth * 2 + 3, 0.02, 0.3), new THREE.MeshLambertMaterial({ map: tactile }));
    line.position.set(0, 0.0, DOOR_Z - 0.5);
    this.scene.add(line);

    // Platform screen doors: glass panels + steel posts + dark header with amber LED.
    const pz = DOOR_Z - 0.24;
    const open = 0.95;
    const outer = C.platformHalfWidth + 1.5;
    for (const sx of [-1, 1]) {
      const w = outer - open;
      b.box(M.glass, w, 1.95, 0.03, sx * (open + w / 2), 1.0, pz);
      for (let x = open; x <= outer + 0.01; x += 1.1) b.box(M.steel, 0.07, 2.05, 0.08, sx * x, 1.02, pz);
      b.box(M.red, w, 0.05, 0.035, sx * (open + w / 2), 1.05, pz + 0.01);
    }
    b.box(M.dark, outer * 2, 0.3, 0.16, 0, 2.15, pz);
    b.box(M.yellow, 0.5, 0.06, 0.02, 0, 2.15, pz + 0.09);

    // Back wall: white tiles with a red band, red/white chequered pillars, navy sign frame.
    const backZ = DOOR_Z - C.platformDepth - 0.05;
    const wallTex = canvasTex(128, 128, (ctx) => {
      ctx.fillStyle = '#eef0f2';
      ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = '#c9cdd2';
      ctx.lineWidth = 2;
      for (let i = 0; i <= 128; i += 32) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 128);
        ctx.moveTo(0, i);
        ctx.lineTo(128, i);
        ctx.stroke();
      }
    }, [14, 3]);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(12, 3.2), new THREE.MeshLambertMaterial({ map: wallTex }));
    wall.position.set(0, 1.5, backZ);
    this.scene.add(wall);
    b.box(M.red, 12, 0.22, 0.04, 0, 0.75, backZ + 0.02);
    b.box(M.navy, 3.36, 0.96, 0.08, 0, 2.0, backZ + 0.03);
    const checker = canvasTex(64, 64, (ctx) => {
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          ctx.fillStyle = (x + y) % 2 ? '#f4f4f2' : '#c8102e';
          ctx.fillRect(x * 16, y * 16, 16, 16);
        }
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 64; i += 16) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 64);
        ctx.moveTo(0, i);
        ctx.lineTo(64, i);
        ctx.stroke();
      }
    }, [1.5, 4.5]);
    const pillarMat = new THREE.MeshLambertMaterial({ map: checker });
    for (const sx of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.75, 3.2, 0.5), pillarMat);
      p.position.set(sx * 2.35, 1.5, backZ - 0.05);
      this.scene.add(p);
      // Outer pillars beyond the platform edge, nearer the car.
      const q = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3.2, 0.6), pillarMat);
      q.position.set(sx * (C.platformHalfWidth + 0.55), 1.5, DOOR_Z - 1.9);
      this.scene.add(q);
    }
  }

  private makeDoorLeaf(side: number): THREE.Object3D {
    const g = new THREE.Group();
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.1, 0.08), this.mat.wallGrey);
    panel.position.y = 1.05;
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.085), this.mat.window);
    win.position.set(0, 1.42, 0);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.1, 0.09), new THREE.MeshLambertMaterial({ color: 0x30363f }));
    edge.position.set(side * 0.45, 1.05, 0);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.07, 0.09), this.mat.red);
    band.position.y = 0.85;
    g.add(panel, win, edge, band);
    return g;
  }

  private makePsdLeaf(): THREE.Object3D {
    const g = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.95, 0.03), this.mat.glass);
    glass.position.y = 1.0;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 0.05), this.mat.steel);
    frame.position.y = 0.05;
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.05, 0.04), this.mat.red);
    band.position.y = 1.05;
    g.add(glass, frame, band);
    return g;
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
    this.psdL.position.x = -(0.475 + 0.95 * this.doorOpen);
    this.psdR.position.x = 0.475 + 0.95 * this.doorOpen;

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
