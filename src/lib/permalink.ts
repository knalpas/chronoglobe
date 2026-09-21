import { clampYear } from './time';

/** `1492`, `44bc`, `ad476`. */
export function yearToParam(year: number): string {
  if (year <= 0) return `${1 - year}bc`;
  return String(year);
}

export function paramToYear(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/\s+/g, '');
  if (!s) return null;
  const bc = s.match(/^(\d+) ?(bc|bce)$/);
  if (bc) return clampYear(1 - Number(bc[1]));
  const ad = s.match(/^(ad|ce)?(\d+)$/);
  if (ad) return clampYear(Number(ad[2]));
  if (/^-?\d+$/.test(s)) return clampYear(Number(s));
  return null;
}

export function yearFromLocation(loc: Pick<Location, 'search' | 'hash'> = window.location): number | null {
  const query = new URLSearchParams(loc.search).get('year');
  if (query) {
    const y = paramToYear(query);
    if (y !== null) return y;
  }
  const hash = loc.hash.replace(/^#/, '');
  if (!hash) return null;
  const fromHash = hash.startsWith('year=') ? hash.slice(5) : hash;
  return paramToYear(fromHash);
}

export function writeYearToLocation(year: number) {
  const url = new URL(window.location.href);
  url.searchParams.set('year', yearToParam(year));
  url.hash = '';
  const next = `${url.pathname}${url.search}`;
  const cur = `${window.location.pathname}${window.location.search}`;
  if (next !== cur) window.history.replaceState({ year }, '', next);
}

