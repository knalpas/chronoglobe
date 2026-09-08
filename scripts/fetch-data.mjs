#!/usr/bin/env node
/**
 * Downloads the historical border snapshots from aourednik/historical-basemaps
 * (GPL-3.0, https://github.com/aourednik/historical-basemaps), simplifies them
 * with mapshaper (topology-aware, so shared borders stay watertight) and writes
 * them to public/data/borders/.
 *
 * Usage:  node scripts/fetch-data.mjs [--force] [--keep=30%]
 */
import { mkdir, writeFile, access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import mapshaper from 'mapshaper';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../public/data/borders');
const RAW_BASE = 'https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/';

// Snapshot file suffixes present in the upstream repository (5000 BC → 2010).
const SNAPSHOTS = [
  'bc5000', 'bc4000', 'bc3000', 'bc2000', 'bc1500', 'bc1000', 'bc700', 'bc500', 'bc400',
  'bc323', 'bc300', 'bc200', 'bc100', 'bc1', '100', '200', '300', '400', '500', '600',
  '700', '800', '900', '1000', '1100', '1200', '1279', '1300', '1400', '1492', '1500',
  '1530', '1600', '1650', '1700', '1715', '1783', '1800', '1815', '1880', '1900', '1914',
  '1920', '1930', '1938', '1945', '1960', '1994', '2000', '2010',
];

const args = process.argv.slice(2);
const force = args.includes('--force');
const keep = (args.find((a) => a.startsWith('--keep=')) ?? '--keep=30%').split('=')[1];

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function download(url, attempt = 1) {
  const res = await fetch(url);
  if (!res.ok) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
      return download(url, attempt + 1);
    }
    throw new Error(`${res.status} ${res.statusText} for ${url}`);
  }
  return res.text();
}

/** Normalise properties: trim names, drop empty strings, add a stable numeric id. */
function normalise(geojsonText) {
  const data = JSON.parse(geojsonText);
  let fid = 0;
  for (const f of data.features) {
    const p = f.properties ?? {};
    const clean = {};
    for (const key of ['NAME', 'SUBJECTO', 'PARTOF', 'ABBREVN']) {
      const v = typeof p[key] === 'string' ? p[key].trim() : null;
      if (v) clean[key] = v;
    }
    clean.BORDERPRECISION = Number(p.BORDERPRECISION) || 1;
    clean.fid = fid++;
    f.properties = clean;
  }
  return JSON.stringify(data);
}

async function simplify(inputText, name) {
  const inputs = { [`${name}.geojson`]: inputText };
  const cmd = `-i ${name}.geojson -simplify ${keep} keep-shapes weighted -clean -o ${name}.out.geojson precision=0.001 format=geojson`;
  const output = await mapshaper.applyCommands(cmd, inputs);
  return output[`${name}.out.geojson`];
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  let done = 0;
  const manifest = [];
  for (const suffix of SNAPSHOTS) {
    const outFile = path.join(OUT_DIR, `world_${suffix}.geojson`);
    if (!force && (await exists(outFile))) {
      const stat = (await readFile(outFile)).length;
      manifest.push({ suffix, bytes: stat });
      done++;
      continue;
    }
    const url = `${RAW_BASE}world_${suffix}.geojson`;
    process.stdout.write(`↓ world_${suffix} … `);
    const raw = await download(url);
    const normalised = normalise(raw);
    const simplified = await simplify(normalised, `world_${suffix}`);
    const bytes = Buffer.byteLength(simplified);
    await writeFile(outFile, simplified);
    manifest.push({ suffix, bytes });
    done++;
    console.log(`${(raw.length / 1024).toFixed(0)} KB → ${(bytes / 1024).toFixed(0)} KB (${done}/${SNAPSHOTS.length})`);
  }
  await writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  const total = manifest.reduce((s, m) => s + m.bytes, 0);
  console.log(`\n✓ ${manifest.length} snapshots, ${(total / 1024 / 1024).toFixed(1)} MB total → ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
