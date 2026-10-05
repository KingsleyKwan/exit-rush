import * as THREE from 'three';
import { badgeSvg } from '../ui/icons';

/**
 * Canvas textures for the 3D floating type icons, rasterised from the same SVG
 * glyphs the UI uses (one consistent icon language). Loading is async; the
 * texture simply stays blank for the first frame or two.
 */
const cache = new Map<string, THREE.CanvasTexture>();

export function badgeTexture(kind: string): THREE.CanvasTexture {
  let tex = cache.get(kind);
  if (tex) return tex;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 2;
  const img = new Image();
  img.onload = () => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Soft drop shadow so the badge pops over busy crowds.
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    ctx.drawImage(img, 4, 2, size - 8, size - 8);
    tex!.needsUpdate = true;
  };
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(badgeSvg(kind, size))}`;
  cache.set(kind, tex);
  return tex;
}

let stink: THREE.CanvasTexture | null = null;

/** Wavy green "stink line" sprite. */
export function stinkTexture(): THREE.CanvasTexture {
  if (stink) return stink;
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const path = () => {
      ctx.beginPath();
      for (let y = 6; y <= 90; y += 2) {
        const x = 16 + Math.sin((y / 84) * Math.PI * 2.4) * 8;
        if (y === 6) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };
    ctx.strokeStyle = 'rgba(40,70,10,0.55)';
    ctx.lineWidth = 9;
    path();
    ctx.strokeStyle = '#9ccc3c';
    ctx.lineWidth = 6;
    path();
  }
  stink = new THREE.CanvasTexture(canvas);
  stink.colorSpace = THREE.SRGBColorSpace;
  return stink;
}
