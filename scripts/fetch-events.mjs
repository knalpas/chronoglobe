#!/usr/bin/env node
/**
 * Pulls extra historical events from Wikidata (CC0) and writes
 * src/data/wikidata-events.json. Curated events in events.ts stay the
 * “major” layer; these are importance 1 only and are de-duplicated against
 * that list by English Wikipedia title.
 *
 * Queries use exact P31 matches (no subclass walk) and small year chunks so
 * they stay under the public SPARQL timeout.
 *
 * Usage: npm run fetch-events
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../src/data/wikidata-events.json');
const EVENTS_TS = path.resolve(__dirname, '../src/data/events.ts');
const ENDPOINT = 'https://query.wikidata.org/sparql';
const UA = 'Chronoglobe/1.0 (historical atlas; educational; mailto:chronoglobe@localhost)';
const TIMEOUT_MS = 45_000;

/** Narrow year windows — WDQS times out on wide + subclass queries. */
const RANGES = [
  [-4999, -3000],
  [-2999, -2000],
  [-1999, -1500],
  [-1499, -1000],
  [-999, -500],
  [-499, -1],
  [1, 200],
  [201, 400],
  [401, 600],
  [601, 800],
  [801, 1000],
  [1001, 1200],
  [1201, 1400],
  [1401, 1500],
  [1501, 1600],
  [1601, 1700],
  [1701, 1750],
  [1751, 1800],
  [1801, 1850],
  [1851, 1875],
  [1876, 1900],
  [1901, 1918],
  [1919, 1939],
  [1940, 1945],
  [1946, 1960],
  [1961, 1975],
  [1976, 1989],
  [1990, 2000],
  [2001, 2010],
  [2011, new Date().getFullYear()],
];

const CLASSES = [
  'Q178561', // battle
  'Q188055', // siege
  'Q180684', // conflict
  'Q1267927', // military campaign
  'Q198', // war
  'Q350604', // armed conflict
  'Q124757', // massacre
  'Q6251', // treaty
  'Q31963', // peace treaty
  'Q10931', // revolution
  'Q273557', // rebellion
  'Q45382', // coup d'état
  'Q22247', // epidemic
  'Q18123741', // pandemic
  'Q12184', // plague
  'Q8065', // natural disaster
  'Q7944', // earthquake
  'Q167390', // volcanic eruption
  'Q8063', // flood
  'Q168247', // famine
  'Q210574', // expedition
  'Q1413836', // exploration
  'Q591634', // circumnavigation
  'Q184188', // invention
  'Q645883', // discovery
  'Q49836', // synod
  'Q163337', // ecumenical council
];

const CLASS_TO_CATEGORY = [
  [/Q178561|Q188055|Q180684|Q1267927|Q198|Q350604|Q124757/, 'war'],
  [/Q6251|Q31963|Q10931|Q273557|Q45382/, 'politics'],
  [/Q22247|Q18123741|Q12184|Q8065|Q7944|Q167390|Q8063|Q168247/, 'disaster'],
  [/Q210574|Q1413836|Q591634/, 'exploration'],
  [/Q184188|Q645883/, 'science'],
  [/Q49836|Q163337/, 'religion'],
];

function categoryFor(classIds) {
  const blob = classIds.join(' ');
  for (const [re, cat] of CLASS_TO_CATEGORY) {
    if (re.test(blob)) return cat;
  }
  return 'politics';
}

function minSitelinks(year) {
  if (year < 1) return 8;
  if (year <= 1500) return 12;
  if (year <= 1800) return 16;
  return 22;
}

function sparql(from, to, sitelinkFloor) {
  const values = CLASSES.map((id) => `wd:${id}`).join(' ');
  return `
SELECT ?item ?itemLabel ?date ?coord ?wiki ?sitelinks ?class WHERE {
  VALUES ?class { ${values} }
  ?item wdt:P31 ?class .
  ?item wdt:P585 ?date .
  FILTER(YEAR(?date) >= ${from} && YEAR(?date) <= ${to})
  ?item wikibase:sitelinks ?sitelinks .
  FILTER(?sitelinks >= ${sitelinkFloor})
  { ?item wdt:P625 ?coord . } UNION { ?item wdt:P276 ?loc . ?loc wdt:P625 ?coord . }
  ?sitelink schema:about ?item ;
            schema:isPartOf <https://en.wikipedia.org/> ;
            schema:name ?wiki .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
`.trim();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function queryOnce(from, to) {
  const floor = Math.min(minSitelinks(from), minSitelinks(to));
  const url = `${ENDPOINT}?query=${encodeURIComponent(sparql(from, to, floor))}&format=json`;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/sparql-results+json', 'User-Agent': UA },
      signal: ac.signal,
    });
    if (res.status === 429 || res.status === 503) {
      const err = new Error(`Wikidata ${res.status} for ${from}–${to}`);
      err.retryable = true;
      throw err;
    }
    if (!res.ok) {
      const body = await res.text();
      const err = new Error(`Wikidata ${res.status} for ${from}–${to}: ${body.slice(0, 240)}`);
      err.retryable = res.status >= 500 || /timeout|time.?out/i.test(body);
      throw err;
    }
    return res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeout = new Error(`timeout ${from}–${to}`);
      timeout.retryable = true;
      throw timeout;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function queryRange(from, to, attempt = 1) {
  try {
    return await queryOnce(from, to);
  } catch (err) {
    if (!err.retryable || attempt >= 3) {
      if (from < to && (err.retryable || /timeout|429|503/i.test(String(err)))) {
        const mid = Math.floor((from + to) / 2);
        process.stdout.write(`split ${from}–${to} → `);
        await sleep(1200);
        const a = await queryRange(from, mid);
        await sleep(800);
        const b = await queryRange(mid + 1, to);
        return {
          results: { bindings: [...(a.results?.bindings ?? []), ...(b.results?.bindings ?? [])] },
        };
      }
      throw err;
    }
    await sleep(2500 * attempt);
    return queryRange(from, to, attempt + 1);
  }
}

function parseYear(xsd) {
  const m = String(xsd).match(/^([+-]?)(\d+)/);
  if (!m) return null;
  const n = Number(m[2]);
  return m[1] === '-' ? -n : n;
}

function parseCoord(wkt) {
  const m = String(wkt).match(/Point\(\s*([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)\s*\)/i);
  if (!m) return null;
  const lon = Number(m[1]);
  const lat = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

function wikiKey(title) {
  return title.replace(/ /g, '_').replace(/^https?:\/\/en\.wikipedia\.org\/wiki\//, '').toLowerCase();
}

function curatedWikiKeys(source) {
  const keys = new Set();
  const slugRe = /, '(?:politics|war|culture|science|religion|exploration|disaster|economy)', \d, '([^']+)'/g;
  let m;
  while ((m = slugRe.exec(source))) keys.add(wikiKey(m[1]));
  return keys;
}

function tidyTitle(label, wiki) {
  const raw = (label && label !== wiki.replace(/_/g, ' ') ? label : wiki.replace(/_/g, ' ')).trim();
  return raw.replace(/\s+\(\d{3,4}.*\)$/, '').replace(/\s+/g, ' ').slice(0, 90);
}

const BATTLE_TITLE = /^(battle|siege|skirmish)\b/i;

function keepWikidataEvent(e) {
  if (BATTLE_TITLE.test(e.title)) return false;
  if (BATTLE_TITLE.test(String(e.wiki).replace(/_/g, ' '))) return false;
  return true;
}

function qid(uri) {
  return uri.replace(/.*\/entity\//, '');
}

function formatYearLabel(year) {
  return year <= 0 ? `${1 - year} BC` : String(year);
}

async function main() {
  const curatedSrc = await readFile(EVENTS_TS, 'utf8');
  const skip = curatedWikiKeys(curatedSrc);
  const byWiki = new Map();

  for (const [from, to] of RANGES) {
    process.stdout.write(`Wikidata ${from}–${to} … `);
    const json = await queryRange(from, to);
    const rows = json.results?.bindings ?? [];
    let kept = 0;
    for (const row of rows) {
      const year = parseYear(row.date?.value);
      const coord = parseCoord(row.coord?.value);
      const wiki = row.wiki?.value;
      const label = row.itemLabel?.value;
      if (year == null || !coord || !wiki) continue;
      if (year < -4999 || year > new Date().getFullYear()) continue;
      const sl = Number(row.sitelinks?.value ?? 0);
      if (sl < minSitelinks(year)) continue;
      const key = wikiKey(wiki);
      if (skip.has(key)) continue;
      if (/list of |timeline of |in popular culture/i.test(label ?? wiki)) continue;
      const classId = (row.class?.value ?? '').replace(/.*\//, '');
      const prev = byWiki.get(key);
      if (prev && prev.sitelinks >= sl) {
        if (classId) {
          const cats = new Set([prev._class, classId].filter(Boolean));
          prev.category = categoryFor([...cats]);
          prev._class = [...cats].join(' ');
        }
        continue;
      }
      byWiki.set(key, {
        id: `wd:${qid(row.item.value)}`,
        year,
        title: tidyTitle(label, wiki),
        summary: `Recorded on Wikidata as an event in ${formatYearLabel(year)}. Open Wikipedia to read the article and check the date.`,
        lat: Math.round(coord.lat * 1000) / 1000,
        lon: Math.round(coord.lon * 1000) / 1000,
        category: categoryFor([classId]),
        importance: 1,
        wiki: wiki.replace(/ /g, '_'),
        source: 'wikidata',
        sitelinks: sl,
        approx: false,
        _class: classId,
      });
      kept++;
    }
    console.log(`${rows.length} rows, ${kept} kept (${byWiki.size} unique)`);
    await sleep(700);
  }

  const events = [...byWiki.values()]
    .map(({ _class, ...rest }) => rest)
    .filter(keepWikidataEvent)
    .sort((a, b) => a.year - b.year || b.sitelinks - a.sitelinks);
  await writeFile(OUT, `${JSON.stringify(events, null, 2)}\n`);
  console.log(`\n✓ ${events.length} extra events → ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
