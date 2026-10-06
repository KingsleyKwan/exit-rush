import { Game } from './game/Game';
import { renderUI } from './ui/renderUI';
import { loadGameFonts } from './game/fonts';
import { setSaveMirror } from './game/storage';
import { entitlements, setEntitlementPersister } from './game/entitlements';
import { hydrateNativeSave, mirrorSaveToNative } from './native/saveBridge';
import { startNativeShell, syncKeepAwake } from './native/shell';

void loadGameFonts();

/** Browser zoom (double-tap, trackpad pinch, Ctrl/Cmd +/-) clips the fixed UI. */
function lockPageZoom(): void {
  const block = (e: Event) => e.preventDefault();
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, block, { passive: false });
  }
  window.addEventListener(
    'wheel',
    (e) => {
      if (e.ctrlKey) e.preventDefault();
    },
    { passive: false },
  );
  window.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    if (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '_' || e.key === '0') e.preventDefault();
  });
  let lastTap = 0;
  document.addEventListener(
    'touchend',
    (e) => {
      const now = Date.now();
      if (now - lastTap < 300) e.preventDefault();
      lastTap = now;
    },
    { passive: false },
  );
  document.addEventListener('dblclick', block);
}

lockPageZoom();

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const uiRoot = document.getElementById('ui-root') as HTMLElement;

let uiScheduled = false;

function showToast(msg: string): void {
  const app = document.getElementById('app') ?? document.body;
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = msg;
  app.appendChild(el);
  const ms = msg.length > 24 ? 5200 : 3200; // longer notices (e.g. respec) stay up a bit longer
  window.setTimeout(() => el.classList.add('gone'), ms);
  window.setTimeout(() => el.remove(), ms + 600);
}

async function boot(): Promise<void> {
  await hydrateNativeSave();
  setSaveMirror(mirrorSaveToNative);

  const game = new Game(canvas, {
    onState: () => {
      syncKeepAwake(game.screen);
      // Throttle HUD updates while playing to avoid thrashing DOM every frame
      if (game.screen === 'playing') {
        if (uiScheduled) return;
        uiScheduled = true;
        requestAnimationFrame(() => {
          uiScheduled = false;
          renderUI(uiRoot, game);
        });
        return;
      }
      renderUI(uiRoot, game);
    },
    onToast: showToast,
  });

  setEntitlementPersister((cache) => {
    game.save.entitlementCache = { ...cache, at: Date.now() };
    if (!entitlements().canPlay(game.save.character)) game.save.character = 'hero';
    game.persist();
  });

  renderUI(uiRoot, game);
  void startNativeShell(game);
  void entitlements().refresh();

  // First launch stays on the start screen so a new player can see the other characters
  // before Play. The L1 ghost-hand still teaches the drag once they start.
  queueMicrotask(() => {
    window.setTimeout(() => game.consumeRespecNotice(), 600);
  });

  // Unlock audio on the first gesture, and re-resume it on later gestures if the
  // OS suspended / interrupted it (iOS after calls, backgrounding, etc.).
  window.addEventListener(
    'pointerdown',
    () => {
      game.audio.unlock();
    },
    { passive: true },
  );
}

void boot();
