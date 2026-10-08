import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Agent } from './sim/CrowdSim';

/**
 * v0.3 chunky chibi characters (style target: art-src/concept_characters.jpg).
 *
 * Every look is built once from low-poly primitives into ONE merged, vertex-
 * coloured BufferGeometry (feet at y = 0, facing +Z). The crowd draws each look
 * as a single InstancedMesh with a shared flat-shaded Lambert material, so 80
 * passengers cost ~15 draw calls instead of hundreds.
 */

type V3 = [number, number, number];
type HairStyle = 'spiky' | 'short' | 'bun' | 'long' | 'messy' | 'pigtails';

interface Spec {
  skin: number;
  hair: number;
  style: HairStyle;
  shirt: number;
  sleeves: 'short' | 'long' | 'none';
  pants: number;
  shorts?: boolean;
  shoes: number;
  /** Body width multiplier. */
  bw?: number;
  /** Head scale (kids have bigger heads). */
  head?: number;
  hood?: boolean;
  phone?: boolean;
  lanyard?: boolean;
  belt?: boolean;
  cap?: number;
  hat?: number;
  camera?: boolean;
  brows?: 'angry' | 'firm' | 'sad';
  mouth?: 'smile' | 'frown' | 'tongue' | 'flat' | 'shout';
  stubble?: boolean;
  collar?: number;
  /** Open jacket colour (torso + sleeves) over `inner`. */
  jacket?: number;
  inner?: number;
  dress?: number;
  armUp?: boolean;
  belly?: boolean;
  blush?: boolean;
  bigEyes?: boolean;
  /** Also build an inflated outline shell (player glow). */
  outline?: boolean;
  /** Crouched / squatting pose — lowers torso & shortens legs. */
  crouch?: boolean;
  /** Sitting on a bench — hips on the cushion, knees forward into the aisle. */
  sit?: boolean;
  /** 大聲公: right hand holds a phone to the ear (bent arm). */
  phoneEar?: boolean;
  /** Mage: folded umbrella wand. */
  umbrella?: boolean;
  /** Mage: floating element orb colour. */
  orb?: number;
  /** Gear L: LED visor colour across the forehead. */
  visor?: number;
  /** Gear L: backpack colour (antenna + coiled cable). */
  pack?: number;
  /** Gear L: thick-soled sneakers. */
  chunky?: boolean;
  /** Gear L: thigh pockets on shorts. */
  cargo?: boolean;
  /** Gear L: hood shell around the back of the head. */
  bigHood?: boolean;
}

const Y = new THREE.Vector3(0, 1, 0);
const OUTLINE_T = 0.024;

class Builder {
  readonly parts: THREE.BufferGeometry[] = [];
  readonly shell: THREE.BufferGeometry[] = [];
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private c = new THREE.Color();

  add(
    geo: THREE.BufferGeometry,
    color: number,
    pos: V3 = [0, 0, 0],
    rot: V3 | THREE.Quaternion = [0, 0, 0],
    scale: V3 = [1, 1, 1],
    outline = false,
  ): void {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    geo.dispose();
    g.deleteAttribute('uv');
    if (rot instanceof THREE.Quaternion) this.q.copy(rot);
    else this.q.setFromEuler(this.e.set(rot[0], rot[1], rot[2]));
    this.m.compose(new THREE.Vector3(...pos), this.q, new THREE.Vector3(...scale));
    if (outline) {
      // Inflate around the part's own centre by a constant world thickness.
      const o = g.clone();
      o.computeBoundingBox();
      const bb = o.boundingBox!;
      const ctr = bb.getCenter(new THREE.Vector3());
      const sz = bb.getSize(new THREE.Vector3());
      const f = (s: number, k: number) => (s * k + 2 * OUTLINE_T) / Math.max(1e-4, s * k);
      o.translate(-ctr.x, -ctr.y, -ctr.z);
      o.scale(f(sz.x, scale[0]), f(sz.y, scale[1]), f(sz.z, scale[2]));
      o.translate(ctr.x, ctr.y, ctr.z);
      o.applyMatrix4(this.m);
      o.deleteAttribute('normal');
      this.shell.push(o);
    }
    g.applyMatrix4(this.m);
    this.c.setHex(color); // sRGB hex → linear working colour
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      col[i * 3] = this.c.r;
      col[i * 3 + 1] = this.c.g;
      col[i * 3 + 2] = this.c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.parts.push(g);
  }

  /** Box hanging from a pivot (top of the box at the pivot), rotated about it. */
  limb(len: number, w: number, d: number, color: number, pivot: V3, rot: V3, start = 0, outline = false): void {
    const g = new THREE.BoxGeometry(w, len, d);
    g.translate(0, -len / 2 - start, 0);
    this.add(g, color, pivot, rot, [1, 1, 1], outline);
  }

  build(): THREE.BufferGeometry {
    const g = mergeGeometries(this.parts, false)!;
    this.parts.forEach((p) => p.dispose());
    g.computeBoundingSphere();
    return g;
  }

  buildShell(): THREE.BufferGeometry | null {
    if (!this.shell.length) return null;
    const g = mergeGeometries(this.shell, false)!;
    this.shell.forEach((p) => p.dispose());
    g.computeVertexNormals();
    return g;
  }
}

const shade = (hex: number, k: number): number => {
  const c = new THREE.Color(hex);
  c.r = Math.min(1, c.r * k);
  c.g = Math.min(1, c.g * k);
  c.b = Math.min(1, c.b * k);
  return c.getHex();
};

const INK = 0x1c1c22;

function pointOnPivot(pivot: V3, rot: V3, down: number): V3 {
  const v = new THREE.Vector3(0, -down, 0).applyEuler(new THREE.Euler(...rot));
  return [pivot[0] + v.x, pivot[1] + v.y, pivot[2] + v.z];
}

function buildCharacter(s: Spec): { geo: THREE.BufferGeometry; shell: THREE.BufferGeometry | null } {
  const b = new Builder();
  const O = !!s.outline;
  const bw = s.bw ?? 1;
  const hs = s.head ?? 1;
  const sit = !!s.sit;
  const crouch = !!s.crouch;
  const low = sit || crouch;
  const TW = 0.32 * bw * (crouch ? 1.12 : sit ? 1.08 : 1);
  const TD = 0.21 * (crouch ? 1.15 : sit ? 1.12 : 1);
  const R = 0.215 * hs;
  // Squatting / sitting: hips low, head lower — reads from the ¾ camera.
  const HY = (sit ? 0.8 : crouch ? 0.72 : 0.99) + (hs - 1) * 0.12;

  // ---- legs + shoes
  for (const sx of [-1, 1]) {
    const x = sx * 0.075 * bw * (crouch ? 1.25 : sit ? 1.15 : 1);
    if (sit) {
      // Thighs along +Z, shins down: knees stick into the aisle in front of the cushion.
      b.add(new THREE.BoxGeometry(0.13, 0.11, 0.28), s.pants, [x, 0.18, 0.16], [0.85, 0, 0], undefined, O);
      b.add(new THREE.BoxGeometry(0.11, 0.16, 0.11), s.skin, [x, 0.09, 0.3], [-0.3, 0, 0], undefined, O);
    } else if (crouch) {
      // Folded thighs + shins (knees forward) for a clear squat silhouette.
      b.add(new THREE.BoxGeometry(0.14, 0.12, 0.22), s.pants, [x, 0.22, 0.06], [0.55, 0, 0], undefined, O);
      b.add(new THREE.BoxGeometry(0.11, 0.16, 0.12), s.skin, [x, 0.1, 0.12], [-0.35, 0, 0], undefined, O);
    } else if (s.dress) {
      b.add(new THREE.BoxGeometry(0.1, 0.3, 0.11), s.skin, [x, 0.2, 0], undefined, undefined, O);
    } else if (s.shorts) {
      b.add(new THREE.BoxGeometry(0.125, 0.14, 0.14), s.pants, [x, 0.305, 0], undefined, undefined, O);
      b.add(new THREE.BoxGeometry(0.1, 0.22, 0.11), s.skin, [x, 0.15, 0], undefined, undefined, O);
    } else {
      b.add(new THREE.BoxGeometry(0.118, 0.34, 0.135), s.pants, [x, 0.205, 0], undefined, undefined, O);
    }
    const shoeZ = sit ? 0.34 : crouch ? 0.1 : 0.028;
    if (s.chunky) {
      b.add(new THREE.BoxGeometry(0.16, 0.1, 0.24), s.shoes, [x, 0.05, shoeZ], undefined, undefined, O);
      b.add(new THREE.BoxGeometry(0.168, 0.032, 0.25), 0xffb03a, [x, 0.016, shoeZ]);
    } else {
      b.add(new THREE.BoxGeometry(0.13, 0.068, 0.2), s.shoes, [x, 0.034, shoeZ], undefined, undefined, O);
      b.add(new THREE.BoxGeometry(0.132, 0.02, 0.205), shade(s.shoes, 1.6), [x, 0.008, shoeZ]);
    }
  }
  if (s.cargo) {
    for (const sx of [-1, 1]) {
      const x = sx * (0.075 * bw + 0.055);
      b.add(new THREE.BoxGeometry(0.07, 0.08, 0.05), shade(s.pants, 0.82), [x, 0.28, 0.06], undefined, undefined, O);
      b.add(new THREE.BoxGeometry(0.074, 0.016, 0.052), shade(s.pants, 1.2), [x, 0.318, 0.062]);
    }
  }
  // hips
  b.add(new THREE.BoxGeometry(TW * 0.94, 0.09, TD * 0.95), s.dress ? s.dress : s.pants, [0, sit ? 0.3 : crouch ? 0.28 : 0.385, sit ? 0.02 : crouch ? 0.04 : 0], undefined, undefined, O);

  // ---- torso (slightly tapered square prism)
  const torsoCol = s.jacket ?? s.dress ?? s.shirt;
  const tor = new THREE.CylinderGeometry(0.5, 0.46, 1, 4, 1);
  tor.rotateY(Math.PI / 4);
  b.add(tor, torsoCol, [0, sit ? 0.48 : crouch ? 0.42 : 0.57, sit || crouch ? 0.02 : 0], [0, 0, 0], [TW * 1.414, sit || crouch ? 0.32 : 0.4, TD * 1.414], O);
  if (s.belly) {
    b.add(new THREE.IcosahedronGeometry(0.15, 1), s.shirt, [0, 0.5, 0.06], undefined, [1.15 * bw, 1, 0.75], O);
  }
  if (s.dress) {
    b.add(new THREE.CylinderGeometry(0.13, 0.22, 0.22, 7), s.dress, [0, 0.33, 0], undefined, undefined, O);
    b.add(new THREE.BoxGeometry(TW * 1.02, 0.12, TD * 1.02), s.shirt, [0, 0.72, 0]);
  }
  if (s.jacket && s.inner) {
    b.add(new THREE.BoxGeometry(TW * 0.36, 0.38, 0.02), s.inner, [0, 0.57, TD / 2 + 0.004]);
  }
  if (s.belt) b.add(new THREE.BoxGeometry(TW * 1.0, 0.035, TD * 1.02), 0x222226, [0, 0.39, 0]);
  if (s.collar !== undefined) {
    const cy = sit ? 0.58 : 0.77;
    b.add(new THREE.BoxGeometry(TW * 0.62, 0.045, 0.06), s.collar, [0, cy, 0.075], [0.35, 0, 0]);
    b.add(new THREE.BoxGeometry(0.035, 0.12, 0.012), s.collar, [0, cy - 0.07, TD / 2 + 0.006]);
  }
  if (s.hood) {
    const hy = sit ? 0.58 : 0.76;
    b.add(new THREE.BoxGeometry(TW * 0.8, 0.13, 0.1), shade(torsoCol, 0.85), [0, hy, -TD / 2 - 0.02], [-0.3, 0, 0]);
    for (const sx of [-1, 1]) b.add(new THREE.BoxGeometry(0.014, 0.12, 0.012), 0xf2f2f2, [sx * 0.045, hy - 0.09, TD / 2 + 0.008]);
  }
  if (s.bigHood) {
    const hoodCol = shade(torsoCol, 0.78);
    // Hood stays behind the skull. A forward shell plus the gold outline hid the face
    // on the ¾ card, so these pieces are not outlined.
    b.add(new THREE.BoxGeometry(R * 2.05, R * 1.05, R * 0.36), hoodCol, [0, HY - 0.01, -R * 1.02]);
    b.add(new THREE.BoxGeometry(R * 1.9, R * 0.28, R * 0.95), hoodCol, [0, HY + R * 0.72, -R * 0.55]);
    for (const sx of [-1, 1]) {
      b.add(new THREE.BoxGeometry(R * 0.28, R * 0.85, R * 0.62), hoodCol, [sx * R * 0.98, HY - 0.02, -R * 0.62]);
    }
    b.add(new THREE.BoxGeometry(TW * 0.55, 0.11, 0.045), shade(torsoCol, 0.9), [0, crouch ? 0.4 : 0.5, TD / 2 + 0.02]);
  }

  // Mage: folded umbrella wand (forward +Z) + shoulder orb.
  if (s.umbrella) {
    const shaft = 0x5e35b1;
    const tip = s.orb ?? 0xce93d8;
    b.add(new THREE.CylinderGeometry(0.018, 0.022, 0.55, 8), shaft, [0.22, 0.55, 0.28], [1.1, 0.2, 0], undefined, O);
    b.add(new THREE.CylinderGeometry(0.055, 0.022, 0.09, 8), tip, [0.28, 0.78, 0.42], [1.1, 0.2, 0], undefined, O);
    b.add(new THREE.BoxGeometry(0.12, 0.04, 0.12), 0x311b92, [0.16, 0.38, 0.18], undefined, undefined, O);
  }
  if (s.orb !== undefined) {
    b.add(new THREE.OctahedronGeometry(0.07, 0), s.orb, [-0.28, 0.95, -0.05], undefined, undefined, O);
  }
  if (s.lanyard) {
    for (const sx of [-1, 1]) b.add(new THREE.BoxGeometry(0.018, 0.2, 0.012), 0x1e3a8a, [sx * 0.05, 0.665, TD / 2 + 0.008], [0, 0, sx * 0.38]);
    b.add(new THREE.BoxGeometry(0.08, 0.1, 0.014), 0xffffff, [0, 0.535, TD / 2 + 0.012]);
    b.add(new THREE.BoxGeometry(0.05, 0.022, 0.016), 0x2f6fdc, [0, 0.565, TD / 2 + 0.014]);
  }
  if (s.camera) {
    b.add(new THREE.BoxGeometry(0.02, 0.36, 0.012), 0x2b2b2b, [0.02, 0.62, TD / 2 + 0.008], [0, 0, 0.62]);
    b.add(new THREE.BoxGeometry(0.13, 0.085, 0.06), 0x262629, [-0.02, 0.56, TD / 2 + 0.03]);
    const lens = new THREE.CylinderGeometry(0.03, 0.03, 0.04, 8);
    lens.rotateX(Math.PI / 2);
    b.add(lens, 0x4a4f57, [-0.02, 0.555, TD / 2 + 0.075]);
  }
  // Gear L: backpack sits on the back (−Z). Antenna and cable sit on the character's right (+X)
  // so the ¾ portrait (camera on +X) still shows them.
  if (s.pack !== undefined) {
    const P = s.pack;
    const pz = -(TD / 2 + 0.12);
    const py = crouch ? 0.48 : 0.62;
    b.add(new THREE.BoxGeometry(0.3, 0.38, 0.16), P, [0, py, pz], undefined, undefined, O);
    b.add(new THREE.BoxGeometry(0.28, 0.045, 0.15), shade(P, 1.28), [0, py + 0.19, pz]);
    b.add(new THREE.BoxGeometry(0.08, 0.12, 0.05), shade(P, 0.72), [0.14, py - 0.02, pz + 0.01]);
    b.add(new THREE.CylinderGeometry(0.012, 0.015, 0.36, 5), 0xb0bec5, [0.07, py + 0.38, pz]);
    b.add(new THREE.BoxGeometry(0.046, 0.046, 0.046), s.visor ?? 0x39ff8a, [0.07, py + 0.58, pz]);
    const coil = new THREE.TorusGeometry(0.048, 0.013, 4, 8);
    coil.rotateY(Math.PI / 2);
    b.add(coil, 0xffb03a, [0.16, py + 0.02, pz + 0.02]);
    b.add(new THREE.BoxGeometry(0.022, 0.022, 0.12), 0xffb03a, [0.16, py - 0.05, pz + 0.1]);
  }

  // ---- arms + hands
  const longCol = s.jacket ?? s.shirt;
  for (const sx of [-1, 1]) {
    const pivot: V3 = [sx * (TW / 2 + 0.05), low ? 0.55 : 0.75, sit ? 0.04 : crouch ? 0.08 : 0];
    let rot: V3 = sit ? [0.35, 0, sx * 0.2] : crouch ? [1.05, 0, sx * 0.35] : [0, 0, sx * 0.12];
    const phoneHand = s.phone && sx === 1;
    if (phoneHand) rot = [-1.15, 0, 0.28];
    if (s.phoneEar && sx === 1) {
      // Bent arm: upper arm out to the side, forearm up so the hand + phone sit at the ear.
      const upRot: V3 = [0, 0, 1.25];
      const UL = 0.16;
      const sleeveCol = s.sleeves === 'long' ? longCol : s.shirt;
      b.limb(UL, 0.112, 0.122, sleeveCol, pivot, upRot, 0, O);
      const elbow = pointOnPivot(pivot, upRot, UL);
      const ear: V3 = [R * 1.02 + 0.05, HY - 0.02, 0.02];
      const ddx = ear[0] - elbow[0];
      const ddy = ear[1] - elbow[1];
      const FL = Math.hypot(ddx, ddy) - 0.04;
      const foreRot: V3 = [0, 0, Math.atan2(ddx, -ddy)];
      b.limb(FL, 0.09, 0.1, s.sleeves === 'long' ? longCol : s.skin, elbow, foreRot, 0, O);
      const hp = pointOnPivot(elbow, foreRot, FL + 0.02);
      b.add(new THREE.BoxGeometry(0.085, 0.085, 0.085), s.skin, hp, foreRot, undefined, O);
      // Phone pressed to the ear (thin in X, tall in Y).
      b.add(new THREE.BoxGeometry(0.04, 0.18, 0.09), 0x202024, [R * 0.98 + 0.03, HY - 0.01, 0.03], [0, 0, 0.12]);
      b.add(new THREE.BoxGeometry(0.01, 0.15, 0.072), 0x7fe3ff, [R * 0.98 + 0.053, HY - 0.008, 0.03], [0, 0, 0.12]);
      continue;
    }
    if (s.armUp && sx === 1) rot = [0.15, 0, 2.55];
    const L = 0.34;
    if (s.sleeves === 'long') {
      b.limb(L, 0.1, 0.11, longCol, pivot, rot, 0, O);
    } else if (s.sleeves === 'short') {
      b.limb(0.14, 0.112, 0.122, s.shirt, pivot, rot, 0, O);
      b.limb(L - 0.14, 0.088, 0.098, s.skin, pivot, rot, 0.14, O);
    } else {
      b.limb(L, 0.092, 0.1, s.skin, pivot, rot, 0, O);
    }
    const hp = pointOnPivot(pivot, rot, L + 0.035);
    const hand = s.armUp && sx === 1 ? 0.1 : 0.085;
    b.add(new THREE.BoxGeometry(hand, hand, hand), s.skin, hp, rot, undefined, O);
    if (phoneHand) {
      const pp: V3 = [hp[0] - 0.02, hp[1] + 0.05, hp[2] + 0.02];
      b.add(new THREE.BoxGeometry(0.08, 0.135, 0.018), 0x202024, pp, [-0.55, 0, 0]);
      b.add(new THREE.BoxGeometry(0.066, 0.115, 0.006), 0x9fdcff, [pp[0], pp[1] + 0.006, pp[2] - 0.012], [-0.55, 0, 0]);
    }
  }

  // ---- head
  b.add(new THREE.IcosahedronGeometry(R, 1), s.skin, [0, HY, 0], undefined, [1, 0.94, 0.92], O);
  const zOn = (x: number, y: number): number => {
    const u = x / R;
    const v = (y - HY) / (0.94 * R);
    return 0.92 * R * Math.sqrt(Math.max(0.05, 1 - u * u - v * v));
  };
  // ears
  for (const sx of [-1, 1]) b.add(new THREE.BoxGeometry(0.04, 0.07, 0.05), shade(s.skin, 0.93), [sx * R * 0.98, HY - 0.01, -0.01]);

  // face
  const ew = s.bigEyes ? 0.056 : 0.048;
  const eh = s.bigEyes ? 0.082 : 0.068;
  const ex = 0.074 * hs;
  const ey = HY - 0.005;
  for (const sx of [-1, 1]) {
    const x = sx * ex;
    const z = zOn(x, ey);
    b.add(new THREE.BoxGeometry(ew, eh, 0.03), INK, [x, ey, z]);
    b.add(new THREE.BoxGeometry(0.018, 0.018, 0.012), 0xffffff, [x + 0.012, ey + 0.018, z + 0.016]);
    if (s.brows) {
      const tilt = s.brows === 'angry' ? 0.45 : s.brows === 'firm' ? 0.22 : -0.35;
      const by = HY + 0.068 * hs;
      b.add(new THREE.BoxGeometry(0.072, 0.022, 0.024), s.brows === 'angry' ? INK : shade(s.hair, 0.9), [x, by, zOn(x, by) + 0.004], [0, 0, sx * tilt]);
    }
    if (s.blush) {
      const bx = sx * 0.112 * hs;
      const byy = HY - 0.045;
      b.add(new THREE.BoxGeometry(0.046, 0.022, 0.01), 0xf28b9a, [bx, byy, zOn(bx, byy) + 0.002]);
    }
  }
  const my = HY - 0.088 * hs;
  const mz = zOn(0, my);
  switch (s.mouth ?? 'smile') {
    case 'smile':
      for (const sx of [-1, 1]) b.add(new THREE.BoxGeometry(0.04, 0.016, 0.02), 0x7a2a2a, [sx * 0.017, my, mz], [0, 0, sx * 0.35]);
      break;
    case 'frown':
      for (const sx of [-1, 1]) b.add(new THREE.BoxGeometry(0.044, 0.018, 0.02), 0x5a1a1a, [sx * 0.019, my, mz], [0, 0, -sx * 0.4]);
      break;
    case 'shout':
      // Wide-open shouting mouth (dark) with a red tongue.
      b.add(new THREE.BoxGeometry(0.085, 0.07, 0.022), 0x3a1010, [0, my - 0.008, mz]);
      b.add(new THREE.BoxGeometry(0.06, 0.024, 0.024), 0xd84a5a, [0, my - 0.03, mz + 0.004]);
      break;
    case 'tongue':
      b.add(new THREE.BoxGeometry(0.08, 0.05, 0.02), 0x5a1a1a, [0, my, mz]);
      b.add(new THREE.BoxGeometry(0.05, 0.06, 0.024), 0xff6f8f, [0, my - 0.03, mz + 0.012]);
      break;
    default:
      b.add(new THREE.BoxGeometry(0.06, 0.016, 0.02), 0x6a2424, [0, my, mz]);
  }
  if (s.stubble) b.add(new THREE.BoxGeometry(0.25 * hs, 0.09, 0.06), shade(s.skin, 0.78), [0, HY - 0.105 * hs, mz - 0.035]);

  // ---- hair
  const H = s.hair;
  // Head is an ellipsoid, radii (R, 0.94R, 0.92R), peak at 0.94R. Brows sit near 0.32R.
  // Each band is sized to the widest slice in that band (its bottom), so the crown
  // is inside the hair instead of showing a skin ring from the high camera.
  const crownBands = (color: number): void => {
    const bands: { y0: number; y1: number; k: number; front: number; back: number; side: number }[] = [
      { y0: 0.34, y1: 0.72, k: 1, front: 1.08, back: 1.26, side: 1.13 },
      { y0: 0.58, y1: 0.88, k: 1.16, front: 1.12, back: 1.16, side: 1.13 },
      { y0: 0.74, y1: 1.08, k: 1.42, front: 1.16, back: 1.16, side: 1.16 },
    ];
    for (const band of bands) {
      const v = band.y0 / 0.94;
      const wide = Math.sqrt(Math.max(0, 1 - v * v));
      const xHalf = R * wide * band.side;
      const zFront = 0.92 * R * wide * band.front;
      const zBack = 0.92 * R * wide * band.back;
      b.add(
        new THREE.BoxGeometry(xHalf * 2, (band.y1 - band.y0) * R, zFront + zBack),
        shade(color, band.k),
        [0, HY + ((band.y0 + band.y1) / 2) * R, (zFront - zBack) / 2],
        undefined,
        undefined,
        O,
      );
    }
  };
  const nape = (): void => {
    b.add(new THREE.BoxGeometry(R * 1.65, R * 0.7, R * 0.46), H, [0, HY - 0.005, -R * 0.78], undefined, undefined, O);
  };
  const sideburns = (): void => {
    for (const sx of [-1, 1]) {
      b.add(new THREE.BoxGeometry(R * 0.42, R * 0.5, R * 1.0), H, [sx * R * 0.8, HY + R * 0.1, -R * 0.12], undefined, undefined, O);
    }
  };
  const fringe = (): void => {
    b.add(new THREE.BoxGeometry(R * 1.45, R * 0.22, R * 0.55), shade(H, 1.05), [0, HY + R * 0.52, R * 0.72], [-0.7, 0, 0]);
  };
  const spikes = (n: number, seed: number): void => {
    let r = seed;
    const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < n; i++) {
      const az = (i / n) * Math.PI * 2 + rnd() * 0.5;
      const el = 0.35 + rnd() * 0.75;
      const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el) - 0.35).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(Y, dir);
      const p = dir.clone().multiplyScalar(R * 0.98);
      b.add(new THREE.ConeGeometry(0.06 * hs, 0.16 * hs, 4), H, [p.x, HY + p.y, p.z], q);
    }
  };
  if (s.cap !== undefined) {
    crownBands(s.cap);
    // Brim tips down toward +Z. +rotX sends the front of a bar forward and down.
    b.add(new THREE.BoxGeometry(R * 1.9, 0.03, R * 0.7), s.cap, [0, HY + R * 0.46, R * 0.78], [0.22, 0, 0], undefined, O);
    nape();
    sideburns();
  } else if (s.hat !== undefined) {
    // The hat crown is the seal. Hair only shows at the nape and temples.
    crownBands(s.hat);
    const hatCol = s.hat;
    b.add(new THREE.BoxGeometry(R * 2.55, 0.04, R * 2.4), hatCol, [0, HY + R * 0.38, 0], [-0.06, 0, 0], undefined, O);
    b.add(new THREE.BoxGeometry(R * 1.5, 0.04, R * 1.35), shade(hatCol, 0.78), [0, HY + R * 0.55, -0.01]);
    nape();
    sideburns();
  } else {
    crownBands(H);
    nape();
    sideburns();
    switch (s.style) {
      case 'spiky':
        fringe();
        spikes(7, 11);
        break;
      case 'messy':
        spikes(10, 5);
        break;
      case 'bun':
        fringe();
        b.add(new THREE.IcosahedronGeometry(0.1 * hs, 1), H, [0, HY + R * 0.95, -R * 0.55], undefined, undefined, O);
        break;
      case 'long':
        fringe();
        // Soft purple sheets (no dark icosahedrons — those read as black blobs from iso cam)
        for (const sx of [-1, 1]) {
          b.add(new THREE.BoxGeometry(0.12 * hs, 0.38 * hs, 0.14 * hs), H, [sx * R * 0.95, HY - 0.12, -0.08], [0.15, 0, sx * 0.2], undefined, O);
          b.add(new THREE.BoxGeometry(0.1 * hs, 0.28 * hs, 0.12 * hs), shade(H, 1.15), [sx * R * 1.05, HY - 0.22, -0.02], [0.25, 0, sx * 0.15], undefined, O);
        }
        b.add(new THREE.BoxGeometry(R * 1.4, 0.22 * hs, R * 0.7), H, [0, HY - 0.08, -R * 0.85], undefined, undefined, O);
        break;
      case 'pigtails':
        fringe();
        for (const sx of [-1, 1]) {
          b.add(new THREE.IcosahedronGeometry(0.075 * hs, 1), H, [sx * R * 1.1, HY - 0.04, -0.05], undefined, undefined, O);
          b.add(new THREE.BoxGeometry(0.04, 0.04, 0.04), 0xe8475f, [sx * R * 1.02, HY + 0.02, -0.03]);
        }
        break;
      default:
        fringe();
    }
  }
  if (s.visor !== undefined) {
    const vy = HY + R * 0.04;
    const vz = zOn(0, vy) + 0.03;
    // Brow tips forward (+rotX sends the top of the bar toward +Z).
    const tilt: V3 = [0.35, 0, 0];
    b.add(new THREE.BoxGeometry(R * 1.75, R * 0.34, 0.03), 0x121418, [0, vy, vz], tilt);
    b.add(new THREE.BoxGeometry(R * 1.45, R * 0.16, 0.016), s.visor, [0, vy, vz + 0.018], tilt);
    for (const sx of [-1, 1]) {
      b.add(new THREE.BoxGeometry(0.034, 0.02, 0.01), 0xf4fff8, [sx * R * 0.38, vy, vz + 0.026], tilt);
    }
  }
  return { geo: b.build(), shell: b.buildShell() };
}

// ------------------------------------------------------------------ looks

export type Look =
  | 'normal0'
  | 'normal1'
  | 'normal2'
  | 'normal3'
  | 'normal4'
  | 'normal5'
  | 'seat0'
  | 'seat1'
  | 'seat2'
  | 'seat3'
  | 'seat4'
  | 'seat5'
  | 'stench'
  | 'family'
  | 'familySit'
  | 'kidGirl'
  | 'kidGirlSit'
  | 'kidBoy'
  | 'kidBoySit'
  | 'brat'
  | 'coupleF'
  | 'coupleM'
  | 'angry'
  | 'luggage'
  | 'squat'
  | 'squatWalk'
  | 'loud';

const SKIN = 0xf2c6a0;
const DARK_HAIR = 0x2a2830;

const SPECS: Record<Look | 'hero' | 'mage' | 'tech', Spec> = {
  hero: { skin: SKIN, hair: DARK_HAIR, style: 'spiky', shirt: 0x2f6fdc, sleeves: 'short', pants: 0x1f2d5c, shoes: 0x18181b, lanyard: true, belt: true, brows: 'firm', mouth: 'flat', outline: true },
  // Mage 「凱婷」: purple hooded cardigan, star clip, umbrella wand, violet outline.
  mage: { skin: 0xf2c6a0, hair: 0x5e35b1, style: 'long', shirt: 0x7e57c2, jacket: 0x5e35b1, inner: 0xce93d8, sleeves: 'long', pants: 0x2d1b4e, shoes: 0x1a1028, hood: true, blush: true, brows: 'firm', mouth: 'smile', outline: true, umbrella: true, orb: 0xe1bee7, bw: 0.95 },
  // Gear L 「裝備L」: oversized hoodie, LED visor, antenna backpack, cargo shorts, chunky sneakers.
  tech: { skin: SKIN, hair: 0x1a1814, style: 'short', shirt: 0x152028, jacket: 0x243044, inner: 0x102028, sleeves: 'long', pants: 0x3e4a3a, shorts: true, shoes: 0xf4f4f6, hood: true, bigHood: true, cargo: true, chunky: true, visor: 0x39ff8a, pack: 0x1a2228, brows: 'firm', mouth: 'flat', outline: true, bw: 1.08 },
  // Commuters: several hoodie / shirt colourways so the crowd isn't uniform.
  normal0: { skin: SKIN, hair: DARK_HAIR, style: 'spiky', shirt: 0x8d939c, sleeves: 'long', pants: 0x2a2c31, shoes: 0xe8e8e8, hood: true, phone: true, mouth: 'flat' },
  normal1: { skin: 0xeab98f, hair: 0x4a3426, style: 'short', shirt: 0x34466e, sleeves: 'long', pants: 0x3d5a80, shoes: 0x2a2a2a, hood: true, phone: true, mouth: 'flat' },
  normal2: { skin: SKIN, hair: DARK_HAIR, style: 'short', shirt: 0xe9ecef, sleeves: 'long', pants: 0x3b3f46, shoes: 0x2a1e18, collar: 0xffffff, mouth: 'flat', brows: 'sad' },
  normal3: { skin: 0xf3cba8, hair: 0x3d2d24, style: 'long', shirt: 0x5e7d62, sleeves: 'long', pants: 0x9c8b6e, shoes: 0xf0f0f0, hood: true, phone: true },
  normal4: { skin: SKIN, hair: 0x5a3e2e, style: 'bun', shirt: 0xd2b48c, sleeves: 'long', pants: 0x26262b, shoes: 0x26262b, phone: true, mouth: 'flat' },
  normal5: { skin: 0xe2ad84, hair: DARK_HAIR, style: 'short', shirt: 0x34363d, sleeves: 'short', pants: 0x4a5568, shoes: 0xf2f2f2, phone: true, mouth: 'flat' },
  seat0: { skin: SKIN, hair: DARK_HAIR, style: 'spiky', shirt: 0x8d939c, sleeves: 'long', pants: 0x2a2c31, shoes: 0xe8e8e8, hood: true, phone: true, mouth: 'flat', sit: true },
  seat1: { skin: 0xeab98f, hair: 0x4a3426, style: 'short', shirt: 0x34466e, sleeves: 'long', pants: 0x3d5a80, shoes: 0x2a2a2a, hood: true, phone: true, mouth: 'flat', sit: true },
  seat2: { skin: SKIN, hair: DARK_HAIR, style: 'short', shirt: 0xe9ecef, sleeves: 'long', pants: 0x3b3f46, shoes: 0x2a1e18, collar: 0xffffff, mouth: 'flat', brows: 'sad', sit: true },
  seat3: { skin: 0xf3cba8, hair: 0x3d2d24, style: 'long', shirt: 0x5e7d62, sleeves: 'long', pants: 0x9c8b6e, shoes: 0xf0f0f0, hood: true, phone: true, sit: true },
  seat4: { skin: SKIN, hair: 0x5a3e2e, style: 'bun', shirt: 0xd2b48c, sleeves: 'long', pants: 0x26262b, shoes: 0x26262b, phone: true, mouth: 'flat', sit: true },
  seat5: { skin: 0xe2ad84, hair: DARK_HAIR, style: 'short', shirt: 0x34363d, sleeves: 'short', pants: 0x4a5568, shoes: 0xf2f2f2, phone: true, mouth: 'flat', sit: true },
  stench: { skin: 0xc9a76b, hair: 0x3a302a, style: 'messy', shirt: 0xd9c84a, sleeves: 'none', pants: 0x6b7a3e, shorts: true, shoes: 0x7a5230, belly: true, stubble: true, brows: 'sad', mouth: 'frown', bw: 1.08 },
  family: { skin: 0xf3c9a4, hair: 0x5a3825, style: 'bun', shirt: 0xf3ead8, jacket: 0xe0732d, inner: 0xf3ead8, sleeves: 'long', pants: 0x5a4030, shoes: 0xd56a2a, blush: true },
  familySit: { skin: 0xf3c9a4, hair: 0x5a3825, style: 'bun', shirt: 0xf3ead8, jacket: 0xe0732d, inner: 0xf3ead8, sleeves: 'long', pants: 0x5a4030, shoes: 0xd56a2a, blush: true, sit: true },
  kidGirl: { skin: 0xf6cfaa, hair: 0x4a2c1d, style: 'pigtails', shirt: 0xf2c94c, dress: 0xd8552f, sleeves: 'short', pants: 0xd8552f, shoes: 0xd8552f, head: 1.18, blush: true, bigEyes: true },
  kidGirlSit: { skin: 0xf6cfaa, hair: 0x4a2c1d, style: 'pigtails', shirt: 0xf2c94c, dress: 0xd8552f, sleeves: 'short', pants: 0xd8552f, shoes: 0xd8552f, head: 1.18, blush: true, bigEyes: true, sit: true },
  kidBoy: { skin: 0xf6cfaa, hair: 0x4a2c1d, style: 'short', shirt: 0xe8752e, sleeves: 'long', pants: 0x6b4a32, shorts: true, shoes: 0xf08a3c, hood: true, head: 1.18, blush: true, bigEyes: true },
  kidBoySit: { skin: 0xf6cfaa, hair: 0x4a2c1d, style: 'short', shirt: 0xe8752e, sleeves: 'long', pants: 0x6b4a32, shorts: true, shoes: 0xf08a3c, hood: true, head: 1.18, blush: true, bigEyes: true, sit: true },
  brat: { skin: 0xf6cfaa, hair: 0x3a2a20, style: 'short', cap: 0xf06aa8, shirt: 0xf37ab8, sleeves: 'short', pants: 0x7c4fd0, shorts: true, shoes: 0xf06aa8, mouth: 'tongue', armUp: true, head: 1.12, bigEyes: true },
  coupleF: { skin: 0xf2c5a0, hair: 0x6e1d45, style: 'long', shirt: 0xc8307f, sleeves: 'long', pants: 0x2b2f3a, shoes: 0xc8307f, blush: true },
  coupleM: { skin: 0xeebd96, hair: 0x6e1d45, style: 'short', shirt: 0xc8307f, sleeves: 'short', pants: 0x2d3d63, shoes: 0xc8307f, blush: true },
  angry: { skin: 0xe7a07c, hair: DARK_HAIR, style: 'short', shirt: 0xd32f2f, sleeves: 'short', pants: 0x2b2b2e, shoes: 0x1a1a1a, collar: 0xb71c1c, bw: 1.14, brows: 'angry', mouth: 'frown', belt: true },
  luggage: { skin: 0xf0c49c, hair: 0x3a302a, style: 'short', hat: 0xcfae7a, shirt: 0x26a69a, sleeves: 'short', pants: 0xc2a878, shorts: true, shoes: 0x7a5230, camera: true },
  squat: { skin: SKIN, hair: DARK_HAIR, style: 'short', shirt: 0x5c6bc0, sleeves: 'short', pants: 0x37474f, shoes: 0x263238, crouch: true, bw: 1.1, brows: 'firm', mouth: 'flat', phone: true },
  squatWalk: { skin: SKIN, hair: DARK_HAIR, style: 'short', shirt: 0x5c6bc0, sleeves: 'short', pants: 0x37474f, shoes: 0x263238, bw: 1.1, brows: 'firm', mouth: 'flat', phone: true },
  loud: { skin: 0xeab48c, hair: 0x2a2026, style: 'short', shirt: 0xf39c12, sleeves: 'short', pants: 0x3e3a4a, shoes: 0xf5f5f5, collar: 0xd35400, bw: 1.06, brows: 'firm', mouth: 'shout', phoneEar: true },
};

export const LOOKS = Object.keys(SPECS).filter((k) => k !== 'hero' && k !== 'mage' && k !== 'tech') as Look[];
const NORMALS: Look[] = ['normal0', 'normal1', 'normal2', 'normal3', 'normal4', 'normal5'];
const SEATS: Look[] = ['seat0', 'seat1', 'seat2', 'seat3', 'seat4', 'seat5'];

/** Which look an agent wears (deterministic per agent id). */
export function lookFor(a: Pick<Agent, 'id' | 'kind' | 'isKid' | 'seated' | 'planted' | 'boss'>): Look {
  if (a.kind === 'squat') return a.boss || a.planted ? 'squat' : 'squatWalk';
  if (a.seated && a.kind === 'family') {
    if (!a.isKid) return 'familySit';
    return a.id % 2 ? 'kidGirlSit' : 'kidBoySit';
  }
  if (a.seated) return SEATS[(a.id * 7 + 3) % SEATS.length];
  switch (a.kind) {
    case 'normal':
      return NORMALS[(a.id * 7 + 3) % NORMALS.length];
    case 'family':
      return a.isKid ? (a.id % 2 ? 'kidGirl' : 'kidBoy') : 'family';
    case 'couple':
      return a.id % 2 ? 'coupleF' : 'coupleM';
    default:
      return a.kind;
  }
}

const cache = new Map<string, { geo: THREE.BufferGeometry; shell: THREE.BufferGeometry | null }>();

function get(look: Look | 'hero' | 'mage' | 'tech') {
  let c = cache.get(look);
  if (!c) {
    c = buildCharacter(SPECS[look]);
    cache.set(look, c);
  }
  return c;
}

export function lookGeometry(look: Look): THREE.BufferGeometry {
  return get(look).geo;
}

export function heroGeometry(): THREE.BufferGeometry {
  return get('hero').geo;
}

export function heroShellGeometry(): THREE.BufferGeometry {
  return get('hero').shell!;
}

export function mageGeometry(): THREE.BufferGeometry {
  return get('mage').geo;
}

export function mageShellGeometry(): THREE.BufferGeometry {
  return get('mage').shell!;
}

export function techGeometry(): THREE.BufferGeometry {
  return get('tech').geo;
}

export function techShellGeometry(): THREE.BufferGeometry {
  return get('tech').shell!;
}

/** Player look key for CharacterId. */
export function playerLookGeo(skin: 'hero' | 'mage' | 'tech'): { geo: THREE.BufferGeometry; shell: THREE.BufferGeometry } {
  if (skin === 'mage') return { geo: mageGeometry(), shell: mageShellGeometry() };
  if (skin === 'tech') return { geo: techGeometry(), shell: techShellGeometry() };
  return { geo: heroGeometry(), shell: heroShellGeometry() };
}

/** Shared flat-shaded vertex-colour material for every crowd look. */
export const CHAR_MAT = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

let suitcaseGeo: THREE.BufferGeometry | null = null;

/** Big brown rolling suitcase (+Z points away from the owner; handle on the owner side). */
export function suitcaseGeometry(): THREE.BufferGeometry {
  if (suitcaseGeo) return suitcaseGeo;
  const b = new Builder();
  const C = 0x6b4a3a;
  b.add(new THREE.BoxGeometry(0.3, 0.5, 0.38), C, [0, 0.31, 0]);
  for (const sx of [-1, 1]) {
    b.add(new THREE.BoxGeometry(0.04, 0.46, 0.39), shade(C, 0.72), [sx * 0.07, 0.31, 0]);
    b.add(new THREE.BoxGeometry(0.31, 0.04, 0.05), 0x3a2a22, [0, 0.31 + sx * 0.23, sx * 0.17]);
  }
  for (const sx of [-1, 1]) b.add(new THREE.BoxGeometry(0.022, 0.32, 0.022), 0xa0a4aa, [sx * 0.08, 0.7, -0.15]);
  b.add(new THREE.BoxGeometry(0.2, 0.035, 0.04), 0x2a2a2e, [0, 0.86, -0.15]);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const w = new THREE.CylinderGeometry(0.035, 0.035, 0.03, 8);
      w.rotateZ(Math.PI / 2);
      b.add(w, 0x1e1e22, [sx * 0.11, 0.035, sz * 0.15]);
    }
  }
  suitcaseGeo = b.build();
  return suitcaseGeo;
}
