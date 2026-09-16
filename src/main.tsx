import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { config } from 'maplibre-gl';
import maplibreWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';
import App from './App.tsx';

// Vite bundles the library into a hashed app file, so MapLibre's default
// sibling worker URL 404s in production. Point it at the emitted worker.
config.WORKER_URL = maplibreWorker;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
