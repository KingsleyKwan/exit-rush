import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  CAR_Z_MAX,
  CAR_Z_MIN,
  DOOR_BAYS,
  DOOR_Z,
  PLAYER_START_X,
  PLAYER_START_Z,
  TUNING,
  doorWallX,
} from './sim/tuning';
import { LINE_COLORS, linesFor } from './lines';
import type { LevelDef } from './levels';
import { themeFor, shade, fontStack, type StationTheme } from './stationThemes';
import { loadGameFonts, fontsReady } from './fonts';

/** HCR accent red (original; not any real operator brand) */
export const HCR_RED = 0xb01c2e;
export const HCR_SILVER = 0xc5ccd3;
export const HCR_FLOOR = 0x3a3f46;

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

const CJK_FALLBACK = "'PingFang HK','Noto Sans HK','Noto Sans CJK HK','Microsoft JhengHei',system-ui,sans-serif";

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
 * v0.4.1 HCR-inspired car + platform (original art, no logos): white/light-grey
 * interior with red accents, stainless longitudinal benches between side doors,
 * poles + overhead rails with red grips. Sliding exits sit on the LEFT (−X)
 * long wall (platform side); car ends are gangways only. Camera is a ¾ view
 * from the far (+X) side so the door wall reads on portrait phones.
 * Plus the juicy camera rig (critically-damped follow, trauma shake, kicks, FOV punch).
 */
export class TrainScene {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly doorGroup = new THREE.Group();
  private doorBays: {
    z: number;
    leafNeg: THREE.Object3D;
    leafPos: THREE.Object3D;
    psdNeg: THREE.Object3D;
    psdPos: THREE.Object3D;
    open: boolean;
    exitZone: THREE.Mesh;
    stripMat: THREE.MeshStandardMaterial;
    lampMats: THREE.MeshStandardMaterial[];
    closedSign: THREE.Mesh;
    closedFloor: THREE.Mesh;
    guide: THREE.Object3D;
    /** Seconds left to flash closed-bay lights (player push feedback). */
    flashT: number;
  }[] = [];
  private doorOpen = 0;
  private targetOpen = 1;
  private openBayZs: number[] = [...DOOR_BAYS];
  private exitMat: THREE.MeshBasicMaterial;
  private closedSignMat: THREE.MeshBasicMaterial | null = null;
  private guideMat: THREE.MeshBasicMaterial | null = null;
  private guideGeo: THREE.BufferGeometry | null = null;
  private closedFloorMat: THREE.MeshBasicMaterial | null = null;
  private warn = 0;
  private dirLight: THREE.DirectionalLight;
  private signTex: THREE.CanvasTexture;
  private mapTex: THREE.CanvasTexture;
  private stationKey = '';
  private pillarMat: THREE.MeshLambertMaterial | null = null;
  private wallMat: THREE.MeshLambertMaterial | null = null;
  private bandMat: THREE.MeshLambertMaterial | null = null;
  private theme: StationTheme = themeFor('Central');
  private announceUntil = 0;
  private fontsPromise: Promise<void>;
  private lastLevel: LevelLike = { id: 0, stationEn: 'Exit Rush', stationZh: '逼落車' };
  private lastNeighbours: LevelLike[] = [];

  private camPos = new THREE.Vector3(5.8, 7.2, 2.4);
  private camVel = new THREE.Vector3();
  private look = new THREE.Vector3(-1.2, 0.5, 0.8);
  private lookVel = new THREE.Vector3();
  private kick = new THREE.Vector3();
  private kickVel = new THREE.Vector3();
  private trauma = 0;
  private fovKick = 0;
  private fovExtra = 0;
  private baseFov = 55;
  private tmp = new THREE.Vector3();
  private time = 0;

  private mat = {
    wall: new THREE.MeshLambertMaterial({ color: 0xf1f3f5 }),
    wallGrey: new THREE.MeshLambertMaterial({ color: 0xd5dae0 }),
    red: new THREE.MeshLambertMaterial({ color: HCR_RED }),
    steel: new THREE.MeshPhongMaterial({ color: HCR_SILVER, specular: 0x9aa3ad, shininess: 70 }),
    glass: new THREE.MeshLambertMaterial({ color: 0xa9d2e6, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
    window: new THREE.MeshLambertMaterial({ color: 0x1d2631 }),
    yellow: new THREE.MeshLambertMaterial({ color: 0xf2c230 }),
    light: new THREE.MeshBasicMaterial({ color: 0xfdfcf6 }),
    dark: new THREE.MeshLambertMaterial({ color: 0x2b3038 }),
    navy: new THREE.MeshLambertMaterial({ color: 0x1b2a4e }),
  };

  constructor(aspect: number) {
    this.scene.background = new THREE.Color(0x141820);
    this.scene.fog = new THREE.Fog(0x141820, 12, 28);

    this.camera = new THREE.PerspectiveCamera(this.baseFov, aspect, 0.1, 50);
    this.fitAspect(aspect);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.look);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x5a6270, 1.15);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xfff8ee, 1.05);
    dir.position.set(5, 9, 2);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    const sc = dir.shadow.camera;
    sc.left = -8;
    sc.right = 8;
    sc.top = 8;
    sc.bottom = -8;
    sc.near = 1;
    sc.far = 24;
    this.scene.add(dir);
    this.dirLight = dir;

    this.signTex = canvasTex(1024, 256, () => undefined);
    this.mapTex = canvasTex(1024, 160, () => undefined);
    this.fontsPromise = loadGameFonts();
    this.exitMat = new THREE.MeshBasicMaterial({ color: 0x66ff99, transparent: true, opacity: 0.25, depthWrite: false });

    const batch = new Batch();
    this.buildCar(batch);
    this.buildTunnel(batch);
    this.buildPlatform(batch);
    const M = this.mat;
    batch.flush(this.scene, new Set<THREE.Material>([M.steel, M.red, M.wallGrey]), new Set<THREE.Material>([M.wall, M.steel, M.yellow, M.wallGrey]));

    this.buildSideDoors();
    this.setOpenBays([...DOOR_BAYS]);

    const wall = doorWallX();
    const map = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 0.4), new THREE.MeshBasicMaterial({ map: this.mapTex }));
    map.rotation.y = Math.PI / 2;
    map.position.set(wall + 0.08, 2.48, 0);
    this.scene.add(map);

    const C = TUNING.car;
    const backX = wall - C.platformDepth - 0.05;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshBasicMaterial({ map: this.signTex, fog: false }));
    sign.rotation.y = Math.PI / 2;
    sign.position.set(backX + 0.08, 2.0, 0);
    this.scene.add(sign);
    this.setStation({ id: 0, stationEn: 'Exit Rush', stationZh: '逼落車' });
  }

  /** Which side-door bays are open for the current level (visual + exit markers). */
  setOpenBays(bays: readonly number[]): void {
    this.openBayZs = [...bays];
    const open = new Set(bays);
    const wall = doorWallX();
    for (const d of this.doorBays) {
      d.open = open.has(d.z);
      // Closed bays keep leaves/PSD visibly shut (never hide them).
      d.leafNeg.visible = d.leafPos.visible = true;
      d.psdNeg.visible = d.psdPos.visible = true;
      d.exitZone.visible = d.open;
      d.closedSign.visible = !d.open;
      d.closedFloor.visible = !d.open;
      d.guide.visible = d.open;
      d.flashT = 0;
      if (!d.open) {
        d.leafNeg.position.set(wall - 0.04, 0, d.z - 0.48);
        d.leafPos.position.set(wall - 0.04, 0, d.z + 0.48);
        d.psdNeg.position.set(wall - 0.22, 0, d.z - 0.48);
        d.psdPos.position.set(wall - 0.22, 0, d.z + 0.48);
      }
    }
  }

  /** Flash a closed bay's red lights (player pushed into it). */
  flashClosedBay(bayZ: number, duration = 0.55): void {
    for (const d of this.doorBays) {
      if (!d.open && Math.abs(d.z - bayZ) < 0.05) d.flashT = Math.max(d.flashT, duration);
    }
  }

  private ensureDoorSharedMats(): void {
    if (!this.closedSignMat) {
      // Vertical stack: no-entry icon → 粵 → EN. No overlapping glyphs.
      const W = 512;
      const H = 480;
      const tex = canvasTex(W, H, (ctx) => {
        ctx.clearRect(0, 0, W, H);
        // High-contrast dark red panel
        ctx.fillStyle = '#140608';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#9a1424';
        ctx.fillRect(18, 18, W - 36, H - 36);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 10;
        ctx.strokeRect(28, 28, W - 56, H - 56);

        // No-entry circle + X (top, own band)
        const cx = W / 2;
        const cy = 118;
        const r = 62;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 14;
        ctx.strokeStyle = '#c81020';
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, r - 18, 0, Math.PI * 2);
        ctx.strokeStyle = '#c81020';
        ctx.lineWidth = 10;
        ctx.stroke();
        ctx.strokeStyle = '#c81020';
        ctx.lineWidth = 16;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - 32, cy - 32);
        ctx.lineTo(cx + 32, cy + 32);
        ctx.moveTo(cx + 32, cy - 32);
        ctx.lineTo(cx - 32, cy + 32);
        ctx.stroke();

        // Chinese — large, below icon, clear of X
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = "bold 72px 'Noto Sans HK', 'PingFang HK', 'Microsoft JhengHei', system-ui, sans-serif";
        ctx.fillText('此門不開', cx, 268);

        // English — readable size, below Chinese
        ctx.font = 'bold 40px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#ffe8e8';
        ctx.fillText('Door not in use', cx, 360);
      });
      tex.needsUpdate = true;
      this.closedSignMat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
    }
    if (!this.guideMat) {
      this.guideMat = new THREE.MeshBasicMaterial({ color: 0x3dff8a, transparent: true, opacity: 0.92, depthWrite: false });
    }
    if (!this.guideGeo) {
      this.guideGeo = new THREE.ConeGeometry(0.14, 0.32, 4);
    }
    if (!this.closedFloorMat) {
      this.closedFloorMat = new THREE.MeshBasicMaterial({
        color: 0xff3030,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      });
    }
  }

  private buildSideDoors(): void {
    this.ensureDoorSharedMats();
    const wall = doorWallX();
    const dh = TUNING.car.doorHalf;
    this.scene.add(this.doorGroup);
    const lampGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.05, 12);
    const stripGeo = new THREE.BoxGeometry(0.05, 0.06, dh * 2 + 0.2);
    const signGeo = new THREE.PlaneGeometry(1.45, 1.35);
    for (const bz of DOOR_BAYS) {
      const leafNeg = this.makeDoorLeaf(1);
      const leafPos = this.makeDoorLeaf(-1);
      leafNeg.rotation.y = Math.PI / 2;
      leafPos.rotation.y = Math.PI / 2;
      leafNeg.position.set(wall - 0.04, 0, bz);
      leafPos.position.set(wall - 0.04, 0, bz);
      this.doorGroup.add(leafNeg, leafPos);

      const psdNeg = this.makePsdLeaf();
      const psdPos = this.makePsdLeaf();
      psdNeg.rotation.y = Math.PI / 2;
      psdPos.rotation.y = Math.PI / 2;
      psdNeg.position.set(wall - 0.22, 0, bz);
      psdPos.position.set(wall - 0.22, 0, bz);
      this.scene.add(psdNeg, psdPos);

      const stripMat = new THREE.MeshStandardMaterial({ color: 0x1a8f4a, emissive: 0x22ee66, emissiveIntensity: 0.7 });
      const strip = new THREE.Mesh(stripGeo, stripMat);
      strip.position.set(wall + 0.1, 2.17, bz);
      this.scene.add(strip);
      const lampMats: THREE.MeshStandardMaterial[] = [];
      for (const sz of [-1, 1]) {
        const lampMat = new THREE.MeshStandardMaterial({ color: 0x145a32, emissive: 0x22ee66, emissiveIntensity: 0.55 });
        const lamp = new THREE.Mesh(lampGeo, lampMat);
        lamp.rotation.z = Math.PI / 2;
        lamp.position.set(wall + 0.12, 2.2, bz + sz * (dh + 0.12));
        this.scene.add(lamp);
        lampMats.push(lampMat);
      }

      const exit = new THREE.Mesh(new THREE.PlaneGeometry(TUNING.car.winDepth + 0.15, dh * 2 - 0.15), this.exitMat);
      exit.rotation.x = -Math.PI / 2;
      exit.position.set(wall - TUNING.car.winDepth / 2 - 0.05, 0.013, bz);
      this.scene.add(exit);

      // Closed-door glass decal (car-interior side, faces +X / camera).
      const closedSign = new THREE.Mesh(signGeo, this.closedSignMat!);
      closedSign.rotation.y = Math.PI / 2;
      closedSign.position.set(wall + 0.08, 1.45, bz);
      closedSign.visible = false;
      this.scene.add(closedSign);

      // Red floor no-entry glow under closed bays (phone-readable).
      const closedFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(TUNING.car.winDepth + 0.2, dh * 2 - 0.2),
        this.closedFloorMat!,
      );
      closedFloor.rotation.x = -Math.PI / 2;
      closedFloor.position.set(wall - TUNING.car.winDepth / 2 - 0.02, 0.014, bz);
      closedFloor.visible = false;
      this.scene.add(closedFloor);

      // Bobbing arrow above open bays (shared geo/mat).
      const guide = new THREE.Group();
      const tip = new THREE.Mesh(this.guideGeo!, this.guideMat!);
      tip.rotation.x = Math.PI; // point down
      tip.position.y = 0;
      guide.add(tip);
      guide.position.set(wall + 0.28, 2.4, bz);
      this.scene.add(guide);

      this.doorBays.push({
        z: bz,
        leafNeg,
        leafPos,
        psdNeg,
        psdPos,
        open: true,
        exitZone: exit,
        stripMat,
        lampMats,
        closedSign,
        closedFloor,
        guide,
        flashT: 0,
      });
    }
  }

  /** Redraw the platform sign + strip map for a level (EN + 中). */
  setStation(level: LevelLike, neighbours: LevelLike[] = []): void {
    const key = `${level.id}|${level.stationEn}`;
    if (key === this.stationKey && this.announceUntil <= 0) return;
    this.stationKey = key;
    this.lastLevel = level;
    this.lastNeighbours = neighbours;
    const theme = themeFor(level.stationEn);
    this.theme = theme;
    this.applyPlatformTheme(theme);
    const draw = () => this.drawStationArt(level, neighbours, theme);
    if (fontsReady()) draw();
    else void this.fontsPromise.then(draw);
  }

  /** JR-style next-station flash (JA + EN + 粵) on the platform sign. */
  flashAnnouncement(level: LevelLike, lang: 'en' | 'zh-HK'): void {
    this.announceUntil = this.time + 3.2;
    const theme = themeFor(level.stationEn);
    const draw = () => {
      const sc = this.signTex.image as HTMLCanvasElement;
      const s = sc.getContext('2d');
      if (!s) return;
      const font = fontStack(theme.lettering);
      s.fillStyle = '#0e1524';
      s.fillRect(0, 0, 1024, 256);
      s.fillStyle = theme.line;
      s.fillRect(0, 0, 1024, 14);
      s.fillRect(0, 242, 1024, 14);
      s.fillStyle = '#ffffff';
      s.textBaseline = 'middle';
      s.textAlign = 'left';
      // Calm JR-style Japanese line (parody station name)
      s.font = `600 28px ${CJK_FALLBACK}`;
      s.globalAlpha = 0.85;
      s.fillText(`まもなく、${level.stationZh}です。お出口は左側です。`, 48, 48);
      s.globalAlpha = 1;
      s.font = `900 84px ${font}, ${CJK_FALLBACK}`;
      s.fillText(level.stationZh, 48, 118);
      const zw = s.measureText(level.stationZh).width;
      s.font = `700 42px ${font}, ${CJK_FALLBACK}`;
      s.fillText(level.stationEn, 48 + zw + 28, 112);
      s.font = `600 26px ${CJK_FALLBACK}`;
      s.globalAlpha = 0.8;
      const en = `The next station is ${level.stationEn}.`;
      const zh = lang === 'en' ? en : `下一站，${level.stationZh}。請往左邊車門落車。`;
      s.fillText(lang === 'en' ? en : zh, 48, 178);
      if (lang !== 'en') {
        s.font = `500 22px ${CJK_FALLBACK}`;
        s.fillText(en, 48, 210);
      }
      s.globalAlpha = 1;
      s.fillStyle = theme.line;
      s.beginPath();
      s.arc(960, 128, 22, 0, Math.PI * 2);
      s.fill();
      this.signTex.needsUpdate = true;
    };
    if (fontsReady()) draw();
    else void this.fontsPromise.then(draw);
  }

  private applyPlatformTheme(theme: StationTheme): void {
    // Pillar checker in station wall colour + light tile.
    const light = shade(theme.wall, 1.25);
    const dark = theme.wall;
    const checker = canvasTex(64, 64, (ctx) => {
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          ctx.fillStyle = (x + y) % 2 ? light : dark;
          ctx.fillRect(x * 16, y * 16, 16, 16);
        }
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
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
    if (this.pillarMat) {
      const old = this.pillarMat.map;
      this.pillarMat.map = checker;
      this.pillarMat.needsUpdate = true;
      old?.dispose();
    }
    const wallTex = canvasTex(128, 128, (ctx) => {
      ctx.fillStyle = shade(theme.wall, 1.15);
      ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = shade(theme.wall, 0.85);
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
    if (this.wallMat) {
      const old = this.wallMat.map;
      this.wallMat.map = wallTex;
      this.wallMat.needsUpdate = true;
      old?.dispose();
    }
    if (this.bandMat) {
      this.bandMat.color.set(theme.accent);
      this.bandMat.needsUpdate = true;
    }
  }

  private drawStationArt(level: LevelLike, neighbours: LevelLike[], theme: StationTheme): void {
    const lines = linesFor(level.stationEn);
    const col = theme.line;
    const font = fontStack(theme.lettering);
    const sc = this.signTex.image as HTMLCanvasElement;
    const s = sc.getContext('2d');
    if (s) {
      s.fillStyle = '#1b2a4e';
      s.fillRect(0, 0, 1024, 256);
      s.fillStyle = col;
      s.fillRect(0, 0, 1024, 18);
      // Station-colour side stripe (signature wall colour)
      s.fillStyle = theme.wall;
      s.fillRect(0, 18, 28, 220);
      s.fillStyle = '#ffffff';
      s.textBaseline = 'middle';
      s.textAlign = 'left';
      s.font = `900 104px ${font}, ${CJK_FALLBACK}`;
      s.fillText(level.stationZh, 54, 118);
      const zw = s.measureText(level.stationZh).width;
      s.font = `700 60px ${font}, ${CJK_FALLBACK}`;
      s.fillText(level.stationEn, 54 + zw + 40, 104);
      s.font = `500 26px ${CJK_FALLBACK}`;
      s.globalAlpha = 0.6;
      s.fillText('香城鐵路 HCR · fiction · not affiliated', 54 + zw + 42, 170);
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
    // --- strip map
    const mc = this.mapTex.image as HTMLCanvasElement;
    const m = mc.getContext('2d');
    if (m) {
      m.fillStyle = '#f7f8fa';
      m.fillRect(0, 0, 1024, 160);
      m.fillStyle = col;
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
        const th = themeFor(st.stationEn);
        m.fillStyle = '#ffffff';
        m.strokeStyle = cur ? '#c8102e' : '#30363f';
        m.lineWidth = cur ? 9 : 6;
        m.beginPath();
        m.arc(x, y, cur ? 22 : 15, 0, Math.PI * 2);
        m.fill();
        m.stroke();
        // Station colour tick under the dot
        m.fillStyle = th.wall;
        m.fillRect(x - 10, y + 28, 20, 6);
        ls.slice(1).forEach((l, k) => {
          m.fillStyle = LINE_COLORS[l];
          m.beginPath();
          m.arc(x + 20 + k * 16, y + 26, 8, 0, Math.PI * 2);
          m.fill();
        });
        m.fillStyle = cur ? '#c8102e' : '#30363f';
        m.textAlign = 'center';
        m.textBaseline = 'alphabetic';
        const fnt = fontStack(th.lettering);
        m.font = `${cur ? 900 : 700} ${cur ? 30 : 26}px ${fnt}, ${CJK_FALLBACK}`;
        m.fillText(st.stationZh, x, 44);
        m.font = `600 ${cur ? 17 : 15}px ${CJK_FALLBACK}`;
        m.fillText(st.stationEn, x, 62);
      });
    }
    this.mapTex.needsUpdate = true;
  }

  private buildCar(b: Batch): void {
    const C = TUNING.car;
    const M = this.mat;
    const len = CAR_Z_MAX - CAR_Z_MIN;
    const midZ = (CAR_Z_MAX + CAR_Z_MIN) / 2;
    const wall = doorWallX();
    const dh = C.doorHalf;

    const floorTex = canvasTex(256, 256, (ctx) => {
      ctx.fillStyle = '#9aa0a8';
      ctx.fillRect(0, 0, 256, 256);
      speckle(ctx, 256, 256, 2600, ['#8a9098', '#aab0b8', '#7d838b', '#b6bcc3']);
    }, [3, 6]);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, len + 0.2), new THREE.MeshLambertMaterial({ map: floorTex }));
    floor.position.set(0, -0.06, midZ);
    floor.receiveShadow = true;
    this.scene.add(floor);
    const aisle = new THREE.Mesh(
      new THREE.PlaneGeometry(2.3, len - 0.4),
      new THREE.MeshLambertMaterial({ color: 0x8c929a, transparent: true, opacity: 0.55, depthWrite: false }),
    );
    aisle.rotation.x = -Math.PI / 2;
    aisle.position.set(0.15, 0.004, midZ);
    this.scene.add(aisle);

    b.box(M.wall, 0.12, 2.4, len, C.halfWidth + 0.06, 1.1, midZ);
    b.box(M.red, 0.03, 0.07, len, C.halfWidth - 0.02, 0.98, midZ);
    b.box(M.light, 0.16, 0.06, len - 0.2, C.halfWidth - 0.04, 2.33, midZ);
    for (const cz of [-2.6, 0, 2.6]) {
      b.box(M.window, 0.02, 0.72, 1.4, C.halfWidth - 0.02, 1.48, cz);
      b.box(M.wallGrey, 0.03, 0.06, 1.48, C.halfWidth - 0.03, 1.87, cz);
      b.box(M.wallGrey, 0.03, 0.06, 1.48, C.halfWidth - 0.03, 1.09, cz);
    }

    const bays = [...DOOR_BAYS];
    const segs: [number, number][] = [[CAR_Z_MIN, bays[0] - dh]];
    for (let i = 0; i < bays.length - 1; i++) segs.push([bays[i] + dh, bays[i + 1] - dh]);
    segs.push([bays[bays.length - 1] + dh, CAR_Z_MAX]);
    for (const [z0, z1] of segs) {
      const segLen = z1 - z0;
      if (segLen < 0.08) continue;
      const cz = (z0 + z1) / 2;
      b.box(M.wall, 0.12, 2.4, segLen, wall - 0.06, 1.1, cz);
      b.box(M.red, 0.03, 0.07, segLen, wall + 0.02, 0.98, cz);
      b.box(M.light, 0.16, 0.06, Math.max(0.1, segLen - 0.1), wall + 0.04, 2.33, cz);
    }
    for (const bz of bays) {
      b.box(M.wall, 0.12, 0.55, dh * 2, wall - 0.06, 2.35, bz);
      b.box(M.red, 0.08, 2.15, 0.1, wall + 0.05, 1.07, bz - dh - 0.05);
      b.box(M.red, 0.08, 2.15, 0.1, wall + 0.05, 1.07, bz + dh + 0.05);
      b.box(M.red, 0.08, 0.1, dh * 2 + 0.2, wall + 0.05, 2.15, bz);
      b.box(M.yellow, 0.1, 0.012, dh * 2, wall + 0.08, 0.006, bz);
      b.box(M.steel, 0.24, 0.02, dh * 2, wall - 0.02, 0.0, bz);
    }

    for (const ez of [CAR_Z_MIN, CAR_Z_MAX]) {
      const outward = ez < 0 ? -1 : 1;
      b.box(M.wall, 4.2, 0.7, 0.12, 0, 0.35, ez + outward * 0.06);
      b.box(M.red, 4.2, 0.06, 0.14, 0, 0.72, ez + outward * 0.06);
      const gang = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 3.2), new THREE.MeshLambertMaterial({ color: 0x6f757d }));
      gang.position.set(0, -0.07, ez + outward * 1.7);
      this.scene.add(gang);
    }

    // Benches: only between-bay wall segments (same rule as sim). Long fill, tiny margin.
    const BENCH_MARGIN = 0.06;
    const BENCH_FILL = 0.96;
    const betweenBaySegs: [number, number][] = [];
    for (let i = 0; i < bays.length - 1; i++) betweenBaySegs.push([bays[i] + dh, bays[i + 1] - dh]);
    const aislePoleZs: number[] = [];
    for (const sx of [-1, 1] as const) {
      for (const [z0, z1] of betweenBaySegs) {
        const avail = z1 - z0 - 2 * BENCH_MARGIN;
        if (avail < 0.5) continue;
        const len = avail * BENCH_FILL;
        const cz = (z0 + z1) / 2;
        if (sx === -1) aislePoleZs.push(cz);
        b.box(M.wallGrey, 0.7, 0.36, len, sx * 1.62, 0.18, cz);
        b.box(M.red, 0.02, 0.12, len, sx * 1.265, 0.08, cz);
        b.box(M.steel, 0.8, 0.07, len + 0.02, sx * 1.59, 0.4, cz);
        for (const k of [-1, 1]) b.box(M.wallGrey, 0.74, 0.012, 0.025, sx * 1.6, 0.44, cz + k * (len * 0.18));
        b.box(M.steel, 0.07, 0.5, len + 0.02, sx * 1.95, 0.72, cz, 0, 0, sx * -0.12);
        // Glass partitions near each end of the long bench (still inside segment).
        for (const ez of [-len * 0.48, len * 0.48]) {
          const z = cz + ez;
          b.box(M.glass, 0.72, 1.05, 0.02, sx * 1.6, 1.0, z);
          b.box(M.red, 0.74, 0.05, 0.05, sx * 1.6, 1.54, z);
          b.add(M.steel, new THREE.CylinderGeometry(0.035, 0.035, 2.3, 10), sx * 1.24, 1.15, z);
        }
      }
    }
    for (const pz of aislePoleZs.slice(0, 2)) {
      b.add(M.steel, new THREE.CylinderGeometry(0.04, 0.04, 2.3, 12), 0.35, 1.15, pz);
    }

    for (const sx of [-1, 1]) {
      const rail = new THREE.CylinderGeometry(0.025, 0.025, len - 0.8, 8);
      b.add(M.steel, rail, sx * 1.18, 2.05, midZ, Math.PI / 2, 0, 0);
      for (let z = CAR_Z_MIN + 0.7; z < CAR_Z_MAX - 0.5; z += 0.75) {
        b.box(M.steel, 0.015, 0.16, 0.015, sx * 1.18, 1.96, z);
        b.add(M.red, new THREE.TorusGeometry(0.055, 0.016, 4, 3), sx * 1.18, 1.84, z, 0, Math.PI / 2, Math.PI / 2);
      }
    }
  }

  private buildTunnel(b: Batch): void {
    const M = this.mat;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshLambertMaterial({ color: 0x1a1e25 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(2, -0.62, 0);
    this.scene.add(ground);
    const sleeper = new THREE.MeshLambertMaterial({ color: 0x2c2722 });
    const cx = 3.8;
    for (const rx of [-0.5, 0.5]) b.box(M.steel, 0.07, 0.08, 22, cx + rx, -0.5, 0);
    for (let z = CAR_Z_MIN - 2; z < CAR_Z_MAX + 8; z += 0.6) b.box(sleeper, 1.5, 0.06, 0.18, cx, -0.57, z);
    b.box(M.dark, 0.3, 4, 22, 6.4, 1.2, 0);
    for (let z = CAR_Z_MIN; z < CAR_Z_MAX + 6; z += 2.6) b.box(M.light, 0.06, 0.12, 0.9, 6.23, 1.6, z);
    b.box(M.yellow, 0.05, 0.05, 22, 6.23, 0.4, 0);
  }

  private buildPlatform(b: Batch): void {
    const C = TUNING.car;
    const M = this.mat;
    const wall = doorWallX();
    const depth = C.platformDepth + 1.2;
    const plen = C.platformHalfLen * 2 + 1;
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
    }, [2.5, 4]);
    const plat = new THREE.Mesh(new THREE.BoxGeometry(depth, 0.12, plen), new THREE.MeshLambertMaterial({ map: tile }));
    plat.position.set(wall - depth / 2, -0.07, 0);
    plat.receiveShadow = true;
    this.scene.add(plat);

    const tactile = canvasTex(64, 32, (ctx) => {
      ctx.fillStyle = '#f2c230';
      ctx.fillRect(0, 0, 64, 32);
      ctx.fillStyle = '#d9a91c';
      for (let x = 4; x < 64; x += 10) for (let y = 4; y < 32; y += 10) ctx.fillRect(x, y, 5, 5);
    }, [1, 24]);
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, plen), new THREE.MeshLambertMaterial({ map: tactile }));
    line.position.set(wall - 0.45, 0.0, 0);
    this.scene.add(line);

    const pz = wall - 0.22;
    const dh = C.doorHalf;
    const bays = [...DOOR_BAYS];
    const solidZs: [number, number][] = [[-C.platformHalfLen, bays[0] - dh]];
    for (let i = 0; i < bays.length - 1; i++) solidZs.push([bays[i] + dh, bays[i + 1] - dh]);
    solidZs.push([bays[bays.length - 1] + dh, C.platformHalfLen]);
    for (const [z0, z1] of solidZs) {
      const seg = z1 - z0;
      if (seg < 0.05) continue;
      const cz = (z0 + z1) / 2;
      b.box(M.glass, 0.03, 1.95, seg, pz, 1.0, cz);
      b.box(M.steel, 0.08, 2.05, 0.07, pz, 1.02, z0);
      b.box(M.red, 0.035, 0.05, seg, pz + 0.01, 1.05, cz);
    }
    b.box(M.dark, 0.16, 0.3, C.platformHalfLen * 2, pz, 2.15, 0);

    const backX = wall - C.platformDepth - 0.05;
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
    }, [3, 14]);
    this.wallMat = new THREE.MeshLambertMaterial({ map: wallTex });
    const pwall = new THREE.Mesh(new THREE.PlaneGeometry(plen, 3.2), this.wallMat);
    pwall.rotation.y = Math.PI / 2;
    pwall.position.set(backX, 1.5, 0);
    this.scene.add(pwall);
    this.bandMat = new THREE.MeshLambertMaterial({ color: 0xc8102e });
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, plen), this.bandMat);
    band.position.set(backX + 0.02, 0.75, 0);
    this.scene.add(band);
    b.box(M.navy, 0.08, 0.96, 3.36, backX + 0.03, 2.0, 0);
    const checker = canvasTex(64, 64, (ctx) => {
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          ctx.fillStyle = (x + y) % 2 ? '#f4f4f2' : '#c8102e';
          ctx.fillRect(x * 16, y * 16, 16, 16);
        }
      }
    }, [1.5, 4.5]);
    this.pillarMat = new THREE.MeshLambertMaterial({ map: checker });
    for (const sz of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.2, 0.75), this.pillarMat);
      p.position.set(backX - 0.05, 1.5, sz * 2.35);
      this.scene.add(p);
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

  setDoorsOpen(open: boolean): void {
    this.targetOpen = open ? 1 : 0;
  }

  setDoorOpenValue(v: number): void {
    this.targetOpen = v;
    this.doorOpen = v;
  }

  setWarning(u: number): void {
    this.warn = u;
  }

  update(dt: number): void {
    this.time += dt;
    if (this.announceUntil > 0 && this.time >= this.announceUntil) {
      this.announceUntil = 0;
      this.stationKey = '';
      this.setStation(this.lastLevel, this.lastNeighbours);
    }
    this.doorOpen += (this.targetOpen - this.doorOpen) * Math.min(1, dt * 6);
    const half = TUNING.car.doorHalf;
    const wall = doorWallX();
    const t = this.time;
    const warnFlash = this.warn > 0 && Math.sin(t * (2 + this.warn * 7) * Math.PI * 2) > 0;

    for (const d of this.doorBays) {
      if (d.flashT > 0) d.flashT = Math.max(0, d.flashT - dt);

      if (d.open) {
        // Leaves slide along ±Z away from the bay centre when open.
        d.leafNeg.position.set(wall - 0.04, 0, d.z - (0.48 + half * this.doorOpen));
        d.leafPos.position.set(wall - 0.04, 0, d.z + (0.48 + half * this.doorOpen));
        d.psdNeg.position.set(wall - 0.22, 0, d.z - (0.48 + 0.9 * this.doorOpen));
        d.psdPos.position.set(wall - 0.22, 0, d.z + (0.48 + 0.9 * this.doorOpen));
        d.guide.visible = true;
        d.guide.position.y = 2.4 + Math.sin(t * 3.6 + d.z) * 0.14;
        if (this.guideMat) this.guideMat.opacity = 0.75 + 0.2 * Math.sin(t * 4);

        if (this.warn > 0) {
          // Closing: flashing amber on open bays.
          const on = warnFlash;
          this.setBayLight(d, on ? 0xffa000 : 0xffcc44, on ? 2.0 : 0.55, on ? 0xff8800 : 0xffb000);
        } else {
          // Open & safe: green indicator.
          this.setBayLight(d, 0x22ee66, 0.85 + 0.15 * Math.sin(t * 2.5), 0x1a8f4a);
        }
      } else {
        // Stay shut.
        d.leafNeg.position.set(wall - 0.04, 0, d.z - 0.48);
        d.leafPos.position.set(wall - 0.04, 0, d.z + 0.48);
        d.psdNeg.position.set(wall - 0.22, 0, d.z - 0.48);
        d.psdPos.position.set(wall - 0.22, 0, d.z + 0.48);
        d.guide.visible = false;
        const pushFlash = d.flashT > 0 && Math.sin(t * 18) > 0;
        if (pushFlash) this.setBayLight(d, 0xff2020, 2.4, 0xff0000);
        else this.setBayLight(d, 0xff3030, 0.95, 0x661010);
        if (this.closedFloorMat) {
          this.closedFloorMat.opacity = pushFlash ? 0.55 : 0.28 + 0.1 * Math.sin(t * 2.2);
        }
      }
    }

    if (this.warn > 0) {
      this.exitMat.color.setHex(warnFlash ? 0xff5050 : 0xffcc33);
      this.exitMat.opacity = warnFlash ? 0.45 : 0.2;
    } else {
      this.exitMat.color.setHex(0x66ff99);
      this.exitMat.opacity = 0.22 + 0.14 * Math.sin(t * 3);
    }
  }

  private setBayLight(
    d: { stripMat: THREE.MeshStandardMaterial; lampMats: THREE.MeshStandardMaterial[] },
    emissive: number,
    intensity: number,
    color: number,
  ): void {
    d.stripMat.color.setHex(color);
    d.stripMat.emissive.setHex(emissive);
    d.stripMat.emissiveIntensity = intensity;
    for (const m of d.lampMats) {
      m.color.setHex(color);
      m.emissive.setHex(emissive);
      m.emissiveIntensity = intensity * 0.85;
    }
  }

  setShadows(on: boolean): void {
    this.dirLight.castShadow = on;
  }

  private fitAspect(aspect: number): void {
    this.baseFov = aspect < 0.7 ? 64 : 55;
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

  setFovExtra(a: number): void {
    this.fovExtra = a;
  }

  /** Critically-damped follow: from +X looking at the left door wall (−X). */
  follow(target: { x: number; z: number }, dt: number): void {
    const wall = doorWallX();
    // ¾ view along the car: elevated on the far side, framing doors on the left.
    const want = this.tmp.set(Math.max(target.x + 4.2, 3.6), 7.0, target.z + 1.5);
    const w = 5;
    this.camVel.addScaledVector(want.sub(this.camPos), w * w * dt).multiplyScalar(Math.max(0, 1 - 2 * w * dt));
    this.camPos.addScaledVector(this.camVel, dt);
    const lookWant = this.tmp.set(wall - 0.8, 0.45, target.z * 0.55);
    const wl = 7;
    this.lookVel.addScaledVector(lookWant.sub(this.look), wl * wl * dt).multiplyScalar(Math.max(0, 1 - 2 * wl * dt));
    this.look.addScaledVector(this.lookVel, dt);

    this.kickVel.addScaledVector(this.kick, -140 * dt).multiplyScalar(Math.exp(-12 * dt));
    this.kick.addScaledVector(this.kickVel, dt);

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
