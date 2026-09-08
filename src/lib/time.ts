/**
 * Time model.
 *
 * Years are stored as *astronomical* integers: AD years are positive,
 * 1 BC is 0, 2 BC is -1, etc. (i.e. `astro = 1 - bcYear`). This keeps the
 * arithmetic continuous — there is no gap where "year 0" would be — while
 * still displaying historically conventional labels ("44 BC", "AD 476").
 */

export const MIN_YEAR = 1 - 5000; // 5000 BC
export const MAX_YEAR = new Date().getFullYear();

/** Convert a BC year (positive number) to the internal astronomical year. */
export const BC = (bcYear: number): number => 1 - bcYear;

export function clampYear(y: number): number {
  return Math.min(MAX_YEAR, Math.max(MIN_YEAR, Math.round(y)));
}

export interface FormatYearOptions {
  /** Prefix approximate years with "c." */
  approx?: boolean;
  /** Use "AD" prefix for years < 1000 (default true). */
  ad?: boolean;
}

export function formatYear(year: number, opts: FormatYearOptions = {}): string {
  const approx = opts.approx ? 'c. ' : '';
  if (year <= 0) return `${approx}${1 - year} BC`;
  const ad = opts.ad ?? true;
  if (ad && year < 1000) return `${approx}AD ${year}`;
  return `${approx}${year}`;
}

/** Short label variant for dense tick marks: "5000 BC", "500", "1900". */
export function formatYearShort(year: number): string {
  if (year <= 0) return `${1 - year} BC`;
  return String(year);
}

/**
 * Non-linear time scale. Recent centuries carry far more datable history
 * (and far more border snapshots) than the deep past, so the slider gives
 * them proportionally more room. The mapping is piecewise-linear through
 * these breakpoints: [year, fraction of track width].
 */
const BREAKPOINTS: Array<[number, number]> = [
  [MIN_YEAR, 0.0],
  [BC(1000), 0.11],
  [1, 0.25],
  [1000, 0.41],
  [1500, 0.54],
  [1800, 0.69],
  [MAX_YEAR, 1.0],
];

export function yearToFraction(year: number): number {
  const y = Math.min(MAX_YEAR, Math.max(MIN_YEAR, year));
  for (let i = 1; i < BREAKPOINTS.length; i++) {
    const [y0, f0] = BREAKPOINTS[i - 1];
    const [y1, f1] = BREAKPOINTS[i];
    if (y <= y1) return f0 + ((y - y0) / (y1 - y0)) * (f1 - f0);
  }
  return 1;
}

export function fractionToYear(fraction: number): number {
  const f = Math.min(1, Math.max(0, fraction));
  for (let i = 1; i < BREAKPOINTS.length; i++) {
    const [y0, f0] = BREAKPOINTS[i - 1];
    const [y1, f1] = BREAKPOINTS[i];
    if (f <= f1) return y0 + ((f - f0) / (f1 - f0)) * (y1 - y0);
  }
  return MAX_YEAR;
}

/** Years represented by one unit of track fraction at a given year (local slope). */
export function yearsPerFraction(year: number): number {
  const y = Math.min(MAX_YEAR - 1, Math.max(MIN_YEAR, year));
  for (let i = 1; i < BREAKPOINTS.length; i++) {
    const [y0, f0] = BREAKPOINTS[i - 1];
    const [y1, f1] = BREAKPOINTS[i];
    if (y < y1) return (y1 - y0) / (f1 - f0);
  }
  return 1;
}

/**
 * How many years of "tolerance" we apply when deciding which events belong
 * to the selected year. Older periods are dated more loosely, so the window
 * widens as we go back in time.
 */
export function eventWindow(year: number): number {
  if (year >= 1800) return 0;
  if (year >= 1500) return 1;
  if (year >= 1000) return 2;
  if (year >= 1) return 5;
  if (year >= BC(1000)) return 15;
  if (year >= BC(2000)) return 40;
  return 100;
}

/** Sensible tick spacing for a given span of years (used by the lens). */
export function niceStep(spanYears: number, targetTicks = 8): number {
  const raw = spanYears / targetTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))));
  const candidates = [1, 2, 5, 10].map((m) => m * mag);
  return candidates.find((c) => c >= raw) ?? candidates[candidates.length - 1];
}
