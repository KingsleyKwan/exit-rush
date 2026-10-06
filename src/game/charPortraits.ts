/**
 * Offscreen Three.js portraits for the character-select cards.
 * Renders the real in-game voxel meshes (hero / mage / tech) at a polished ¾ angle.
 */
import * as THREE from 'three';
import { playerLookGeo } from './characters';
import type { CharacterId } from './charactersDef';

const cache = new Map<CharacterId, string>();

const CARD: Record<CharacterId, { bg: number; tint: number }> = {
  hero: { bg: 0x152238, tint: 0x5ad2ff },
  mage: { bg: 0x1a1030, tint: 0xb388ff },
  tech: { bg: 0x1c160c, tint: 0xffb03a },
};

function renderOnce(skin: CharacterId, w = 256, h = 288): string {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const card = CARD[skin];
  scene.background = new THREE.Color(card.bg);

  const cam = new THREE.PerspectiveCamera(32, w / h, 0.1, 20);
  // ¾ view: slightly above and to the right, looking at mid-torso.
  cam.position.set(1.15, 1.55, 2.05);
  cam.lookAt(0, 0.72, 0);

  const hemi = new THREE.HemisphereLight(0xfff5e6, 0x2a3040, 1.15);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(2.2, 4.0, 2.5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(card.tint, 0.55);
  fill.position.set(-2.0, 1.5, -1.0);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.35);
  rim.position.set(-1.5, 2.5, -2.5);
  scene.add(rim);

  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const look = playerLookGeo(skin);
  const body = new THREE.Mesh(look.geo, mat);
  body.rotation.y = -0.55;
  scene.add(body);

  const shellMat = new THREE.MeshBasicMaterial({
    color: card.tint,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.55,
  });
  const shell = new THREE.Mesh(look.shell, shellMat);
  shell.rotation.y = -0.55;
  scene.add(shell);

  // Soft floor oval.
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 32),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.01;
  scene.add(floor);

  renderer.render(scene, cam);
  const url = canvas.toDataURL('image/png');

  // Dispose renderer only (geometries are shared caches in characters.ts).
  mat.dispose();
  shellMat.dispose();
  floor.geometry.dispose();
  (floor.material as THREE.Material).dispose();
  renderer.dispose();
  return url;
}

/** Returns a data-URL PNG for the character card portrait (cached per session). */
export function charPortraitUrl(id: CharacterId): string {
  const hit = cache.get(id);
  if (hit) return hit;
  let url: string;
  try {
    url = typeof document === 'undefined' ? '' : renderOnce(id);
  } catch {
    url = '';
  }
  cache.set(id, url);
  return url;
}

export function warmCharPortraits(): void {
  if (typeof document === 'undefined') return;
  charPortraitUrl('hero');
  charPortraitUrl('mage');
  charPortraitUrl('tech');
}
