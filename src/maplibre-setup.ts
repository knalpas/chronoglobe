import { setWorkerUrl } from 'maplibre-gl';

// MapLibre's ESM worker imports ./maplibre-gl-shared.mjs as a sibling. Vite's
// hashed ?url copy of the worker leaves that import 404, so GeoJSON never
// parses and the globe stays an empty ocean. The build copies both files to
// /maplibre/ with their original names.
if (import.meta.env.PROD) {
  setWorkerUrl(new URL(`${import.meta.env.BASE_URL}maplibre/maplibre-gl-worker.mjs`, window.location.href).href);
}
