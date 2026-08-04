# PULSEFADE — ComfyUI pipeline для релизного арта

## 1. Цель

ComfyUI используется не для генерации «фальшивых скриншотов», а для создания:

- key art / hero art;
- фонов для карточек магазина;
- концепта иконки;
- фонов для portrait/landscape screenshot layouts;
- квадратных карточек для Telegram/VK/соцсетей;
- апскейла выбранных изображений.

**Игровой HUD и скриншоты должны оставаться настоящими.** Генеративная модель не должна придумывать экран игры, score, кнопки или режимы: это повышает риск получить красивый, но недостоверный store listing.

## 2. Основная модель

Для релизных материалов рекомендован **FLUX.1-schnell**.

Почему именно он:

- официальный workflow поддерживается ComfyUI;
- хорошее следование сложному графическому prompt;
- достаточно 1–4 шагов, в наших blueprint стоит 4;
- FLUX.1-schnell опубликован под Apache 2.0 и заявлен разработчиком как пригодный для коммерческого использования;
- нам не нужны лица, персонажи или фотореализм — сильные стороны модели хорошо совпадают с геометрическим стилем PULSEFADE.

### Файлы

```text
ComfyUI/
  models/
    diffusion_models/
      flux1-schnell.safetensors
    text_encoders/
      t5xxl_fp8_e4m3fn.safetensors
      clip_l.safetensors
    vae/
      ae.safetensors
    upscale_models/
      RealESRGAN_x4plus.pth
```

Источники:

- `black-forest-labs/FLUX.1-schnell`
- `comfyanonymous/flux_text_encoders`
- `xinntao/Real-ESRGAN` releases

Полный машинно-читаемый список лежит в `content/art/comfyui/models.json`.

### Если мало VRAM

Можно использовать `flux1-schnell-fp8.safetensors` из `Comfy-Org/flux1-schnell` в `models/checkpoints/` и встроенный шаблон ComfyUI **Flux.1 Schnell FP8 Checkpoint**.

Наши workflow JSON намеренно построены на full FLUX graph — так одинаковые prompt и параметры не зависят от конкретного repack checkpoint.

## 3. Установка

1. Обновить ComfyUI до актуальной stable-версии.
2. Скачать модели из списка выше.
3. Разложить по указанным каталогам.
4. Перезапустить ComfyUI.
5. Открыть `Workflow -> Open` и выбрать JSON из `content/art/comfyui/workflows/`.
6. Проверить, что loader nodes видят нужные файлы.
7. Нажать Queue.

В blueprints используются только core nodes ComfyUI, без Manager-зависимостей и custom node packs.

## 4. Blueprints

### `01_key_art_16x9.json`

Главный hero/key art. Генерируется 1536×864. Использовать для:

- web-каталогов;
- лендинга;
- базового artwork для 16:9;
- trailer thumbnail.

Композиция специально оставляет тихую область слева под ручную надпись `PULSEFADE`.

### `02_feature_graphic_1024x500.json`

Wide master под Google Play Feature Graphic и похожие баннеры. Генерируется 1536×768, затем вручную кадрируется в 1024×500.

### `03_app_icon_1x1.json`

Концепт иконки 1024×1024. После выбора результата **не экспортировать AI-результат вслепую**. Нужно:

1. выбрать одну простую форму;
2. перерисовать её в Recraft/Figma/Illustrator;
3. проверить 48×48, 64×64, 128×128;
4. экспортировать master и 512×512.

Иконка: cyan ring + amber timing notch + magenta core. Без текста.

### `04_portrait_promo_background.json`

Вертикальный фон 1024×1536 для мобильных screenshot cards. Поверх него в Figma кладётся **настоящий** portrait screenshot.

### `05_social_square.json`

Квадратная карточка 1024×1024 для Telegram, VK, постов, подборок и store thumbnails.

### `06_upscale_realesrgan_4x.json`

Core workflow `LoadImage -> RealESRGAN_x4plus -> SaveImage`.

Перед запуском скопировать исходник в `ComfyUI/input/` и выбрать его в LoadImage. В репозитории приложен `content/art/comfyui/input/pulsefade-gameplay.png` как пример исходного gameplay screenshot.

## 5. API blueprints

В `content/art/comfyui/api/` лежат те же схемы в prompt/API-формате. Они нужны, если позже генерацию ассетов автоматизировать через локальный ComfyUI API/очередь.

## 6. Визуальный контракт PULSEFADE

Базовая палитра для маркетинга должна продолжать саму игру:

```text
Background:  #10070E / почти чёрный бордовый
Cyan pulse:  #6FE5FF
Amber beat:  #FFB044
Magenta miss:#D24367
Neutral ring:#A89CA8
```

Геометрия:

- окружности и дуги;
- concentric target;
- небольшие tick marks;
- один доминирующий импульс;
- минимум декоративного шума;
- negative space важнее количества деталей.

Нельзя превращать визуал в sci-fi shooter, synthwave city, музыкальный плеер или персонажную игру — это будет обещать не тот продукт.

## 7. Prompt discipline

Prompt лучше писать по-английски. В каждом prompt фиксировать:

1. `minimalist futuristic rhythm arcade`;
2. точную палитру;
3. `concentric pulse rings`;
4. назначение композиции — icon / banner / portrait background;
5. область negative space;
6. запреты: `no people, no characters, no readable text, no letters, no logos, no watermark`.

FLUX Schnell обычно не нуждается в отдельном negative prompt; запреты записаны прямо в основной prompt.

## 8. Важное правило по тексту

**Не генерировать название PULSEFADE внутри картинки.** Даже модели с хорошей типографикой могут менять буквы между вариантами. Название, слоган, CTA и screenshot captions ставятся после генерации в Figma/Recraft.

Так мы получаем:

- одинаковый логотип на всех площадках;
- правильную локализацию RU/EN;
- контролируемую safe zone;
- отсутствие AI-опечаток.

## 9. Отбор

Для каждого типа ассета:

1. 12–20 seed-вариантов;
2. shortlist из 3;
3. тест в маленьком размере;
4. проверка на соответствие реальной игре;
5. ручная чистка;
6. upscale только финального варианта;
7. сохранение seed, workflow JSON, prompt и исходника рядом с финальным файлом.

Рекомендуемая структура production outputs:

```text
content/art/production/
  icon/
  key-art/
  feature-graphic/
  screenshot-backgrounds/
  social/
  source/
    workflows/
    prompts/
    licenses/
```

## 10. Лицензии

Для каждого финального AI-ассета хранить:

- название модели;
- точное имя weight-файла;
- ссылку на model card;
- дату загрузки;
- копию/ссылку на license;
- workflow + seed;
- сведения о ручной доработке.

Не использовать для релиза случайные LoRA/checkpoints только потому, что они дают красивее картинку. Если лицензия не понятна — такой результат остаётся концептом, а не production asset.
