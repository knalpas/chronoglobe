import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { BBox, RegionalPatch } from '../data/regionalSources';

/**
 * Cookie-cut a world FeatureCollection with regional patches.
 *
 * This is a *combine*, not an overlay: world features that the patch is
 * allowed to replace are dropped, then the patch polygons are appended.
 * Features outside the mask (Han China next to Rome, Persia next to the
 * Aegean) are left untouched — unlike the CShapes year-cut, which rebuilt
 * the entire planet.
 *
 * Full geometric erase (clip leftover slivers) belongs in the build script
 * via mapshaper. This function is the discriminant: names + bbox + precision.
 */
export function combineWorldWithPatches(
  world: FeatureCollection,
  patches: Array<{ spec: RegionalPatch; features: Feature[] }>,
): FeatureCollection {
  const polygonPatches = patches
    .filter((p) => p.spec.ready && p.spec.geometryKind === 'polygon' && p.features.length)
    .sort((a, b) => a.spec.precision - b.spec.precision);

  let kept = world.features.slice();
  const added: Feature[] = [];

  for (const { spec, features } of polygonPatches) {
    const replace = new Set(spec.replaceNames.map((n) => n.toLowerCase()));
    kept = kept.filter((f) => {
      const name = String(f.properties?.NAME ?? '').toLowerCase();
      if (replace.has(name)) return false;
      // Default is names-only. Dropping every centroid in the bbox would
      // delete neighbours (the CShapes-class mistake) just to insert Rome.
      if (spec.cutMode === 'names+bbox') return !bboxContainsCentroid(spec.bbox, f.geometry);
      return true;
    });
    added.push(
      ...features.filter((f) => f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')),
    );
  }

  return { type: 'FeatureCollection', features: [...kept, ...added] };
}

export function bboxContainsCentroid(bbox: BBox, geom: Geometry | null | undefined): boolean {
  if (!geom) return false;
  const c = centroid(geom);
  if (!c) return false;
  const [w, s, e, n] = bbox;
  return c[0] >= w && c[0] <= e && c[1] >= s && c[1] <= n;
}

function centroid(geom: Geometry): [number, number] | null {
  const ring = firstRing(geom);
  if (!ring || ring.length < 2) return null;
  let x = 0;
  let y = 0;
  let n = 0;
  for (const p of ring) {
    if (!Array.isArray(p) || p.length < 2) continue;
    x += p[0];
    y += p[1];
    n++;
  }
  return n ? [x / n, y / n] : null;
}

function firstRing(geom: Geometry): number[][] | null {
  if (geom.type === 'Polygon') return geom.coordinates[0] as number[][];
  if (geom.type === 'MultiPolygon') return geom.coordinates[0]?.[0] as number[][];
  if (geom.type === 'LineString') return geom.coordinates as number[][];
  if (geom.type === 'Point') return [geom.coordinates as number[]];
  return null;
}
