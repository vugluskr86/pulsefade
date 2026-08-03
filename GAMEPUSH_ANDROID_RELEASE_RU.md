# PULSEFADE — сборка Android через GamePush

Инструкция следует официальному сценарию GamePush: Vite собирает HTML5-версию, архив загружается
в **Хостинг игр**, а GamePush Android builder формирует подписанные `.apk` и `.aab`.

Официальные материалы:

- https://docs.gamepush.com/ru/tutorials/adding-google-play/
- https://docs.gamepush.com/ru/tutorials/publishing-the-game-on-platforms-guide/
- https://docs.gamepush.com/ru/tutorials/game-testing-checklist/

## 1. Схема релиза

```text
TypeScript/Vite
  -> dist/
  -> release/pulsefade-gamepush-web.zip
  -> GamePush / Хостинг игр
  -> Android build
  -> signed APK для тестирования
  -> signed AAB для Google Play
```

GamePush создаёт оба формата. Для Google Play загружается `.aab`; `.apk` используется для установки
на устройства, внутреннего QA и распространения вне Google Play.

## 2. Подготовка проекта

Создайте `.env.local` из `.env.example` и добавьте публичные данные проекта GamePush:

```dotenv
VITE_GAMEPUSH_ENABLED=true
VITE_GAMEPUSH_PROJECT_ID=12345
VITE_GAMEPUSH_PUBLIC_TOKEN=PUBLIC_TOKEN_FROM_PANEL
VITE_GAMEPUSH_PRELOADER=false
VITE_GAMEPUSH_STICKY=false
```

Секретные ключи площадок, пароль keystore и серверные токены в клиентский `.env` не добавляются.

Установите зависимости и соберите архив:

```bash
npm install
npm run test
npm run release:android
```

Команда выполняет:

1. строгую проверку TypeScript;
2. Vite-сборку с `base: './'`;
3. проверку структуры `dist/`;
4. создание `release/pulsefade-gamepush-web.zip`.

В ZIP `index.html` находится в корне, а не во вложенной папке `dist`.

## 3. Добавление Google Play в GamePush

1. В проекте GamePush откройте **Платформы**.
2. Добавьте **Google Play**.
3. Для веб-версии Android build добавьте разрешённый источник `https://localhost`.
4. Рекламную конфигурацию допустимо подключить после первой опубликованной тестовой версии.
5. В **Хостинг игр** загрузите `release/pulsefade-gamepush-web.zip` и опубликуйте черновик.

## 4. Конфигурация Android build

Откройте:

```text
Хостинг игр -> Исходники игры и билды -> Android build -> Изменить конфиг
```

Рабочий шаблон находится в:

```text
release/android/gamepush-android-build.example.json
```

JSON является чек-листом для ручного переноса значений в панель, а не импортируемым форматом GamePush.

| Поле | Значение для первого билда | Комментарий |
|---|---|---|
| Package ID | `com.yourstudio.pulsefade` | Заменить `yourstudio`; без тире и спецсимволов. После релиза не менять. |
| Version | `1.0.0` | GamePush добавляет номер своей сборки автоматически. |
| Title | `PULSEFADE` | В пакет лучше встроить английское название. |
| Description | Английское краткое описание | Локализованные тексты задаются отдельно в Google Play. |
| Icon | `www/icons/icon-512.png` | Для относительного пути обязателен префикс `www/`. |
| Orientation | Portrait | Основная ориентация прототипа. |
| Fullscreen | Включён | Скрывает системную строку во время игры. |
| WebView debug | Только тестовый билд | В релизном билде выключить. |
| Minimum Android | Android 7 | Минимум из руководства GamePush; обязательно проверить WebGL2 на реальных устройствах. |
| Permissions | Пусто | Камера, микрофон и файловая система игре не нужны. |
| Plugins | Вибрация, если требует builder | Игра использует `navigator.vibrate`; проверить на APK и включить предлагаемый builder-плагин при необходимости. |
| Splash image | `www/icons/loading-logo.png` | Файл уже включён в `public/icons`. |
| Splash color | `#07070F` | Совпадает с фоном игры. |

### Белый список URL

Поле необязательное. Для первого подписанного QA-билда лучше оставить его пустым: реклама может обращаться
к доменам конкретной рекламной сети. После успешного тестирования можно включить строгий список по фактическим
запросам WebView. Минимально игра использует SDK/API GamePush и резервные CDN из `GamePushLoader.ts`.

Не ограничивайте список только одним CDN: при его недоступности резервная загрузка SDK перестанет работать.

## 5. Иконки и splash screen

В проект добавлены технические ассеты:

```text
public/icons/icon-512.png
public/icons/loading-logo.png
```

Перед публичным релизом заменить их финальными, не меняя пути. Иконка должна:

- быть уникальной;
- иметь непрозрачный фон;
- читаться в маленьком размере;
- не использовать чужие логотипы или защищённый арт;
- не быть анимированной.

Для каталожной обложки подготовлен черновик `content/store/cover-1200x630.png`.

## 6. Ключ подписи

### 6.1 Создание приложения в Google Play Console

Создайте приложение и черновой релиз, например во **Внутреннем тестировании**. В настройке Play App Signing
выберите использование собственного upload key и скачайте:

- `encryption_public_key.pem`;
- `pepk.jar`.

### 6.2 Генерация upload keystore

Выполните команду в отдельной закрытой директории:

```bash
keytool -genkeypair \
  -alias upload \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -keystore upload-keystore.jks
```

Официальный пример GamePush использует меньший срок действия; для рабочего upload key здесь выбран длительный
срок, чтобы не создавать операционный риск скорого истечения. Запишите в менеджер секретов:

- пароль хранилища;
- пароль ключа;
- alias `upload`;
- резервную копию `upload-keystore.jks`.

Файлы `*.jks`, `*.keystore`, `*.pem`, `pepk.jar` и `output.zip` исключены из Git.

### 6.3 Экспорт ключа для Play App Signing

В каталоге с `pepk.jar`, `encryption_public_key.pem` и keystore:

```bash
java -jar pepk.jar \
  --keystore=upload-keystore.jks \
  --alias=upload \
  --output=output.zip \
  --include-cert \
  --rsa-aes-encryption \
  --encryption-key-path=./encryption_public_key.pem
```

Загрузите `output.zip` в Google Play Console.

### 6.4 Подпись в GamePush

В Android build нажмите **Подписать** и загрузите `upload-keystore.jks`, затем укажите alias и пароли.
Не пересоздавайте keystore для следующих версий: Google Play должен получать обновления, подписанные тем же
upload key.

## 7. Сборка APK/AAB

1. Убедитесь, что актуальный ZIP загружен в Хостинг игр.
2. Откройте Android build.
3. Для QA включите WebView debug, для production выключите.
4. Нажмите **Собрать**.
5. Скачайте `.apk` и `.aab`.
6. Установите APK минимум на два физических устройства.
7. Загрузите AAB во внутреннее тестирование Google Play.

GamePush указывает среднее время сборки 3–5 минут.

## 8. Проверка APK

### Первый запуск

- splash не мигает белым;
- SDK и игрок инициализируются;
- первый Adaptive-раунд начинается без зависания;
- возврат после системного диалога не создаёт автоматический MISS;
- при отсутствии сети игра переходит в безопасный no-op режим, если SDK не загрузился.

### Экран и управление

- portrait зафиксирован;
- статус-бар скрыт в gameplay;
- вырез камеры и системная навигация не перекрывают HUD;
- тап работает по всей игровой области;
- системная кнопка Back не закрывает приложение в середине рекламного overlay;
- после сворачивания отображается контролируемое продолжение игры.

### GamePush

- `gp.player.ready` завершён до чтения рекордов;
- после раунда вызывается `gp.player.sync({ storage: 'preferred' })`;
- rewarded выдаёт награду только при успешном результате;
- fullscreen появляется только между раундами;
- во время рекламы остановлены часы, ввод, звук и вибрация;
- лидерборд открывается и корректно возвращает в игру.

### Производительность

- стабильный frame pacing на 60 и 90/120 Гц;
- WebGL context не теряется после нескольких реклам;
- 20 последовательных раундов не увеличивают память без ограничений;
- APK работает без включённого WebView debug.

## 9. Публикация в Google Play

Для релиза используется `.aab`. В **Publishing overview** заполните:

- карточку приложения и локализации;
- возрастной рейтинг;
- Data safety;
- наличие рекламы;
- целевую аудиторию;
- политику конфиденциальности;
- описание доступа к данным;
- тестовые инструкции модератору.

GamePush позволяет включить веб-страницу политики конфиденциальности в разделе **Документы**. Проверьте текст
вручную: он должен соответствовать фактически подключённым аналитике, рекламе и облачным сохранениям.

Рекомендуемая последовательность каналов:

```text
Internal testing -> Closed testing -> Open testing -> Production
```

## 10. Android-реклама

Для первого релиза допустимо опубликовать сборку без боевых рекламных ID и проверить весь gameplay/сохранения.
По руководству GamePush рекламные идентификаторы некоторых Android-монетизаторов выдаются после публикации.
После их получения:

1. добавьте рекламную конфигурацию к площадке Google Play;
2. укажите ID баннеров/приложения в Android build;
3. пересоберите APK/AAB;
4. повторите rewarded/fullscreen QA;
5. обновите Data safety и декларацию рекламы, если набор SDK изменился.

PULSEFADE не включает sticky в Android MVP: нижняя лента темпа является значимой частью поля. Sticky можно
включать только после отдельного responsive-layout с зарезервированной безопасной зоной.

## 11. Версионирование и откат

- версия продукта: `package.json` и поле Version в Android builder;
- номер сборки добавляет GamePush;
- package ID и upload keystore неизменны;
- каждый загруженный ZIP хранить вместе с номером релиза;
- перед production сохранять APK, AAB, release notes и SHA-256 артефактов;
- откат в Google Play выполняется новым AAB с увеличенным version code, а не загрузкой старого файла.
