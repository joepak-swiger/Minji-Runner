import Game from './core/Game.js';

function boot() {
  const game = new Game();
  game.mount();
  window.minjiRunner = game;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
