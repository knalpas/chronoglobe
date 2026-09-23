import polylabel from 'polylabel';
import area from '@turf/area';
import bbox from '@turf/bbox';
import difference from '@turf/difference';
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

function largestPolygon(geom: MultiPolygon | Polygon): Position[][] {
  if (geom.type === 'Polygon') return geom.coordinates;
  let best = geom.coordinates[0];
  let bestArea = -1;
  for (const poly of geom.coordinates) {
    const a = ringArea(poly[0]);
    if (a > bestArea) {
      bestArea = a;
      best = poly;
    }
  }
  return best;
}

/**
 * Enrich a raw snapshot: classify regions, assign colours, compute areas and
 * generate one label anchor per region (pole of inaccessibility of its largest
 * polygon, so labels sit well inside irregular shapes).
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
    const areaKm2 = area(f as Feature) / 1e6;
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
      const poly = largestPolygon(f.geometry);
      const pt = polylabel(poly as [number, number][][], 0.25) as unknown as Position;
      labelsRaw.push({ fid, name, kind, areaKm2, color, pt });
    }
  }

  labelsRaw.sort((a, b) => b.areaKm2 - a.areaKm2);
  const labels: Feature<Point, LabelProps>[] = labelsRaw.map((l, rank) => ({
    type: 'Feature',
    id: l.fid,
    geometry: { type: 'Point', coordinates: [l.pt[0], l.pt[1]] },
    properties: { fid: l.fid, name: l.name, kind: l.kind, rank, areaKm2: l.areaKm2, color: l.color },
  }));

  return {
    regions: { type: 'FeatureCollection', features: regions },
    labels: { type: 'FeatureCollection', features: labels },
  };
}

function pointInRing(ring: Position[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function pointInFeature(geom: Polygon | MultiPolygon, lon: number, lat: number): boolean {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  for (const poly of polys) {
    if (!pointInRing(poly[0], lon, lat)) continue;
    let hole = false;
    for (let i = 1; i < poly.length; i++) {
      if (pointInRing(poly[i], lon, lat)) hole = true;
    }
    if (!hole) return true;
  }
  return false;
}

export function pointInRegions(
  fc: FeatureCollection<Polygon | MultiPolygon, RegionProps>,
  lon: number,
  lat: number,
): boolean {
  for (const f of fc.features) {
    if (f.geometry && pointInFeature(f.geometry, lon, lat)) return true;
  }
  return false;
}

function boxesOverlap(a: [number, number, number, number], b: [number, number, number, number]): boolean {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

function dropSmallParts(geom: Polygon | MultiPolygon, minKm2: number): Polygon | MultiPolygon | null {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  const kept = polys.filter((poly) => {
    const km2 = area({ type: 'Feature', geometry: { type: 'Polygon', coordinates: poly }, properties: {} }) / 1e6;
    return km2 >= minKm2;
  });
  if (!kept.length) return null;
  if (kept.length === 1) return { type: 'Polygon', coordinates: kept[0] };
  return { type: 'MultiPolygon', coordinates: kept };
}

const MIN_GAP_KM2 = 8000;

/**
 * Keep only underlay polities that sit in holes of `cover`, and clip them so
 * they cannot overlap cover polygons (1880 Arabia vs CShapes Egypt, etc.).
 */
export function clipUnderlayToGaps(underlay: PreparedSnapshot, cover: PreparedSnapshot): PreparedSnapshot {
  const coverBoxes = cover.regions.features.map((f) => ({
    f,
    box: bbox(f) as [number, number, number, number],
  }));
  const coverNames = new Set(
    cover.regions.features.map((f) => f.properties.NAME?.toLowerCase()).filter((n): n is string => !!n),
  );
  const regions: RegionFeature[] = [];
  const labelsRaw: Array<{ fid: number; name: string; kind: RegionKind; areaKm2: number; color: string; pt: Position }> = [];

  for (const feat of underlay.regions.features) {
    const name = feat.properties.NAME;
    if (feat.properties.kind !== 'polity' || !name) continue;
    if (coverNames.has(name.toLowerCase())) continue;
    const label = underlay.labels.features.find((l) => l.properties.fid === feat.properties.fid);
    const pt = label?.geometry.coordinates;
    if (!pt || pointInRegions(cover.regions, pt[0], pt[1])) continue;

    const featBox = bbox(feat) as [number, number, number, number];
    const neighbors = coverBoxes.filter(({ box }) => boxesOverlap(featBox, box)).map(({ f }) => f);
    let geom = feat.geometry;
    if (neighbors.length) {
      try {
        const clipped = difference({
          type: 'FeatureCollection',
          features: [feat, ...neighbors],
        });
        if (!clipped || (clipped.geometry.type !== 'Polygon' && clipped.geometry.type !== 'MultiPolygon')) continue;
        const cleaned = dropSmallParts(clipped.geometry, MIN_GAP_KM2);
        if (!cleaned) continue;
        geom = cleaned;
      } catch {
        continue;
      }
    }

    const areaKm2 = area({ type: 'Feature', geometry: geom, properties: {} }) / 1e6;
    if (areaKm2 < MIN_GAP_KM2) continue;

    const props = { ...feat.properties, areaKm2 };
    regions.push({ type: 'Feature', id: props.fid, geometry: geom, properties: props });

    const poly = largestPolygon(geom);
    const labelPt = pointInFeature(geom, pt[0], pt[1])
      ? pt
      : (polylabel(poly as [number, number][][], 0.25) as unknown as Position);
    labelsRaw.push({
      fid: props.fid,
      name,
      kind: props.kind,
      areaKm2,
      color: props.color,
      pt: labelPt,
    });
  }

  labelsRaw.sort((a, b) => b.areaKm2 - a.areaKm2);
  const labels: Feature<Point, LabelProps>[] = labelsRaw.map((l, rank) => ({
    type: 'Feature',
    id: l.fid,
    geometry: { type: 'Point', coordinates: [l.pt[0], l.pt[1]] },
    properties: { fid: l.fid, name: l.name, kind: l.kind, rank, areaKm2: l.areaKm2, color: l.color },
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
