import { Game } from './game/Game';
import { renderUI } from './ui/renderUI';
import { loadGameFonts } from './game/fonts';

void loadGameFonts();

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

const game = new Game(canvas, {
  onState: () => {
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

renderUI(uiRoot, game);

// v0.5 FTUE: first launch jumps into L1 (ghost-hand teach).
queueMicrotask(() => {
  game.tryAutoFtue();
  // v0.7: economy change (1 SP per clear) may have refunded the save → tell the player once.
  window.setTimeout(() => game.consumeRespecNotice(), 600);
  if (game.screen !== 'menu') renderUI(uiRoot, game);
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
