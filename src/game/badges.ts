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

let bubble: THREE.CanvasTexture | null = null;

/** 大聲公 speech bubble 「喂！！」 (white bubble, orange rim, tail bottom-left). */
export function shoutBubbleTexture(): THREE.CanvasTexture {
  if (bubble) return bubble;
  const W = 256;
  const H = 168;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const r = 34;
    const x0 = 10;
    const y0 = 8;
    const x1 = W - 10;
    const y1 = H - 44;
    ctx.beginPath();
    ctx.moveTo(x0 + r, y0);
    ctx.arcTo(x1, y0, x1, y1, r);
    ctx.arcTo(x1, y1, x0, y1, r);
    ctx.lineTo(96, y1);
    ctx.lineTo(62, H - 8);
    ctx.lineTo(70, y1);
    ctx.arcTo(x0, y1, x0, y0, r);
    ctx.arcTo(x0, y0, x1, y0, r);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#f39c12';
    ctx.stroke();
    ctx.fillStyle = '#1a1d22';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = "900 76px system-ui,'PingFang HK','Noto Sans HK','Noto Sans CJK HK','Noto Sans CJK TC',sans-serif";
    ctx.fillText('喂！！', W / 2 + 4, (y0 + y1) / 2 + 4);
  }
  bubble = new THREE.CanvasTexture(canvas);
  bubble.colorSpace = THREE.SRGBColorSpace;
  bubble.anisotropy = 2;
  return bubble;
}
