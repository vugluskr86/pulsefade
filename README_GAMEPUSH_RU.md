# PULSEFADE — GamePush + Android release

Проект содержит платформенный адаптер GamePush и официальный Android release pipeline через GamePush builder.
При недоступном SDK игра использует `NullGamePlatform` и сохраняет базовый gameplay.

## Команды

```bash
npm install
npm run dev
npm run test
npm run typecheck
npm run build
npm run package:gamepush
npm run release:android
```

`npm run release:android` создаёт HTML5 ZIP для загрузки в GamePush:

```text
release/pulsefade-gamepush-web.zip
```

APK/AAB собираются после загрузки этого архива в панели GamePush.

## Реализовано

- официальный fallback loader GamePush SDK;
- ожидание `gp.player.ready`;
- облачный sync рекордов, статистики и `pulses`;
- leaderboard Adaptive;
- rewarded ×2 pulses;
- fullscreen только между раундами;
- pause/resume, звук и input lock во время рекламы/сворачивания;
- Vite `base: './'` для вложенного хостинга и Android WebView;
- release verifier и кроссплатформенная упаковка ZIP;
- Android build template, icons и splash;
- план контента и платформенная матрица.

## Документация

- `docs/GAMEPUSH_SETUP_RU.md` — поля игрока, реклама, leaderboard и SDK.
- `docs/GAMEPUSH_ANDROID_RELEASE_RU.md` — APK/AAB, подпись и Google Play.
- `docs/PUBLISHING_CONTENT_PLAN_ALL_PLATFORMS_RU.md` — контент и варианты всех площадок.
- `release/android/gamepush-android-build.example.json` — значения Android builder.

## Важное ограничение исходного архива

Исходный upload содержал только `src/`. В этой версии добавлен минимальный Vite scaffold: `package.json`,
`index.html`, `vite.config.ts` и `tsconfig.json`. Версии зависимостей следует согласовать с основным репозиторием,
если в нём уже есть собственные конфиги и тестовый setup.
