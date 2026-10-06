/**
 * Load subset OFL fonts used for station-sign canvas textures.
 * Fonts live under public/fonts/ (see OFL-Noto.txt).
 * Paths respect Vite `base` (e.g. /exit-rush/ on GitHub Pages).
 */
import { publicUrl } from './publicUrl';

let ready: Promise<void> | null = null;
let loaded = false;

const FACES: Array<{ family: string; file: string; weight?: string }> = [
  { family: 'ExitRush Sans', file: 'fonts/NotoSansHK-Bold.subset.woff2', weight: '700' },
  { family: 'ExitRush Serif', file: 'fonts/NotoSerifHK-Bold.subset.woff2', weight: '700' },
];

export function fontsReady(): boolean {
  return loaded;
}

/** Idempotent — call once at boot; TrainScene awaits before drawing signs. */
export function loadGameFonts(): Promise<void> {
  if (ready) return ready;
  ready = (async () => {
    if (typeof document === 'undefined' || typeof FontFace === 'undefined') {
      loaded = true;
      return;
    }
    await Promise.all(
      FACES.map(async (f) => {
        const url = publicUrl(f.file);
        const face = new FontFace(f.family, `url(${url})`, {
          weight: f.weight ?? '700',
          style: 'normal',
          display: 'swap',
        });
        const loadedFace = await face.load();
        document.fonts.add(loadedFace);
      }),
    );
    await document.fonts.ready;
    loaded = true;
    console.info('[fonts] ExitRush Sans/Serif subsets ready');
  })().catch((err) => {
    console.warn('[fonts] subset load failed; falling back to system fonts', err);
    loaded = true;
  });
  return ready;
}
