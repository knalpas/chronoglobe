import type { FeatureCollection } from 'geojson';
import type { PreparedSnapshot } from '../lib/geo';
import { prepareSnapshot } from '../lib/geo';
import CSHAPES_CHANGE_YEARS from './cshapes-changes.json';

export const CSHAPES_START = 1886;
export const CSHAPES_END = 2019;

export { CSHAPES_CHANGE_YEARS };

export function cshapesMapYear(year: number): number {
  return Math.min(CSHAPES_END, Math.max(CSHAPES_START, year));
}

export function usesCshapes(year: number): boolean {
  return year >= CSHAPES_START;
}

/** True if the unit exists on 31 December of `year`. */
export function cshapesActiveOnDec31(start: number, end: number, year: number): boolean {
  const dec31 = year * 10000 + 1231;
  return start <= dec31 && dec31 <= end;
}

export function nextCshapesChange(year: number): number | null {
  for (const y of CSHAPES_CHANGE_YEARS) {
    if (y > year) return y;
  }
  return year < CSHAPES_END ? CSHAPES_END : null;
}

function cshapesUrl(): string {
  return `${import.meta.env.BASE_URL}data/borders/cshapes.geojson`;
}

let rawCache: Promise<FeatureCollection> | null = null;
const yearCache = new Map<number, Promise<PreparedSnapshot>>();

function loadRaw(): Promise<FeatureCollection> {
  if (!rawCache) {
    rawCache = fetch(cshapesUrl()).then((r) => {
      if (!r.ok) throw new Error(`Failed to load CShapes: ${r.status}`);
      return r.json();
    });
  }
  return rawCache;
}

export function filterCshapesYear(raw: FeatureCollection, year: number): FeatureCollection {
  const y = cshapesMapYear(year);
  return {
    type: 'FeatureCollection',
    features: raw.features.filter((f) => {
      const p = f.properties as { start?: number; end?: number } | null;
      if (!p || p.start == null || p.end == null) return false;
      return cshapesActiveOnDec31(p.start, p.end, y);
    }),
  };
}

export function loadCshapesYear(year: number): Promise<PreparedSnapshot> {
  const y = cshapesMapYear(year);
  let p = yearCache.get(y);
  if (!p) {
    p = loadRaw().then((raw) => prepareSnapshot(filterCshapesYear(raw, y)));
    yearCache.set(y, p);
  }
  return p;
}
