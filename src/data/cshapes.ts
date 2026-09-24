import type { FeatureCollection } from 'geojson';
import type { PreparedSnapshot } from '../lib/geo';
import { prepareSnapshot } from '../lib/geo';
import CSHAPES_CHANGE_YEARS from './cshapes-changes.json';

export const CSHAPES_START = 1886;
export const CSHAPES_END = 2019;

export { CSHAPES_CHANGE_YEARS };

export function cshapesMapYear(year: number): number {
  const y = Math.min(CSHAPES_END, Math.max(CSHAPES_START, year));
  let latest = CSHAPES_START;
  for (const c of CSHAPES_CHANGE_YEARS) {
    if (c <= y) latest = c;
    else break;
  }
  return latest;
}

export function usesCshapes(year: number): boolean {
  return year >= CSHAPES_START;
}

/** True if the unit’s interval overlaps calendar year `year`. */
export function cshapesOverlapsYear(start: number, end: number, year: number): boolean {
  const yStart = year * 10000 + 101;
  const yEnd = year * 10000 + 1231;
  return start <= yEnd && end >= yStart;
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
  const yEnd = y * 10000 + 1231;
  const chosen = new Map<number, (typeof raw.features)[number]>();
  for (const f of raw.features) {
    const p = f.properties as { start?: number; end?: number; gwcode?: number; fid?: number } | null;
    if (!p || p.start == null || p.end == null) continue;
    if (!cshapesOverlapsYear(p.start, p.end, y)) continue;
    const key = Number(p.gwcode ?? p.fid);
    const onDec31 = p.start <= yEnd && yEnd <= p.end;
    const prev = chosen.get(key);
    if (!prev) {
      chosen.set(key, f);
      continue;
    }
    const prevP = prev.properties as { start: number; end: number };
    const prevOnDec31 = prevP.start <= yEnd && yEnd <= prevP.end;
    if (onDec31 && !prevOnDec31) chosen.set(key, f);
  }
  return { type: 'FeatureCollection', features: [...chosen.values()] };
}

let warming = false;

function warmYearCache(raw: FeatureCollection) {
  if (warming) return;
  warming = true;
  const years = CSHAPES_CHANGE_YEARS.filter((y) => y >= CSHAPES_START && y <= CSHAPES_END);
  let i = 0;
  const step = () => {
    const end = Math.min(i + 3, years.length);
    for (; i < end; i++) {
      const y = years[i];
      if (yearCache.has(y)) continue;
      yearCache.set(y, Promise.resolve(prepareSnapshot(filterCshapesYear(raw, y))));
    }
    if (i < years.length) {
      const ric = globalThis.requestIdleCallback;
      if (ric) ric(step, { timeout: 250 });
      else setTimeout(step, 0);
    }
  };
  const ric = globalThis.requestIdleCallback;
  if (ric) ric(step, { timeout: 250 });
  else setTimeout(step, 0);
}

export function loadCshapesYear(year: number): Promise<PreparedSnapshot> {
  const y = cshapesMapYear(year);
  let p = yearCache.get(y);
  if (!p) {
    p = loadRaw().then((raw) => {
      warmYearCache(raw);
      return prepareSnapshot(filterCshapesYear(raw, y));
    });
    yearCache.set(y, p);
  }
  return p;
}
