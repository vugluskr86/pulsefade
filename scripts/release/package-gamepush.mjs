import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const releaseDir = join(root, 'release');
const archive = join(releaseDir, 'pulsefade-gamepush-web.zip');

if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/index.html не найден. Выполните npm run build.');
  process.exit(1);
}
mkdirSync(releaseDir, { recursive: true });
rmSync(archive, { force: true });

let result;
if (process.platform === 'win32') {
  const escapedDist = dist.replaceAll("'", "''");
  const escapedArchive = archive.replaceAll("'", "''");
  result = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-Command', `Compress-Archive -Path '${escapedDist}\\*' -DestinationPath '${escapedArchive}' -Force`],
    { stdio: 'inherit' },
  );
} else {
  result = spawnSync('zip', ['-q', '-r', archive, '.'], { cwd: dist, stdio: 'inherit' });
}

if (result.error || result.status !== 0) {
  console.error('Не удалось создать ZIP. На Windows нужен PowerShell, на macOS/Linux — команда zip.');
  process.exit(result.status ?? 1);
}
console.log(`Готов архив для GamePush: ${archive}`);
