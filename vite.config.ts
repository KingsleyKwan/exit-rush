import { defineConfig } from 'vite';

// Local `npm run dev` / default build → `/`.
// GitHub Pages project site → set BASE_PATH=/exit-rush/ (see .github/workflows/pages.yml).
const raw = process.env.BASE_PATH?.trim() || '/';
const base = raw.endsWith('/') ? raw : `${raw}/`;

const platform = process.env.VITE_PLATFORM === 'ios' ? 'ios' : 'web';

export default defineConfig({
  define: {
    __PLATFORM__: JSON.stringify(platform),
  },
  base,
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    // three.js is ~500 kB minified on its own; keep it in a separate, long-cacheable
    // vendor chunk so game-code updates don't re-download it.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes('node_modules/three') ? 'three' : undefined),
      },
    },
  },
});
