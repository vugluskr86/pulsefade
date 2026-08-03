# PULSEFADE — интеграция GamePush

В архив добавлена платформенная интеграция, не связывающая игровую логику напрямую с глобальным SDK.
При отсутствии переменных окружения, недоступном CDN или локальном запуске игра автоматически использует
`NullGamePlatform` и продолжает работать без рекламы и облачных функций.

## Что реализовано

- загрузчик GamePush SDK с официальными резервными CDN;
- ожидание `gp.player.ready` перед стартом игры;
- события начала игры и игрового процесса;
- остановка симуляции, ввода, звука и вибрации при рекламе, системной паузе и уходе со вкладки;
- экран «Продолжить» после возврата во вкладку;
- сохранение рекордов, статистики и валюты `pulses`;
- таблица лидеров по базовому полю `score` для режима Adaptive;
- rewarded video: удвоение заработанных за раунд `pulses`;
- fullscreen-реклама только между раундами, с локальным лимитом;
- аналитические цели GamePush;
- безопасный no-op fallback для разработки вне GamePush.

## Подключение

1. Скопируйте `.env.gamepush.example` в `.env.local`.
2. Подставьте `Project ID` и `Public Token` из панели GamePush.
3. Создайте пользовательские поля из `docs/GAMEPUSH_SETUP_RU.md`.
4. Выполните обычную сборку Vite и загрузите содержимое `dist/` в GamePush.

## Основные файлы

```text
src/config/gamepush.ts                         настройки полей и рекламных лимитов
src/platform/IGamePlatform.ts                 независимый контракт платформы
src/platform/gamepush/GamePushSdk.ts          узкие типы используемой части SDK
src/platform/gamepush/GamePushLoader.ts       загрузка SDK с fallback CDN
src/platform/gamepush/GamePushPlatform.ts     сохранения, реклама, лидерборд, аналитика
src/platform/gamepush/createGamePlatform.ts   GamePush / no-op выбор
src/app/GameShell.ts                          жизненный цикл, пауза и результат раунда
src/input/InputRouter.ts                      блокировка ввода во время рекламы/паузы
src/main.ts                                   асинхронный bootstrap
```

## Текущая рекламная политика

```text
Rewarded:   после 2 завершённых раундов, только по кнопке игрока
Награда:    базовые pulses за раунд ×2
Fullscreen: не раньше 4-го раунда, не чаще раза в 3 раунда и раза в 180 секунд
Preloader:  выключен
Sticky:     выключен
```

Баланс находится в `src/config/gamepush.ts`, а не размазан по UI и игровым системам.
