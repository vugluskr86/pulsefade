# PULSEFADE — план контента для публикации на площадках GamePush

Цель — поддерживать один мастер-билд и несколько платформенных профилей, не создавая отдельную игру для
каждого портала. План основан на официальных руководствах GamePush:

- https://docs.gamepush.com/ru/tutorials/publishing-the-game-on-platforms-guide/
- https://docs.gamepush.com/ru/tutorials/adding-google-play/
- https://docs.gamepush.com/ru/tutorials/game-testing-checklist/

## 1. Что должно быть готово до первой отправки

### Игровой контент

Текущие бесконечные режимы технически дают больше 10 минут игры, но модератору и игроку нужен видимый объём
и понятная цель. Для первой публикации подготовить:

1. **Adaptive Journey — 12 испытаний** по 30–60 секунд:
   - 1–3: стабильный ритм и широкое окно PERFECT;
   - 4–6: ускорение/замедление;
   - 7–9: паузы и ложное ожидание;
   - 10–12: double, hold и choice.
2. **Пять свободных режимов**: Adaptive, Chaos, Marathon, Zen, Duel.
3. **Ежедневный seed** с одной и той же последовательностью для всех игроков.
4. **Три стартовые миссии**: сыграть 3 раунда, получить 20 PERFECT, сделать combo 10.
5. **Шесть косметических наград** за `pulses`: палитры и формы частиц, без влияния на score.
6. **Экран прогресса** с видимой следующей целью и процентом завершения Journey.
7. **Короткое интерактивное обучение** только для событий double/hold/choice; базовый тап остаётся без туториала.

Так игрок видит конечную структуру контента, а прохождение основного набора занимает больше 10 минут и удерживает
первые 5 минут, как требует общий чек-лист GamePush.

### Локализации

Минимум:

- RU — российские площадки;
- EN — международные площадки и Android package metadata.

Локализуются HUD, режимы, результаты, ошибки рекламы, политика конфиденциальности, описания магазина,
достижения и release notes. Язык при старте должен учитывать язык площадки; ручной переключатель сохраняется
как резервный вариант.

### Звук

Подготовить собственный или лицензированный пакет:

- 4 звука оценки: PERFECT/GREAT/OK/MISS;
- UI click;
- начало/конец раунда;
- тихая необязательная ambient-петля либо ритмический фон;
- отдельные регуляторы SFX/Music или общий mute.

GameDistribution требует, чтобы игра не была полностью беззвучной, и ожидает rewarded-механику. Источники и
лицензии аудио хранить в `content/licenses/`.

## 2. Универсальный публикационный пакет

Хранить в `content/store/`:

```text
metadata/
  ru.json
  en.json
icons/
  icon-master-1024.png
covers/
  cover-master.png
screenshots/
  portrait-01.png ... portrait-05.png
  landscape-01.png ... landscape-05.png
video/
  trailer-15s.mp4
  trailer-30s.mp4
legal/
  privacy-ru.md
  privacy-en.md
  licenses.md
qa/
  moderator-instructions-ru.md
  moderator-instructions-en.md
```

В текущем архиве уже лежат черновики:

- `public/icons/icon-512.png`;
- `public/icons/loading-logo.png`;
- `content/store/cover-1200x630.png`;
- portrait/landscape-скриншоты.

Перед публикацией их заменить финальным арт-паком. Конкретные размеры экспортов сверять в кабинете площадки в
момент отправки: требования каталогов меняются, а мастер-ассеты должны позволять экспорт без апскейла.

### Тексты

Подготовить один утверждённый набор:

- название: `PULSEFADE`;
- подзаголовок до одной строки;
- короткое описание;
- полное описание с механикой, режимами и управлением;
- 5 ключевых особенностей;
- текст первого запуска;
- объяснение rewarded: точная награда и факт показа рекламы;
- служебная инструкция модератору;
- контакты поддержки без перенаправления игрока на конкурирующие платформы.

Описание не должно обещать функций, которых нет в конкретном платформенном профиле.

### Графика

- уникальная статичная иконка с непрозрачным фоном;
- обложка с названием, совпадающим с названием игры;
- первый скриншот показывает основной one-tap loop;
- второй — PERFECT/combo;
- третий — смену темпа;
- четвёртый — режимы/Journey;
- пятый — лидерборд или Duel только на площадках, где эта функция разрешена;
- брендинг PULSEFADE показывается не более чем в одном основном месте для Poki/GameDistribution.

## 3. Платформенные профили

Рекомендуемые сборочные профили:

```text
generic-web       GamePush hosting, Yandex, VK, OK, My World и партнёрские площадки
international     CrazyGames, GameDistribution, GameMonetize, GamePix, WG, Y8
curated-minimal   CoolMath, Playdia, Poki
telegram          Telegram Mini App / PlayDeck
android           Google Play и альтернативные Android-магазины
smartmarket       SmartMarket
```

Профиль меняет доступность лидерборда, внешних ссылок, аналитики, sticky, ориентации и каталожных материалов,
но не правила score и не игровой seed.

## 4. Матрица площадок GamePush

| Площадка | Что подготовить | Особая ветка контента/настроек |
|---|---|---|
| **Google Play** | AAB, APK для QA, RU/EN store listing, privacy, Data safety, возрастной рейтинг | Portrait/fullscreen, Android icons/splash, подпись keystore; подробности в `GAMEPUSH_ANDROID_RELEASE_RU.md`. |
| **Android alternative stores** | Подписанный APK, универсальный Android store pack | Проверить рекламу, платежи и требования каждого магазина; не считать Google Play listing автоматически совместимым. |
| **VK Games** | App ID/Secret, RU-тексты, GamePush hosting или свой HTTPS | Первую рекламу показывать после знакомства с игрой; социальные действия только по явному нажатию. Реклама через подключённого провайдера площадки. |
| **Яндекс Игры** | ID/Secret, RU/EN, responsive desktop/mobile | Sticky потенциально доходный, но для PULSEFADE нужен отдельный layout с безопасной зоной; в MVP оставить выключенным. |
| **OK Games** | App ID/Secret, полностью RU-интерфейс | Публикация доступна юрлицам/ИП; не упоминать другие соцсети и не уводить аудиторию наружу. |
| **Мой Мир** | ID, public/private keys, URL и `receiver.html` | Игра и `receiver.html` должны быть на одном домене; подготовить отдельную проверку платежного callback, если будут IAP. |
| **CrazyGames** | HTML5 build, EN metadata, storage declaration | Согласовать тип сохранений с `gp.player.sync({storage:'preferred'})`; rewarded и fullscreen не предлагать на одном результате. |
| **GameDistribution** | EN title совпадает с tab title, App ID | Обязательны звук и rewarded; ограничить широкое брендирование одним местом. |
| **GameMonetize** | App ID и EN store pack | Проверить доступность рекламы и fallback без ad fill. |
| **CoolMathGames** | Специальный билд через GamePush | Убрать внешние ссылки, собственную fullscreen-кнопку, лидерборды/профили/чаты и ручные трекеры. Добавить требуемые `LEVEL_START`/`LEVEL_REPLAY`. |
| **Playdia** | Специальный билд и QA tool | Те же ограничения, что у curated-профиля; вызвать `gp.gameStart()` после загрузки, использовать GamePush sounds для внешнего mute. |
| **Poki** | 16:9 desktop presentation, EN assets | Холст масштабируется под 16:9; брендинг в одном месте; отдельный визуальный QA широких экранов. |
| **Telegram** | BotFather bot, Mini App, bot token в GamePush, URL игры | Компактные тексты и touch-first UI; подключить поддерживаемую Telegram рекламную сеть; GamePush analytics-счётчики не включать. |
| **PlayDeck** | Секретный token, URL | Обязателен `gp.gameStart()`; подготовить карточку игры для каталога/шаринга. |
| **Playgama** | Добавить площадку, share URL при наличии | Использовать generic international pack, проверить сохранения и рекламу. |
| **GamePix** | Добавить площадку | International build без sticky, так как sticky не поддерживается. |
| **WG Playground** | Заявка разработчика и добавление площадки | International pack; проверить доступность рекламы конкретной сборки. |
| **Y8** | App ID/Secret, webhook, рекламный SDK | Английские названия достижений должны точно совпадать с Y8; подготовить achievement mapping. |
| **Kongregate** | App ID/API key, guest access URL | Проверить авторизацию гостя; generic international pack. |
| **Фотострана** | ID, client/server keys, payment webhook | RU store pack; при дистрибуции согласовать документы и монетизацию с менеджером. |
| **билайн** | ID и ключи от менеджера, auth/target URLs | RU mobile pack; реклама через стандартный GamePush Ads не поддерживается — монетизацию согласовать отдельно. |
| **SmartMarket** | ID смартапа, webhook, явный `_platform=SMARTMARKET` | Монетизация доступна юрлицам/ИП; отдельная возрастная/permission-проверка и контент без недостоверных фактов. |

## 5. Feature flags перед сборкой

Даже при одном коде релизный чек-лист должен фиксировать:

| Флаг | generic | international | curated | telegram | android |
|---|---:|---:|---:|---:|---:|
| GamePush Ads | да | по поддержке площадки | да, по правилам портала | через выбранную сеть | да |
| Rewarded | да | да | да | по конфигурации | да |
| Fullscreen | между раундами | между раундами | между раундами | осторожно | между раундами |
| Sticky | выкл. | выкл. | выкл. | выкл. | выкл. |
| Leaderboard | да | по поддержке | нет | опционально | да |
| External links | нет | нет | нет | только разрешённые bot links | privacy/support через store |
| Manual analytics trackers | только разрешённые | выключить на запрещённых | выключить | выключить | разрешены после декларации |
| Debug panel | только QA | только QA | нет | нет | нет |

Перед production debug-панель лучше отключить compile-time флагом, чтобы модератор и игрок не могли менять баланс.

## 6. Монетизационный контент

### Rewarded

Единый сценарий для всех поддерживаемых площадок:

```text
Раунд завершён -> базовые pulses сохранены -> кнопка «×2 за рекламу»
-> успешный просмотр -> дополнительная награда -> sync
```

Нужно подготовить RU/EN тексты для состояний:

- реклама доступна;
- реклама загружается;
- видео не найдено;
- просмотр отменён;
- награда начислена;
- синхронизация временно недоступна.

### Fullscreen

- только естественный разрыв между раундами;
- не раньше 4-го раунда;
- не чаще раза в 3 минуты;
- не на экране, где предложен rewarded;
- перед автоматическим показом использовать countdown overlay платформы;
- AdBlock/нет fill не блокируют кнопку «Ещё раз».

### Покупки

Для первого релиза не нужны. После подтверждения retention можно добавить косметические наборы без влияния на
leaderboard. Для каждой площадки потребуется собственная валюта и отдельная модерация платежей.

## 7. План производства контента

### Спринт A — Moderation Ready

- Journey 1–12;
- RU/EN локализация;
- mute и базовый аудиопак;
- финальная иконка/обложка/5 скриншотов;
- privacy и licenses;
- APK internal test;
- generic web build;
- 20 QA-сессий без ошибок.

### Спринт B — Retention Pack

- daily seed;
- 7 ежедневных миссий;
- 6 косметических unlock;
- достижения;
- экран прогресса;
- leaderboard onboarding;
- A/B-тест PERFECT window и rewarded placement.

### Спринт C — Distribution Variants

- curated-minimal build;
- 16:9 Poki layout;
- Telegram/PlayDeck card assets;
- Y8 achievement mapping;
- Yandex sticky-safe experimental layout;
- Android production AAB.

### Спринт D — Live Ops

- недельные challenges;
- сезонные палитры без политических/религиозных тем;
- 30-дневный контент-календарь;
- platform-specific featuring assets;
- отчёт D1/D7, retry rate после MISS, rewarded opt-in и ad churn.

## 8. Definition of Done для каждой площадки

Площадка считается готовой, когда:

1. собран отдельный immutable build и записан commit hash;
2. тексты соответствуют фактическим функциям этого build;
3. изображения не содержат недоступных режимов;
4. progress save проверен после перезапуска и инкогнито, где применимо;
5. pause/resume и звук проверены на рекламе и сворачивании;
6. rewarded всегда выдаёт обещанную награду либо показывает понятную ошибку;
7. external links/analytics/leaderboards соответствуют правилам профиля;
8. QA выполнен на минимальном mobile, tablet и desktop viewport;
9. хранится скриншот настроек GamePush площадки;
10. заполнены дата отправки, версия, ответ модерации и список исправлений.
