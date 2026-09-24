import { formatYear } from './time';

export interface PolitySummary {
  title: string;
  extract: string;
  url: string;
}

const cache = new Map<string, PolitySummary | null>();

const SKIP =
  /video game|album|recording|film|song\b|band\b|language|dialect|given name|family name|surname|ship\b|genus|species|football team|national team|battleship/i;
const HISTORICAL =
  /ancient|historical|former|empire|kingdom|civilization|civilisation|sultanate|caliphate|khanate|dynasty|republic|duchy|people|tribe|confederation|city-state|pharaoh|medieval/i;
const MODERN = /country in|sovereign state|member state|nation state/i;

type WdHit = { id: string; label: string; description: string };

function cacheKey(name: string, year: number) {
  return `${name.toLowerCase()}|${year}`;
}

function astroFromParts(n: number, bc: boolean): number {
  return bc ? 1 - n : n;
}

/** Best-effort range from a Wikidata description, e.g. "period from 1570 to 1069 BC". */
export function yearsFromDescription(desc: string): [number, number] | null {
  const millennia = desc.match(/from the (\d+)(?:st|nd|rd|th) millennium BC/i);
  if (millennia) {
    const n = Number(millennia[1]);
    return [1 - n * 1000, 400];
  }
  const rangeBc = desc.match(
    /(?:from\s+)?(\d{3,4})\s*(?:to|–|-|—)\s*(\d{3,4})\s*BC/i,
  );
  if (rangeBc) {
    return [astroFromParts(Number(rangeBc[1]), true), astroFromParts(Number(rangeBc[2]), true)].sort(
      (a, b) => a - b,
    ) as [number, number];
  }
  const rangeAd = desc.match(/(?:from\s+)?(\d{3,4})\s*(?:to|–|-|—)\s*(\d{3,4})(?!\s*BC)/i);
  if (rangeAd) {
    const a = Number(rangeAd[1]);
    const b = Number(rangeAd[2]);
    if (a >= 100 && b >= 100 && b - a < 2500) return [a, b];
  }
  return null;
}

function scoreHit(hit: WdHit, name: string, year: number): number {
  const desc = hit.description || '';
  if (SKIP.test(desc)) return -1000;
  const label = hit.label || '';
  const nameLc = name.toLowerCase();
  const labelLc = label.toLowerCase();
  let score = 0;
  if (labelLc === nameLc) score += 6;
  else if (labelLc.includes(nameLc) || nameLc.includes(labelLc)) score += 3;
  const range = yearsFromDescription(desc);
  if (range) {
    if (year >= range[0] && year <= range[1]) {
      const span = Math.max(1, range[1] - range[0]);
      score += 22 + Math.round(800 / Math.min(span, 800));
    } else {
      score -= 12;
    }
  } else if (year < 500) {
    if (HISTORICAL.test(desc)) score += 8;
    if (MODERN.test(desc)) score -= 10;
  } else if (year >= 1800) {
    if (MODERN.test(desc)) score += 8;
    if (HISTORICAL.test(desc) && !MODERN.test(desc)) score -= 3;
  } else if (HISTORICAL.test(desc)) {
    score += 4;
  }
  return score;
}

async function wikiJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`wiki ${r.status}`);
  return r.json() as Promise<T>;
}

async function searchEntities(name: string): Promise<WdHit[]> {
  const url =
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}` +
    `&language=en&limit=8&format=json&origin=*`;
  const data = await wikiJson<{ search?: Array<{ id: string; label?: string; description?: string }> }>(url);
  return (data.search ?? []).map((h) => ({
    id: h.id,
    label: h.label ?? '',
    description: h.description ?? '',
  }));
}

async function enwikiTitle(id: string): Promise<string | null> {
  const url =
    `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${id}` +
    `&props=sitelinks&sitefilter=enwiki&format=json&origin=*`;
  const data = await wikiJson<{
    entities?: Record<string, { sitelinks?: { enwiki?: { title?: string } } }>;
  }>(url);
  return data.entities?.[id]?.sitelinks?.enwiki?.title ?? null;
}

async function pageSummary(title: string): Promise<PolitySummary | null> {
  const slug = encodeURIComponent(title.replace(/ /g, '_'));
  const data = await wikiJson<{
    type?: string;
    title?: string;
    extract?: string;
    content_urls?: { desktop?: { page?: string } };
  }>(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`);
  if (data.type === 'disambiguation' || !data.extract) return null;
  return {
    title: data.title || title,
    extract: clipExtract(data.extract),
    url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${slug}`,
  };
}

function clipExtract(text: string, max = 440): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= max) return trimmed;
  const slice = trimmed.slice(0, max);
  const stop = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('? '));
  if (stop > 140) return slice.slice(0, stop + 1);
  return `${slice.replace(/\s+\S*$/, '')}…`;
}

/**
 * Short Wikipedia lead for a mapped polity, preferring the Wikidata item
 * whose dates / description match the year on the timeline.
 */
export async function fetchPolitySummary(name: string, year: number): Promise<PolitySummary | null> {
  const key = cacheKey(name, year);
  if (cache.has(key)) return cache.get(key) ?? null;

  const queries = [name];
  if (year < 1800) {
    queries.push(`Kingdom of ${name}`, `Empire of ${name}`);
    if (year < 500) queries.push(`Ancient ${name}`);
  }
  const seen = new Set<string>();
  const hits: WdHit[] = [];
  for (const q of queries) {
    for (const h of await searchEntities(q)) {
      if (seen.has(h.id)) continue;
      seen.add(h.id);
      hits.push(h);
    }
  }
  const ranked = hits
    .map((h) => ({ h, score: scoreHit(h, name, year) }))
    .filter((x) => x.score > -20)
    .sort((a, b) => b.score - a.score);

  let result: PolitySummary | null = null;
  for (const { h } of ranked.slice(0, 4)) {
    const title = (await enwikiTitle(h.id)) ?? h.label;
    if (!title) continue;
    result = await pageSummary(title);
    if (result) break;
  }

  if (!result) {
    result = await pageSummary(name);
  }

  cache.set(key, result);
  return result;
}

export function briefingHint(year: number): string {
  return `Wikipedia lead · chosen for ${formatYear(year, { ad: false })}`;
}
