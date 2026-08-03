import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}

if (!existsSync(dist)) fail('dist/ не найден. Сначала выполните npm run build.');
if (!existsSync(join(dist, 'index.html'))) fail('dist/index.html отсутствует.');
if (!existsSync(join(dist, 'icons', 'icon-512.png'))) fail('Нет dist/icons/icon-512.png для Android build.');
if (!existsSync(join(dist, 'icons', 'loading-logo.png'))) fail('Нет dist/icons/loading-logo.png для splash screen.');

if (existsSync(join(dist, 'index.html'))) {
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  const absoluteAsset = /(?:src|href)=["']\/(?!\/)/i.test(html);
  if (absoluteAsset) fail('index.html содержит абсолютный путь /...; для GamePush нужен base: ./');
  if (!/viewport-fit=cover/.test(html)) warnings.push('В viewport отсутствует viewport-fit=cover.');
}

let totalBytes = 0;
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path);
    else {
      totalBytes += stat.size;
      if (name.endsWith('.map')) warnings.push(`Sourcemap в релизе: ${relative(dist, path)}`);
    }
  }
}
if (existsSync(dist)) walk(dist);

if (totalBytes > 50 * 1024 * 1024) {
  warnings.push(`Размер dist ${(totalBytes / 1024 / 1024).toFixed(1)} MiB. Проверьте лимиты площадок.`);
}

for (const message of warnings) console.warn(`WARN: ${message}`);
if (failures.length) {
  for (const message of failures) console.error(`ERROR: ${message}`);
  process.exit(1);
}
console.log(`GamePush build OK: ${(totalBytes / 1024).toFixed(1)} KiB, index.html в корне dist/.`);
