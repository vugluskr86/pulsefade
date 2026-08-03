import { defineConfig } from 'vite';

export default defineConfig({
  base: '/pulsefade/',
  server: {
    // host: true -> открыть прототип с телефона в той же сети
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    outDir: 'docs',
  },
});
