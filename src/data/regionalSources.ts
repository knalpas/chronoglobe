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
  /**
   * `names` (default): drop only replaceNames, keep every other world polity
   * even if its centroid sits in the bbox (Parthia next to Rome, etc.).
   * `names+bbox` is too close to the CShapes year-cut — do not use unless the
   * specialist actually tiles the whole box.
   */
  cutMode: 'names' | 'names+bbox';
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
      'Inspected 2026-09-24. Extent files are unnamed Polygon islands (200 CE: 112 parts, no NAME). GitHub “provinces” are 81 LineStrings with empty PROVINCE_1. Regional names are 2,618 MultiLineString label-curves (Attica, Boeotia, Laconia exist) — labels, not fills.',
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
    license: 'CC BY 4.0 (Stanford SDR)',
    attribution: 'Hansen & Nielsen 2005; Ober et al., Stanford POLIS (SDR hv891rg8328)',
    url: 'https://purl.stanford.edu/hv891rg8328',
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
      'Inspected 147 named polygons. Names are late-Roman / mixed-period provinces (Aegyptus Herculia, Haemimontus, Aquitania I/II), not Attica or Boeotia. Do not cookie-cut into 500 BC. Not a clean single-year Roman layer either — principal and Diocletianic names sit in one file.',
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
    notes:
      'Places and tiles, CC BY-SA 3.0. The usable fill extract is klokantech/roman-empire data/provinces.geojson (DARE-derived): 53 named MultiPolygons (Britannia, Aegyptus, Achaia…). Italy is Augustan regions I–XI. Looks Trajanic/Hadrianic (Dacia, Iudaea, Armenia Mesopotamia). Repo has no LICENSE; treat the data as DARE CC BY-SA.',
  },
  {
    id: 'pazout',
    label: 'Pazout / Mazzamurro Roman provinces 200 CE',
    role: 'patch',
    precision: 4,
    license: 'ODbL 1.0 (AWMC) + CC BY-SA 4.0 (repo)',
    attribution: 'AWMC; Adam Pažout 2023 correction; Mazzamurro et al. roman-road-networks',
    url: 'https://github.com/MatteoMazzamurro/roman-road-networks/tree/main/data/roman_provinces_simple',
    notes:
      'Named polygon shapefile (Achaia, Aegyptus, Italian regiones). 55 MB raw .shp — must simplify before shipping. This is the polygonised 200 CE provinces that AWMC’s GeoJSON never became.',
  },
];

/** Mediterranean + NW Europe box used by AWMC Roman extents. */
const ROMAN_MASK: BBox = [-11, 23, 45, 61];
/** Aegean / southern Balkans / western Anatolia. */
const AEGEAN_MASK: BBox = [18, 34, 30, 43];

export const REGIONAL_PATCHES: RegionalPatch[] = [
  {
    id: 'dare-provinces-117',
    sourceId: 'dare',
    label: 'DARE Roman provinces (Trajanic / Hadrianic)',
    precision: 4,
    geometryKind: 'polygon',
    years: [98, 138],
    bbox: ROMAN_MASK,
    replaceNames: ['Roman Empire'],
    cutMode: 'names',
    ready: false,
    files: ['https://raw.githubusercontent.com/klokantech/roman-empire/master/data/provinces.geojson'],
    notes:
      'Inspected: 53 named MultiPolygons, ~15k vertices, bbox ≈ −9.4–43.8 E, 23.0–55.0 N. First honest named-fill replacement for the world “Roman Empire” blob (world_100 is one feature, BORDERPRECISION 1, 1,579 verts, east edge 48.3° — ~4° further than DARE). Italy labels are I–XI. Cookie-cut by name only so Parthia / Germania stay. Needs mapshaper simplify + NAME field + attribution.',
  },
  {
    id: 'pazout-provinces-200',
    sourceId: 'pazout',
    label: 'Named Roman provinces c. 200',
    precision: 4,
    geometryKind: 'polygon',
    years: [180, 235],
    bbox: ROMAN_MASK,
    replaceNames: ['Roman Empire'],
    cutMode: 'names',
    ready: false,
    files: [
      'https://github.com/MatteoMazzamurro/roman-road-networks/tree/main/data/roman_provinces_simple',
    ],
    notes:
      'DBF lists Achaia, Aegyptus, Africa Proconsularis, Italian regiones (not I–XI). Raw shapefile is 55 MB. Better 200 CE fill than AWMC’s unnamed extent or the world blob (world_200: one feature, BORDERPRECISION 1).',
  },
  {
    id: 'awmc-roman-extent-200',
    sourceId: 'awmc',
    label: 'Roman Empire extent c. 200',
    precision: 3,
    geometryKind: 'polygon',
    years: [180, 235],
    bbox: ROMAN_MASK,
    replaceNames: ['Roman Empire'],
    cutMode: 'names',
    ready: false,
    files: [
      'https://raw.githubusercontent.com/AWMC/geodata/master/Cultural-Data/political_shading/roman_empire_ce_200_extent/roman_empire_ce_200_extent.geojson',
    ],
    notes:
      'Inspected: 112 unnamed Polygons (island/land fragments), no NAME. Must dissolve and stamp NAME=Roman Empire or labels vanish. Outline only — Pazout provinces win on precision if both are ready.',
  },
  {
    id: 'awmc-roman-provinces-200',
    sourceId: 'awmc',
    label: 'Roman provincial frontiers c. 200',
    precision: 4,
    geometryKind: 'line',
    years: [180, 235],
    bbox: ROMAN_MASK,
    replaceNames: [],
    cutMode: 'names',
    ready: false,
    files: [
      'https://raw.githubusercontent.com/AWMC/geodata/master/Cultural-Data/political_shading/roman_empire_ce_200_provinces/roman_empire_ce_200_provinces.geojson',
    ],
    notes:
      'Inspected: 81 LineStrings, PROVINCE10/PROVINCE_1 are 0. Frontiers only. Do not treat as fills.',
  },
  {
    id: 'awmc-roman-extent-117',
    sourceId: 'awmc',
    label: 'Roman Empire extent c. 117',
    precision: 3,
    geometryKind: 'polygon',
    years: [98, 130],
    bbox: ROMAN_MASK,
    replaceNames: ['Roman Empire'],
    cutMode: 'names',
    ready: false,
    files: [
      'https://raw.githubusercontent.com/AWMC/geodata/master/Cultural-Data/political_shading/roman_empire_ce_117_extent/roman_empire_ce_117_extent.geojson',
    ],
    notes: 'Same shape as 200: 112 unnamed polygons. DARE named provinces are the better 117 patch.',
  },
  {
    id: 'awmc-roman-60bc',
    sourceId: 'awmc',
    label: 'Roman Republic extent c. 60 BC',
    precision: 3,
    geometryKind: 'polygon',
    years: [BC(80), BC(44)],
    bbox: ROMAN_MASK,
    replaceNames: ['Roman Republic', 'Rome'],
    cutMode: 'names',
    ready: false,
    files: [
      'https://raw.githubusercontent.com/AWMC/geodata/master/Cultural-Data/political_shading/roman_empire_bce_60/roman_empire_bce_60.geojson',
    ],
    notes: 'Inspected: 74 unnamed Polygons, bbox −7.3–38.6 E, 30.8–46.4 N. Still one polity after dissolve.',
  },
  {
    id: 'magis-late-roman',
    sourceId: 'magis',
    label: 'MAGIS late-Roman regions (not classical Greece)',
    precision: 2,
    geometryKind: 'polygon',
    years: [284, 400],
    bbox: ROMAN_MASK,
    replaceNames: ['Roman Empire'],
    cutMode: 'names',
    ready: false,
    files: [
      'https://raw.githubusercontent.com/pelagios/magis-pleiades-regions/main/pleiades-regions-magis-pelagios.geojson',
    ],
    notes:
      'Earlier guess that this was Attica/Boeotia was wrong. 120 unique names, Diocletianic mix. Held at precision 2 until someone splits a single epoch. Do not apply to the Greek city-state centuries.',
  },
  {
    id: 'awmc-greek-region-labels',
    sourceId: 'awmc',
    label: 'Barrington region name-curves (Aegean)',
    precision: 4,
    geometryKind: 'line',
    years: [BC(700), BC(323)],
    bbox: AEGEAN_MASK,
    replaceNames: [],
    cutMode: 'names',
    ready: false,
    files: [
      'https://raw.githubusercontent.com/AWMC/geodata/master/Cultural-Data/regional_name_linework/regional_names_linework.geojson',
    ],
    notes:
      'Inspected: TITLE includes Attica, Boeotia, Lacedaemon/Laconia, Argolis, Arcadia, Corinthia, Aetolia, Phocis, Euboea, Messenia, Ionia, Macedonia. Lines for labels only — do not erase the Greek blob. World bc500 “Greek city-states” is three blobs (Aegean + Italy + south Gaul), 349 verts on the Aegean piece.',
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
    cutMode: 'names',
    ready: false,
    files: [
      'https://purl.stanford.edu/hv891rg8328',
      'https://www.odysseymaps.io/polis-inventory/',
    ],
    notes:
      'CC BY 4.0 via Stanford SDR. Points + territory-size figure, not borders. No open GeoJSON URL — SDR tables or Odyssey “copy GeoJSON”. Do not erase the world fill. This is the only honest way to name Athens or Sparta.',
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
