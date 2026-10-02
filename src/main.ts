import { Game } from './game/Game';
import { renderUI } from './ui/renderUI';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const uiRoot = document.getElementById('ui-root') as HTMLElement;

let uiScheduled = false;

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
});

renderUI(uiRoot, game);

// Unlock audio on first pointer
window.addEventListener(
  'pointerdown',
  () => {
    game.audio.unlock();
  },
  { once: true },
);
