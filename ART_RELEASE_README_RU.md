# PULSEFADE — art/content release pack

Добавлено для подготовки публикационных материалов:

```text
content/art/comfyui/
  models.json
  input/pulsefade-gameplay.png
  workflows/
    01_key_art_16x9.json
    02_feature_graphic_1024x500.json
    03_app_icon_1x1.json
    04_portrait_promo_background.json
    05_social_square.json
    06_upscale_realesrgan_4x.json
  api/
    *.api.json

content/store/metadata/
  ru.release.json
  en.release.json

docs/
  COMFYUI_ART_PIPELINE_RU.md
  ART_SERVICES_AND_PRODUCTION_PLAN_RU.md
  RELEASE_COPY_RU_EN.md
```

## С чего начать

1. Прочитать `docs/COMFYUI_ART_PIPELINE_RU.md`.
2. Установить модели из `content/art/comfyui/models.json`.
3. Открыть `03_app_icon_1x1.json` и `01_key_art_16x9.json`, сделать первые batch-генерации.
4. Выбрать визуальное направление, не меняя базовую палитру игры.
5. Финальную иконку очистить/перерисовать в Recraft/Figma.
6. Реальные gameplay screenshots собирать с generated background только в Figma.
7. Вставить RU/EN тексты из `content/store/metadata/*.release.json`.

Случайные community LoRA/checkpoints в production pack намеренно не добавлены: сначала требуется зафиксировать их коммерческую лицензию.
