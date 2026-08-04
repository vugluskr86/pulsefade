# PULSEFADE — сервисы и план производства релизного арта

## Рекомендуемый стек

### 1. ComfyUI + FLUX.1-schnell — основа

Использовать для пакетной генерации key art, абстрактных фонов, icon concepts и вариаций композиции. Это самый воспроизводимый вариант: prompt, seed и workflow можно хранить в Git.

**Роль:** production generation.

### 2. Recraft — векторизация и финальная иконка

Лучше всего использовать после ComfyUI:

- перерисовать выбранный icon concept в чистый vector;
- собрать логомарк;
- делать SVG-версии геометрических элементов;
- быстро адаптировать один стиль к нескольким форматам.

Для коммерческого релиза нужен paid plan: у Recraft Free assets коммерческое использование запрещено, paid assets дают коммерческие права по текущим условиям сервиса.

**Роль:** vector cleanup / icon / brand shapes.

### 3. Figma — обязательный финальный этап

Здесь собираются:

- Feature Graphic;
- screenshot cards;
- RU/EN captions;
- safe zones;
- шаблоны всех aspect ratio;
- экспорт PNG/JPEG/WebP.

Главное преимущество — AI не отвечает за текст и не придумывает игровой UI.

**Роль:** source of truth для store layouts.

### 4. Ideogram — быстрые типографические концепты

Можно использовать, чтобы искать идею заголовка/постера, потому что сервис хорошо работает с текстом. Но финальный логотип и надписи всё равно переносить в Figma/Recraft.

По текущим Terms Ideogram не ограничивает использование User Output, включая коммерческие задачи; перед релизом всё равно сохранить ссылку/снимок актуальных условий.

**Роль:** typography moodboard, не final typesetting.

### 5. Adobe Firefly / Photoshop Generative Fill

Удобен для:

- outpaint готового key art;
- расширения 1:1 -> 16:9 / 2:1;
- удаления мелких артефактов;
- подготовки safe zone без полной перегенерации.

Adobe указывает, что Firefly outputs можно применять коммерчески; доступность сервиса зависит от региона и плана. Если внутри Firefly выбран partner model, отдельно проверять условия именно этой модели.

**Роль:** cleanup / outpaint / conservative edit.

### 6. Midjourney — концепт-арт, не основная производственная линия

Полезен для поиска неожиданного направления key art. Но воспроизводимость хуже, чем у ComfyUI, а права зависят от условий подписки; для компаний с выручкой выше $1M действуют отдельные требования к плану.

**Роль:** moodboard / art direction exploration.

### 7. Real-ESRGAN / Upscayl

Для PULSEFADE достаточно локального `RealESRGAN_x4plus.pth` через ComfyUI. Это удобнее, чем отправлять финальный private artwork во внешний cloud upscaler.

**Роль:** final upscale where needed.

## Что не стоит отдавать генеративной модели

Не генерировать:

- реальные store screenshots;
- интерфейс игры;
- leaderboard с выдуманными именами;
- score и достижения;
- название игры внутри изображения;
- возрастные рейтинги, store badges, логотип Google Play/VK/Yandex;
- рекламные обещания (`№1`, `best`, `free forever`, награды, которых нет).

## Производственный pipeline

```text
Real gameplay screenshot
        |
        +--------------------------+
        |                          |
ComfyUI FLUX                   Figma layout
key art/background                 |
        |                          |
   shortlist                       |
        |                          |
Recraft cleanup/icon --------------+
        |
Real-ESRGAN only if necessary
        |
Figma: RU/EN typography + screenshot composition
        |
Platform exports
        |
QA against actual build
```

## Master assets

Сначала делать master, потом экспортировать варианты:

| Master | Размер | Назначение |
|---|---:|---|
| App icon | 1024×1024 | источник для 512×512 и Android icons |
| Feature graphic | 2048×1000 | Google Play 1024×500 + wide portals |
| Hero 16:9 | 1920×1080 | portals, trailer cover, web |
| Portrait promo | 1080×1920 | mobile screenshot card |
| Landscape screenshot card | 1920×1080 | desktop/web portals |
| Square card | 1080×1080 | Telegram/VK/social/catalog |
| Social OG | 1200×630 | web previews |

## Store screenshot pack

Вместо пяти почти одинаковых кадров подготовить пять историй:

1. **Core loop** — реальный кадр с кольцом и центральной зоной.
2. **Perfect streak** — реальный кадр с высокой серией/множителем.
3. **Tempo shift** — кадр, где визуально видно ускорение/замедление/особый цвет.
4. **Five modes** — реальный экран выбора режимов.
5. **Best streak replay** — кадр повторения серии или результата.

Каждый screenshot layout существует в RU и EN, но gameplay под ним остаётся одним и тем же, если UI локализован непосредственно внутри build.

## Batch plan

Для каждого generated master:

- 16 seeds в ComfyUI;
- 4 остаются после первого просмотра;
- 2 проверяются в реальном store layout;
- 1 идёт в финал;
- icon — дополнительно vector cleanup;
- feature/hero — при необходимости outpaint;
- upscale только после выбора финала.

Итого на первый релиз нужно сгенерировать примерно 60–80 черновых картинок, а не пытаться получить «идеальный prompt с первого раза».

## Приоритет на первую публикацию

P0:

- icon;
- Google Play feature graphic;
- 5 portrait screenshots RU;
- 5 portrait screenshots EN;
- 16:9 hero;
- 1 square catalog card.

P1:

- landscape screenshots;
- Telegram/VK promo card;
- 15-second trailer;
- alternate seasonal key art.

P2:

- A/B variants store icon / first screenshot;
- achievement artwork;
- cosmetic unlock artwork.
