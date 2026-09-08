import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
