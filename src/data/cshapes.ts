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

let rawData: FeatureCollection | null = null;
let rawInflight: Promise<FeatureCollection> | null = null;
let rawAc: AbortController | null = null;
const yearCache = new Map<number, PreparedSnapshot>();

function aborted(): never {
  throw new DOMException('Aborted', 'AbortError');
}

function loadRaw(signal?: AbortSignal): Promise<FeatureCollection> {
  if (rawData) {
    if (signal?.aborted) aborted();
    return Promise.resolve(rawData);
  }
  if (!rawInflight) {
    rawAc = new AbortController();
    rawInflight = fetch(cshapesUrl(), { signal: rawAc.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load CShapes: ${r.status}`);
        return r.json() as Promise<FeatureCollection>;
      })
      .then((data) => {
        rawData = data;
        rawInflight = null;
        rawAc = null;
        return data;
      })
      .catch((err) => {
        rawInflight = null;
        rawAc = null;
        throw err;
      });
  }
  return rawInflight.then((data) => {
    if (signal?.aborted) aborted();
    return data;
  });
}

/** Drop an in-flight CShapes download when the user has left that era. */
export function cancelCshapesDownload() {
  rawAc?.abort();
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

export async function loadCshapesYear(year: number, signal?: AbortSignal): Promise<PreparedSnapshot> {
  const y = cshapesMapYear(year);
  const hit = yearCache.get(y);
  if (hit) {
    if (signal?.aborted) aborted();
    return hit;
  }
  const raw = await loadRaw(signal);
  if (signal?.aborted) aborted();
  const prepared = prepareSnapshot(filterCshapesYear(raw, y));
  yearCache.set(y, prepared);
  return prepared;
}
