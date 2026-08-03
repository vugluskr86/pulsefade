import { defineConfig } from 'vite';

// --mode gamepush  — сборка для GamePush (base: './', outDir: 'dist', без sourcemaps)
// без --mode        — сборка для GitHub Pages (base: '/pulsefade/', outDir: 'docs')

export default defineConfig(({ mode }) => {
  const isGamepush = mode === 'gamepush';

  return {
    base: isGamepush ? './' : '/pulsefade/',
    build: {
      target: 'es2020',
      sourcemap: !isGamepush,
      outDir: isGamepush ? 'dist' : 'docs',
      assetsDir: 'assets',
      emptyOutDir: true,
    },
    server: {
      // host: true -> открыть прототип с телефона в той же сети
      host: true,
      port: 5173,
    },
  };
});
