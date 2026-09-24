import type { Feature, FeatureCollection, MultiPolygon, Polygon, Point, MultiLineString, Position } from 'geojson';
import { classifyRegion, colorForPower, CULTURE_FILL, UNCLAIMED_FILL, type RegionKind } from './colors';

export interface RegionProps {
  fid: number;
  NAME?: string;
  SUBJECTO?: string;
  PARTOF?: string;
  ABBREVN?: string;
  BORDERPRECISION: number;
  // derived
  kind: RegionKind;
  color: string;
  power: string;
  areaKm2: number;
}

export type RegionFeature = Feature<MultiPolygon | Polygon, RegionProps>;

export interface LabelProps {
  fid: number;
  name: string;
  kind: RegionKind;
  /** 0 (largest) … n, rank of the region by area — drives text size & priority. */
  rank: number;
  areaKm2: number;
  color: string;
  /** 0–1, derived from area; drives MapLibre text size. */
  size: number;
}

export interface PreparedSnapshot {
  regions: FeatureCollection<MultiPolygon | Polygon, RegionProps>;
  labels: FeatureCollection<Point, LabelProps>;
}

/** Planar ring area (lon/lat degrees²) — only used to pick the largest polygon of a multipolygon. */
function ringArea(ring: Position[]): number {
  let s = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % n];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s / 2);
}

function largestRing(geom: MultiPolygon | Polygon): Position[] {
  if (geom.type === 'Polygon') return geom.coordinates[0];
  let best = geom.coordinates[0][0];
  let bestArea = -1;
  for (const poly of geom.coordinates) {
    const a = ringArea(poly[0]);
    if (a > bestArea) {
      bestArea = a;
      best = poly[0];
    }
  }
  return best;
}

function ringBboxCenter(ring: Position[]): Position {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

function approxAreaKm2(geom: MultiPolygon | Polygon): number {
  let deg2 = 0;
  if (geom.type === 'Polygon') deg2 = ringArea(geom.coordinates[0]);
  else for (const poly of geom.coordinates) deg2 += ringArea(poly[0]);
  return deg2 * 12321;
}

function labelSize(areaKm2: number): number {
  return Math.min(1, Math.max(0, (Math.log10(Math.max(areaKm2, 1)) - 4.3) / 2.9));
}

/**
 * Enrich a raw snapshot: classify regions, assign colours, and place one label
 * at the bbox centre of each region’s largest ring. Geometry is reused; the
 * source feature’s properties are left intact so CShapes can be filtered again.
 */
export function prepareSnapshot(raw: FeatureCollection): PreparedSnapshot {
  const regions: RegionFeature[] = [];
  const labelsRaw: Array<{ fid: number; name: string; kind: RegionKind; areaKm2: number; color: string; pt: Position }> = [];

  for (const f of raw.features) {
    if (!f.geometry || (f.geometry.type !== 'MultiPolygon' && f.geometry.type !== 'Polygon')) continue;
    const p = (f.properties ?? {}) as Partial<RegionProps>;
    const name = p.NAME;
    const precision = Number(p.BORDERPRECISION) || 1;
    const kind = classifyRegion(name, precision);
    const power = (p.SUBJECTO && p.SUBJECTO !== '3' ? p.SUBJECTO : name) ?? '';
    const color = kind === 'polity' ? colorForPower(power) : kind === 'culture' ? CULTURE_FILL : UNCLAIMED_FILL;
    const areaKm2 = approxAreaKm2(f.geometry);
    const fid = Number(p.fid ?? regions.length);
    const props: RegionProps = {
      fid,
      NAME: name,
      SUBJECTO: p.SUBJECTO,
      PARTOF: p.PARTOF,
      ABBREVN: p.ABBREVN,
      BORDERPRECISION: precision,
      kind,
      color,
      power,
      areaKm2,
    };
    regions.push({ type: 'Feature', id: fid, geometry: f.geometry, properties: props });

    if (name) {
      labelsRaw.push({ fid, name, kind, areaKm2, color, pt: ringBboxCenter(largestRing(f.geometry)) });
    }
  }

  labelsRaw.sort((a, b) => b.areaKm2 - a.areaKm2);
  const labels: Feature<Point, LabelProps>[] = labelsRaw.map((l, rank) => ({
    type: 'Feature',
    id: l.fid,
    geometry: { type: 'Point', coordinates: [l.pt[0], l.pt[1]] },
    properties: {
      fid: l.fid,
      name: l.name,
      kind: l.kind,
      rank,
      areaKm2: l.areaKm2,
      color: l.color,
      size: labelSize(l.areaKm2),
    },
  }));

  return {
    regions: { type: 'FeatureCollection', features: regions },
    labels: { type: 'FeatureCollection', features: labels },
  };
}

/** Graticule lines every `step` degrees, densified so they curve on the globe. */
export function graticule(step = 15): FeatureCollection<MultiLineString> {
  const lines: Position[][] = [];
  for (let lon = -180; lon <= 180; lon += step) {
    const line: Position[] = [];
    for (let lat = -85; lat <= 85; lat += 2) line.push([lon, lat]);
    lines.push(line);
  }
  for (let lat = -75; lat <= 75; lat += step) {
    const line: Position[] = [];
    for (let lon = -180; lon <= 180; lon += 2) line.push([lon, lat]);
    lines.push(line);
  }
  return {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates: lines } }],
  };
}
