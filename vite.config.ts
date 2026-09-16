import react from '@vitejs/plugin-react';
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

const root = dirname(fileURLToPath(import.meta.url));

/** Ship MapLibre's ESM worker + shared sibling so production can parse GeoJSON. */
function maplibreWorkerFiles(): Plugin {
  const files = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'] as const;
  const copyTo = (outDir: string) => {
    const dest = resolve(outDir, 'maplibre');
    mkdirSync(dest, { recursive: true });
    for (const file of files) {
      copyFileSync(resolve(root, 'node_modules/maplibre-gl/dist', file), resolve(dest, file));
    }
  };
  return {
    name: 'maplibre-worker-files',
    writeBundle(options) {
      copyTo(options.dir ?? resolve(root, 'dist'));
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react(), maplibreWorkerFiles()],
  server: {
    // Polling is a safe fallback where native file-system events are unavailable.
    watch: { usePolling: true, interval: 400 },
  },
  optimizeDeps: {
    // maplibre-gl ships its own worker bundle that the dep optimizer cannot rewrite.
    exclude: ['maplibre-gl'],
  },
  build: {
    chunkSizeWarningLimit: 1500,
  },
});
