/**
 * Offscreen Three.js portraits for the character-select cards.
 * Renders the real in-game voxel meshes (hero / mage) at a polished ¾ angle.
 */
import * as THREE from 'three';
import { heroGeometry, heroShellGeometry, mageGeometry, mageShellGeometry } from './characters';
import type { CharacterId } from './charactersDef';

const cache = new Map<CharacterId, string>();

function renderOnce(skin: 'hero' | 'mage', w = 256, h = 288): string {
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
  const bg = skin === 'mage' ? 0x1a1030 : 0x152238;
  scene.background = new THREE.Color(bg);

  const cam = new THREE.PerspectiveCamera(32, w / h, 0.1, 20);
  // ¾ view: slightly above and to the right, looking at mid-torso.
  cam.position.set(1.15, 1.55, 2.05);
  cam.lookAt(0, 0.72, 0);

  const hemi = new THREE.HemisphereLight(0xfff5e6, 0x2a3040, 1.15);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(2.2, 4.0, 2.5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(skin === 'mage' ? 0xb388ff : 0x5ad2ff, 0.55);
  fill.position.set(-2.0, 1.5, -1.0);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.35);
  rim.position.set(-1.5, 2.5, -2.5);
  scene.add(rim);

  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const geo = skin === 'mage' ? mageGeometry() : heroGeometry();
  const body = new THREE.Mesh(geo, mat);
  body.rotation.y = -0.55;
  scene.add(body);

  const shellMat = new THREE.MeshBasicMaterial({
    color: skin === 'mage' ? 0xb388ff : 0x5ad2ff,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.55,
  });
  const shell = new THREE.Mesh(skin === 'mage' ? mageShellGeometry() : heroShellGeometry(), shellMat);
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

/** Tech "coming soon" silhouette — no full kit art yet. */
function renderTechPlaceholder(w = 256, h = 288): string {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#1a2a1c');
  g.addColorStop(1, '#0d1410');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(67,160,71,0.25)';
  // Simple hooded silhouette
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.72, 48, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(120,160,120,0.45)';
  const rx = w / 2 - 36, ry = h * 0.38, rw = 72, rh = 90, rr = 12;
  ctx.beginPath();
  ctx.moveTo(rx + rr, ry);
  ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, rr);
  ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, rr);
  ctx.arcTo(rx, ry + rh, rx, ry, rr);
  ctx.arcTo(rx, ry, rx + rw, ry, rr);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.32, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,230,118,0.35)';
  ctx.fillRect(w / 2 - 28, h * 0.22, 56, 14);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = 'bold 28px system-ui,sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('?', w / 2, h * 0.55);
  return canvas.toDataURL('image/png');
}

/** Returns a data-URL PNG for the character card portrait (cached per session). */
export function charPortraitUrl(id: CharacterId): string {
  const hit = cache.get(id);
  if (hit) return hit;
  let url: string;
  try {
    if (id === 'tech') url = renderTechPlaceholder();
    else if (typeof document === 'undefined') url = '';
    else url = renderOnce(id === 'mage' ? 'mage' : 'hero');
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
