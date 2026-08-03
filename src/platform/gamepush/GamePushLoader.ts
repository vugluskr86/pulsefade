import type { GamePushConfig } from '../../config/gamepush';
import type { GamePushSdk } from './GamePushSdk';

const SDK_ENDPOINTS = [
  'https://gs.eponesh.com/sdk/game-score.js',
  'https://s3.gamepush.com/files/gs/sdk/game-score.js',
  'https://s3-eu.gamepush.com/sdk/game-score.js',
  'https://gamepush.com/sdk/game-score.js',
] as const;

/** Загружает официальный SDK с тем же набором резервных CDN, что указан в документации. */
export async function loadGamePushSdk(config: GamePushConfig): Promise<GamePushSdk | null> {
  if (!config.enabled || config.projectId === null || config.publicToken.length === 0) return null;

  const callbackName = `__pulsefadeGPInit_${Math.random().toString(36).slice(2)}`;
  const host = window as unknown as Record<string, unknown>;
  let resolved = false;
  let resolveSdk: ((sdk: GamePushSdk | null) => void) | null = null;
  const sdkPromise = new Promise<GamePushSdk | null>((resolve) => {
    resolveSdk = resolve;
  });

  host[callbackName] = (sdk: GamePushSdk) => {
    if (resolved) return;
    resolved = true;
    resolveSdk?.(sdk);
    resolveSdk = null;
  };

  try {
    const query = new URLSearchParams({
      projectId: String(config.projectId),
      publicToken: config.publicToken,
      callback: callbackName,
    }).toString();

    void loadFromFallbackCdns(query, config.sdkAttemptTimeoutMs, () => resolved);
    return await Promise.race([
      sdkPromise,
      delay(config.sdkAttemptTimeoutMs).then(() => null),
    ]);
  } finally {
    resolved = true;
    delete host[callbackName];
  }
}

/**
 * Читабельный эквивалент официального loader-snippet:
 * HEAD-проверки идут параллельно, затем подключается первый доступный CDN,
 * а при ошибке скрипта пробуется следующий.
 */
async function loadFromFallbackCdns(
  query: string,
  totalTimeoutMs: number,
  isResolved: () => boolean,
): Promise<void> {
  const pending = new Set<string>(SDK_ENDPOINTS);
  const reachable: string[] = [];
  let loading = false;

  const tryNext = (): void => {
    if (loading || isResolved()) return;
    const endpoint = reachable.shift() ?? pending.values().next().value;
    if (typeof endpoint !== 'string') return;
    pending.delete(endpoint);
    loading = true;

    const script = document.createElement('script');
    script.async = true;
    script.src = `${endpoint}?${query}`;
    script.onerror = () => {
      loading = false;
      script.remove();
      tryNext();
    };
    script.onload = () => {
      loading = false;
      // Обычно callback вызывается при выполнении скрипта. Короткий grace-период
      // позволяет перейти к следующему CDN, если файл загрузился некорректно.
      window.setTimeout(() => {
        if (!isResolved()) tryNext();
      }, 400);
    };
    document.head.appendChild(script);
  };

  for (const endpoint of SDK_ENDPOINTS) {
    void fetch(endpoint, { method: 'HEAD' })
      .then((response) => {
        if (!response.ok || isResolved() || !pending.has(endpoint)) return;
        reachable.push(endpoint);
        tryNext();
      })
      .catch(() => {
        // Недоступный HEAD не исключает CDN: fallback ниже всё равно попробует URL.
      });
  }

  // Официальный snippet тоже начинает прямую загрузку, если проверки CDN затянулись.
  window.setTimeout(tryNext, Math.min(5_000, Math.max(500, totalTimeoutMs / 2)));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
