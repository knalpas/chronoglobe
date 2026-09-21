#!/usr/bin/env node
/**
 * Downloads CShapes 2.0 (Schvitz et al. 2022, ETH Zurich), keeps the fields we
 * need to filter by year, simplifies geometry, and writes:
 *   public/data/borders/cshapes.geojson
 *   src/data/cshapes-changes.json
 *
 * Source: https://icr.ethz.ch/data/cshapes/
 * Cite: Schvitz et al., Journal of Conflict Resolution 66(1), 2022.
 *
 * Usage: node scripts/fetch-cshapes.mjs [--force] [--keep=18%]
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import mapshaper from 'mapshaper';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_GEO = path.join(ROOT, 'public/data/borders/cshapes.geojson');
const OUT_YEARS = path.join(ROOT, 'src/data/cshapes-changes.json');
const SRC = 'https://icr.ethz.ch/data/cshapes/CShapes-2.0.geojson';

const args = process.argv.slice(2);
const force = args.includes('--force');
const keep = (args.find((a) => a.startsWith('--keep=')) ?? '--keep=18%').split('=')[1];

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function ymd(year, month, day) {
  return year * 10000 + month * 100 + day;
}

function pickOwner(p) {
  const owner =
    p.owner ??
    p.OWNER ??
    p.colonizer ??
    p.COLONIZER ??
    p.capname_owner ??
    p.status;
  return typeof owner === 'string' && owner.trim() && owner !== p.cntry_name ? owner.trim() : undefined;
}

async function main() {
  if (!force && (await exists(OUT_GEO)) && (await exists(OUT_YEARS))) {
    console.log('CShapes already present (use --force to refresh).');
    return;
  }

  process.stdout.write(`↓ CShapes 2.0 (${SRC}) … `);
  const res = await fetch(SRC);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const rawText = await res.text();
  console.log(`${(rawText.length / 1024 / 1024).toFixed(1)} MB`);

  const raw = JSON.parse(rawText);
  console.log(`${raw.features.length} source features`);
  const keys = new Set();
  const changes = new Set([1886]);
  let fid = 0;
  for (const f of raw.features) {
    const p = f.properties ?? {};
    Object.keys(p).forEach((k) => keys.add(k));
    const startY = Number(p.gwsyear);
    const endY = Number(p.gweyear);
    const startM = Number(p.gwsmonth) || 1;
    const startD = Number(p.gwsday) || 1;
    const endM = Number(p.gwemonth) || 12;
    const endD = Number(p.gweday) || 31;
    if (Number.isFinite(startY)) changes.add(startY);
    if (Number.isFinite(endY) && endY < 9999) {
      changes.add(endY);
      if (endM === 1 && endD <= 2) {
        /* geometry often ends on 1–2 Jan of the replacement year */
      } else {
        changes.add(endY + 1);
      }
    }
    f.properties = {
      fid: fid++,
      NAME: String(p.cntry_name ?? '').trim(),
      SUBJECTO: pickOwner(p),
      gwcode: Number(p.gwcode) || fid,
      start: ymd(startY, startM, startD),
      end: ymd(endY || 2019, endM, endD),
      BORDERPRECISION: 3,
    };
  }
  console.log('property keys:', [...keys].join(', '));

  const slim = JSON.stringify({ type: 'FeatureCollection', features: raw.features });
  process.stdout.write(`simplify ${keep} … `);
  const output = await mapshaper.applyCommands(
    `-i in.geojson -simplify ${keep} keep-shapes weighted -o out.geojson precision=0.002 format=geojson`,
    { 'in.geojson': slim },
  );
  const parsed = JSON.parse(output['out.geojson']);
  parsed.features = parsed.features.filter((f) => f.geometry);
  const simplified = JSON.stringify(parsed);
  await mkdir(path.dirname(OUT_GEO), { recursive: true });
  await writeFile(OUT_GEO, simplified);
  const years = [...changes].filter((y) => y >= 1886 && y <= 2019).sort((a, b) => a - b);
  await writeFile(OUT_YEARS, JSON.stringify(years));
  console.log(`${(simplified.length / 1024 / 1024).toFixed(2)} MB, ${years.length} change years → ${OUT_GEO}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
