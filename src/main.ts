import { GameShell } from './app/GameShell';

function fail(message: string): void {
  const overlay = document.getElementById('overlay');
  if (!overlay) return;
  overlay.hidden = false;
  overlay.innerHTML = `
    <header>
      <div class="panel__eyebrow">ошибка запуска</div>
      <h1 class="panel__title">Нужен WebGL2</h1>
      <p class="panel__note">${message}</p>
    </header>`;
}

const canvas = document.getElementById('gl');
const hud = document.getElementById('hud');
const overlay = document.getElementById('overlay');
const debug = document.getElementById('debug');

if (!(canvas instanceof HTMLCanvasElement) || !hud || !overlay || !debug) {
  throw new Error('Разметка страницы повреждена');
}

try {
  const shell = new GameShell({ canvas, hud, overlay, debug });
  shell.start();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
