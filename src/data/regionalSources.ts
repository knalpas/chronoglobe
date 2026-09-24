import { BC } from '../lib/time';

/**
 * How Chronoglobe picks a geometry when several datasets cover the same place.
 *
 * The CShapes seam (1886) was a *world* swap: every polygon changed style at
 * once, coastlines jumped, and holes appeared. Regional data must never do that.
 *
 * Rules:
 *  1. Exactly one `world` source is drawn for a year (basemaps, then CShapes).
 *  2. A `patch` may replace world polygons *only inside its mask* (bbox and/or
 *     world feature names). Everything outside the mask stays on the world layer.
 *  3. Patches do not overlay. If two patches overlap, the higher `precision`
 *     wins; the loser is erased inside the winner’s mask.
 *  4. `geometryKind: 'polygon'` may become fills. Lines and points are labels
 *     or frontiers — never a second political map.
 */
export type SourceRole = 'world' | 'patch';
export type GeometryKind = 'polygon' | 'line' | 'point';

/** West, south, east, north in WGS84. */
export type BBox = [number, number, number, number];

export interface DataSource {
  id: string;
  label: string;
  role: SourceRole;
  /** 1 = schematic, 5 = atlas-grade. Higher wins inside an overlapping mask. */
  precision: 1 | 2 | 3 | 4 | 5;
  license: string;
  attribution: string;
  url: string;
  notes: string;
}

export interface RegionalPatch {
  id: string;
  sourceId: string;
  label: string;
  precision: 1 | 2 | 3 | 4 | 5;
  geometryKind: GeometryKind;
  /** Inclusive astronomical years this patch may apply. */
  years: [number, number];
  /** Only rewrite the globe inside this box. */
  bbox: BBox;
  /** World-layer names to cut out even if they spill slightly past the bbox. */
  replaceNames: string[];
  /** Ready to cookie-cut into fills. Lines/points stay off the fill merge. */
  ready: boolean;
  files: string[];
  notes: string;
}

export const DATA_SOURCES: DataSource[] = [
  {
    id: 'basemaps',
    label: 'historical-basemaps',
    role: 'world',
    precision: 2,
    license: 'GPL-3.0',
    attribution: 'André Ourednik and contributors, historical-basemaps',
    url: 'https://github.com/aourednik/historical-basemaps',
    notes:
      'World snapshots we already ship. Classical Greece is one “Greek city-states” blob; imperial Rome is one “Roman Empire” polygon.',
  },
  {
    id: 'cshapes',
    label: 'CShapes 2.0',
    role: 'world',
    precision: 3,
    license: 'CC BY 4.0',
    attribution: 'Schvitz et al. 2022, CShapes 2.0',
    url: 'https://icr.ethz.ch/data/cshapes/',
    notes:
      'Independent states from 1886. Keep as the modern *world* layer, not as a patch. The 1885–86 coastline jump is why patches must stay regional.',
  },
  {
    id: 'awmc',
    label: 'Ancient World Mapping Center',
    role: 'patch',
    precision: 4,
    license: 'ODbL 1.0',
    attribution: 'Ancient World Mapping Center, derived from the Barrington Atlas',
    url: 'https://github.com/AWMC/geodata',
    notes:
      'Best open Mediterranean specialist. Empire *extent* files are polygons. The “provinces” files on GitHub are LineStrings (frontiers), not fills — they cannot replace the Roman blob until polygonised.',
  },
  {
    id: 'pleiades',
    label: 'Pleiades',
    role: 'patch',
    precision: 4,
    license: 'CC BY 3.0',
    attribution: 'Pleiades / Institute for the Study of the Ancient World',
    url: 'https://pleiades.stoa.org/downloads',
    notes:
      'Gazetteer of places (mostly points). Excellent for naming Athens, Sparta, Corinth. Not polis territories.',
  },
  {
    id: 'hansen',
    label: 'Inventory of Archaic and Classical Poleis',
    role: 'patch',
    precision: 4,
    license: 'see Stanford POLIS / Odyssey Maps terms',
    attribution: 'Hansen & Nielsen 2005; Stanford POLIS; Odyssey Maps digitisation',
    url: 'https://www.odysseymaps.io/polis-inventory/',
    notes:
      '1,035 poleis as points plus a territory-size figure. Circles can hint at scale; they are not historical borders. There is no open polygon set of individual Greek city-state territories.',
  },
  {
    id: 'magis',
    label: 'MAGIS / Pleiades regions',
    role: 'patch',
    precision: 3,
    license: 'CC BY',
    attribution: 'Pedar Foss / AWMC / Pelagios (Barrington Atlas regions)',
    url: 'https://github.com/pelagios/magis-pleiades-regions',
    notes:
      'Geographic regions (Attica, Boeotia, Laconia…), not independent poleis. A possible Aegean patch so the map says “Attica” instead of one Greek blob — still not Athens-vs-Sparta politics.',
  },
  {
    id: 'cliopatria',
    label: 'Cliopatria',
    role: 'world',
    precision: 2,
    license: 'CC BY 4.0',
    attribution: 'Seshat / Chalstrey, Bennett et al., Scientific Data 2025',
    url: 'https://zenodo.org/records/20274630',
    notes:
      'Worldwide polities with FromYear/ToYear, but traced from ~40 km rasters and smoothed. Do not swap it in as the world layer — same class of seam as CShapes. Revisit only as a tightly boxed patch if a year actually names separate Greek states.',
  },
  {
    id: 'dare',
    label: 'Digital Atlas of the Roman Empire',
    role: 'patch',
    precision: 4,
    license: 'CC BY-SA 3.0',
    attribution: 'Johan Åhlfeldt, Digital Atlas of the Roman Empire',
    url: 'https://dh.gu.se/dare/',
    notes: 'Places and a historical basemap, not yearly political fills. Use for sites, not borders.',
  },
];

/** Mediterranean + NW Europe box used by AWMC Roman extents. */
const ROMAN_MASK: BBox = [-11, 23, 45, 61];
/** Aegean / southern Balkans / western Anatolia. */
const AEGEAN_MASK: BBox = [18, 34, 30, 43];

export const REGIONAL_PATCHES: RegionalPatch[] = [
  {
    id: 'awmc-roman-extent-200',
    sourceId: 'awmc',
    label: 'Roman Empire extent c. 200',
    precision: 4,
    geometryKind: 'polygon',
    years: [180, 235],
    bbox: ROMAN_MASK,
    replaceNames: ['Roman Empire'],
    ready: false,
    files: [
      'https://github.com/AWMC/geodata/tree/master/Cultural-Data/political_shading/roman_empire_ce_200_extent',
    ],
    notes: 'Better outline than basemaps, still one fill. Enable after the GeoJSON is fetched and simplified.',
  },
  {
    id: 'awmc-roman-provinces-200',
    sourceId: 'awmc',
    label: 'Roman provincial frontiers c. 200',
    precision: 4,
    geometryKind: 'line',
    years: [180, 235],
    bbox: ROMAN_MASK,
    replaceNames: ['Roman Empire'],
    ready: false,
    files: [
      'Cultural-Data/political_shading/roman_empire_ce_200_provinces/roman_empire_ce_200_provinces.geojson',
    ],
    notes:
      'Inspected: Feature geometries are LineStrings (no names like “Aegyptus”). Cannot cookie-cut fills until polygonised.',
  },
  {
    id: 'awmc-roman-extent-117',
    sourceId: 'awmc',
    label: 'Roman Empire extent c. 117',
    precision: 4,
    geometryKind: 'polygon',
    years: [98, 130],
    bbox: ROMAN_MASK,
    replaceNames: ['Roman Empire'],
    ready: false,
    files: [
      'https://github.com/AWMC/geodata/tree/master/Cultural-Data/political_shading/roman_empire_ce_117_extent',
    ],
    notes: 'Trajanic maximum. Same combine rule as 200: cut “Roman Empire” on the world layer, insert this outline.',
  },
  {
    id: 'awmc-roman-60bc',
    sourceId: 'awmc',
    label: 'Roman Republic extent c. 60 BC',
    precision: 4,
    geometryKind: 'polygon',
    years: [BC(80), BC(44)],
    bbox: ROMAN_MASK,
    replaceNames: ['Roman Republic', 'Rome'],
    ready: false,
    files: [
      'https://github.com/AWMC/geodata/tree/master/Cultural-Data/political_shading/roman_empire_bce_60',
    ],
    notes: 'Late Republic. World files still say “Roman Republic” as a coarse Italy-plus blob.',
  },
  {
    id: 'magis-aegean-regions',
    sourceId: 'magis',
    label: 'Barrington regions in the Aegean',
    precision: 3,
    geometryKind: 'polygon',
    years: [BC(700), BC(323)],
    bbox: AEGEAN_MASK,
    replaceNames: ['Greek city-states', 'Greek colonies'],
    ready: false,
    files: ['https://github.com/pelagios/magis-pleiades-regions'],
    notes:
      'Would split the Greek blob into Attica, Boeotia, Laconia, etc. Those are regions, not governments. Still more precise than one label.',
  },
  {
    id: 'hansen-poleis-points',
    sourceId: 'hansen',
    label: 'Archaic and Classical poleis (points)',
    precision: 4,
    geometryKind: 'point',
    years: [BC(650), BC(325)],
    bbox: AEGEAN_MASK,
    replaceNames: [],
    ready: false,
    files: ['https://www.odysseymaps.io/polis-inventory/'],
    notes:
      'Do not erase the world fill. Add as labels so a click can name Athens or Sparta. Territory is a size number, not a border.',
  },
];

export function worldSourceId(year: number): 'cshapes' | 'basemaps' {
  return year >= 1886 ? 'cshapes' : 'basemaps';
}

export function patchesForYear(year: number): RegionalPatch[] {
  return REGIONAL_PATCHES.filter((p) => year >= p.years[0] && year <= p.years[1]).sort(
    (a, b) => a.precision - b.precision,
  );
}

/** Highest-precision ready patch that wants this world feature name removed. */
export function winningPatchForName(name: string, year: number): RegionalPatch | null {
  const hits = patchesForYear(year).filter((p) => p.ready && p.geometryKind === 'polygon' && p.replaceNames.includes(name));
  if (!hits.length) return null;
  return hits[hits.length - 1];
}
