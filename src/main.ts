import './ui/style.css';
import './i18n/ru';
import './i18n/en';
import { GameShell } from './app/GameShell';
import { GAMEPUSH_CONFIG } from './config/gamepush';
import { createGamePlatform } from './platform/gamepush/createGamePlatform';
import { setLang, detectLang, t } from './i18n/locale';

setLang(detectLang());

function fail(message: string): void {
  const overlay = document.getElementById('overlay');
  if (!overlay) return;
  overlay.hidden = false;
  overlay.innerHTML = `
    <header>
      <div class="panel__eyebrow">${t('sys.error.startup')}</div>
      <h1 class="panel__title">${t('sys.error.webgl')}</h1>
      <p class="panel__note">${message}</p>
    </header>`;
}

async function bootstrap(): Promise<void> {
  const canvas = document.getElementById('gl');
  const hud = document.getElementById('hud');
  const overlay = document.getElementById('overlay');
  const debug = document.getElementById('debug');

  if (!(canvas instanceof HTMLCanvasElement) || !hud || !overlay || !debug) {
    throw new Error(t('sys.error.markup'));
  }

  const platform = await createGamePlatform(GAMEPUSH_CONFIG);
  const shell = new GameShell({ canvas, hud, overlay, debug }, platform);
  await platform.beforeGameStart();
  await platform.gameReady();
  shell.start();
}

void bootstrap().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
});
