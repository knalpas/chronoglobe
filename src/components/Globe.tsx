import { useEffect, useRef, useState } from 'react';
import {
  Map as MLMap,
  Popup,
  NavigationControl,
  AttributionControl,
  type StyleSpecification,
  type SymbolLayerSpecification,
  type ExpressionSpecification,
  type GeoJSONSource,
  type MapMouseEvent,
  type MapGeoJSONFeature,
} from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import { CATEGORY_META, type HistoricalEvent } from '../data/events';
import { snapshotUrl, type Snapshot } from '../data/snapshots';
import { graticule, prepareSnapshot, type PreparedSnapshot, type RegionProps } from '../lib/geo';
import { formatYear } from '../lib/time';

export interface LayerToggles {
  labels: boolean;
  graticule: boolean;
  events: boolean;
}

export interface FlyTarget {
  lon: number;
  lat: number;
  zoom?: number;
  key: number;
}

interface GlobeProps {
  year: number;
  snapshot: Snapshot;
  visibleEvents: HistoricalEvent[];
  selectedEventId: string | null;
  selectedRegionFid: number | null;
  layers: LayerToggles;
  flyTarget: FlyTarget | null;
  panelCollapsed?: boolean;
  onSelectRegion: (props: RegionProps | null) => void;
  onSelectEvent: (id: string | null) => void;
  onLoadingChange: (loading: boolean) => void;
  onRegionCount: (count: number) => void;
}

const GLYPHS = 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf';
const OCEAN = '#b9ccd3';
const BORDER = '#4d3f30';
const EMPTY_FC: FeatureCollection = { type: 'FeatureCollection', features: [] };

const snapshotCache = new Map<string, Promise<PreparedSnapshot>>();
function loadSnapshot(s: Snapshot): Promise<PreparedSnapshot> {
  let p = snapshotCache.get(s.file);
  if (!p) {
    p = fetch(snapshotUrl(s))
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load ${s.file}: ${r.status}`);
        return r.json();
      })
      .then((raw) => prepareSnapshot(raw));
    snapshotCache.set(s.file, p);
  }
  return p;
}

function eventsToGeoJSON(events: HistoricalEvent[], year: number): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: events.map((e) => ({
      type: 'Feature',
      id: e.id,
      geometry: { type: 'Point', coordinates: [e.lon, e.lat] },
      properties: {
        id: e.id,
        title: e.title,
        year: e.year,
        yearLabel: formatYear(e.year, { approx: e.approx }),
        category: e.category,
        color: CATEGORY_META[e.category].color,
        importance: e.importance,
        exact: e.year === year ? 1 : 0,
      },
    })),
  };
}

function makeHatch(): ImageData {
  const size = 12;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.strokeStyle = 'rgba(80, 66, 48, 0.32)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, size);
  ctx.lineTo(size, 0);
  ctx.moveTo(-size / 2, size / 2);
  ctx.lineTo(size / 2, -size / 2);
  ctx.moveTo(size / 2, size * 1.5);
  ctx.lineTo(size * 1.5, size / 2);
  ctx.stroke();
  return ctx.getImageData(0, 0, size, size);
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildStyle(): StyleSpecification {
  const textSize = (base: number, spread: number): ExpressionSpecification => ['+', base, ['*', spread, ['get', 'size']]];
  const labelLayout: SymbolLayerSpecification['layout'] = {
    'text-field': ['get', 'name'],
    'text-font': [
      'case',
      ['==', ['get', 'kind'], 'culture'],
      ['literal', ['Noto Sans Regular']],
      ['literal', ['Noto Sans Bold']],
    ],
    'text-size': ['interpolate', ['linear'], ['zoom'], 1, textSize(7, 8), 4, textSize(10, 10), 8, textSize(13, 10)],
    'text-transform': ['case', ['all', ['==', ['get', 'kind'], 'polity'], ['>', ['get', 'size'], 0.45]], 'uppercase', 'none'],
    'text-letter-spacing': ['case', ['==', ['get', 'kind'], 'polity'], 0.14, 0.03],
    'text-max-width': 7,
    'text-line-height': 1.1,
    'text-padding': 6,
    'symbol-sort-key': ['get', 'rank'],
  };
  const labelPaint: SymbolLayerSpecification['paint'] = {
    'text-color': ['case', ['==', ['get', 'kind'], 'culture'], '#6f5f4c', '#33281d'],
    'text-halo-color': 'rgba(243, 236, 222, 0.85)',
    'text-halo-width': 1.3,
    'text-halo-blur': 0.4,
    'text-opacity': ['case', ['==', ['get', 'kind'], 'culture'], 0.85, 1],
  };

  return {
    version: 8,
    glyphs: GLYPHS,
    projection: { type: 'globe' },
    sky: {
      'sky-color': '#0d1420',
      'horizon-color': '#2c4a63',
      'fog-color': '#0d1420',
      'sky-horizon-blend': 0.6,
      'horizon-fog-blend': 0.6,
      'fog-ground-blend': 0.9,
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 4, 1, 6, 0],
    },
    sources: {
      regions: { type: 'geojson', data: EMPTY_FC, promoteId: 'fid' },
      labels: { type: 'geojson', data: EMPTY_FC },
      events: { type: 'geojson', data: EMPTY_FC },
      graticule: { type: 'geojson', data: graticule(15) },
    },
    layers: [
      { id: 'ocean', type: 'background', paint: { 'background-color': OCEAN } },
      {
        id: 'region-fill',
        type: 'fill',
        source: 'regions',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': ['match', ['get', 'kind'], 'polity', 0.92, 'culture', 0.9, 0.9],
          'fill-antialias': true,
        },
      },
      {
        id: 'graticule',
        type: 'line',
        source: 'graticule',
        paint: { 'line-color': 'rgba(50, 60, 70, 0.22)', 'line-width': 0.6 },
      },
      {
        id: 'region-border-approx',
        type: 'line',
        source: 'regions',
        filter: ['<=', ['get', 'BORDERPRECISION'], 1],
        paint: {
          'line-color': BORDER,
          'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.4, 5, 0.9],
          'line-opacity': 0.55,
          'line-dasharray': [3, 2.5],
        },
      },
      {
        id: 'region-border',
        type: 'line',
        source: 'regions',
        filter: ['>', ['get', 'BORDERPRECISION'], 1],
        paint: {
          'line-color': BORDER,
          'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.5, 5, 1.1],
          'line-opacity': 0.8,
        },
      },
      {
        id: 'region-hover',
        type: 'line',
        source: 'regions',
        paint: {
          'line-color': '#20160c',
          'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 2.2, 0],
        },
      },
      {
        id: 'region-selected',
        type: 'line',
        source: 'regions',
        filter: ['==', ['get', 'fid'], -1],
        paint: { 'line-color': '#1a1208', 'line-width': 2.8 },
      },
      {
        id: 'labels-large',
        type: 'symbol',
        source: 'labels',
        filter: ['>=', ['get', 'size'], 0.5],
        layout: labelLayout,
        paint: labelPaint,
      },
      {
        id: 'labels-mid',
        type: 'symbol',
        source: 'labels',
        minzoom: 2.2,
        filter: ['all', ['<', ['get', 'size'], 0.5], ['>=', ['get', 'size'], 0.25]],
        layout: labelLayout,
        paint: labelPaint,
      },
      {
        id: 'labels-small',
        type: 'symbol',
        source: 'labels',
        minzoom: 3.8,
        filter: ['<', ['get', 'size'], 0.25],
        layout: labelLayout,
        paint: labelPaint,
      },
      {
        id: 'event-halo',
        type: 'circle',
        source: 'events',
        paint: {
          'circle-radius': ['+', 9, ['*', 3, ['get', 'importance']]],
          'circle-color': ['get', 'color'],
          'circle-opacity': ['case', ['==', ['get', 'exact'], 1], 0.32, 0.18],
          'circle-blur': 0.6,
        },
      },
      {
        id: 'event-dot',
        type: 'circle',
        source: 'events',
        paint: {
          'circle-radius': ['+', 3.5, ['*', 1, ['get', 'importance']]],
          'circle-color': ['get', 'color'],
          'circle-stroke-color': '#fffaf0',
          'circle-stroke-width': 1.6,
        },
      },
      {
        id: 'event-selected',
        type: 'circle',
        source: 'events',
        filter: ['==', ['get', 'id'], ''],
        paint: {
          'circle-radius': 12,
          'circle-color': 'rgba(0,0,0,0)',
          'circle-stroke-color': '#fffaf0',
          'circle-stroke-width': 2.5,
        },
      },
      {
        id: 'event-label',
        type: 'symbol',
        source: 'events',
        minzoom: 2.4,
        layout: {
          'text-field': ['get', 'title'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 11,
          'text-anchor': 'left',
          'text-offset': [1.1, 0],
          'text-max-width': 14,
          'text-optional': true,
          'symbol-sort-key': ['-', 3, ['get', 'importance']],
        },
        paint: {
          'text-color': '#1f1a14',
          'text-halo-color': 'rgba(255, 250, 240, 0.92)',
          'text-halo-width': 1.4,
        },
      },
    ],
  };
}

function source(map: MLMap, id: string): GeoJSONSource | null {
  return (map.getSource(id) as GeoJSONSource | undefined) ?? null;
}

export default function Globe({
  year,
  snapshot,
  visibleEvents,
  selectedEventId,
  selectedRegionFid,
  layers,
  flyTarget,
  panelCollapsed = false,
  onSelectRegion,
  onSelectEvent,
  onLoadingChange,
  onRegionCount,
}: GlobeProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [ready, setReady] = useState(false);
  const hoveredRef = useRef<number | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const regionsRef = useRef<Map<number, RegionProps>>(new Map());

  const cbRef = useRef({ onSelectRegion, onSelectEvent });
  cbRef.current = { onSelectRegion, onSelectEvent };

  useEffect(() => {
    const container = containerRef.current;
    const shell = shellRef.current;
    if (!container || !shell) return;

    const map = new MLMap({
      container,
      style: buildStyle(),
      center: [20, 25],
      zoom: 1.55,
      minZoom: 0.8,
      maxZoom: 8,
      attributionControl: false,
      canvasContextAttributes: { antialias: true },
    });
    mapRef.current = map;
    let cancelled = false;

    map.addControl(new NavigationControl({ showCompass: false, visualizePitch: false }), 'top-right');
    map.addControl(
      new AttributionControl({
        compact: true,
        customAttribution:
          'Borders: <a href="https://github.com/aourednik/historical-basemaps" target="_blank" rel="noreferrer">historical-basemaps</a> (GPL-3.0) · Rendered with MapLibre',
      }),
      'bottom-left',
    );

    const popup = new Popup({ closeButton: false, closeOnClick: false, offset: 12, className: 'cg-popup' });
    popupRef.current = popup;

    let readyLocked = false;
    const markReady = () => {
      if (cancelled || readyLocked) return;
      readyLocked = true;
      if (!map.hasImage('hatch')) {
        map.addImage('hatch', makeHatch(), { pixelRatio: 2 });
      }
      if (!map.getLayer('region-culture-hatch')) {
        map.addLayer(
          {
            id: 'region-culture-hatch',
            type: 'fill',
            source: 'regions',
            filter: ['==', ['get', 'kind'], 'culture'],
            paint: { 'fill-pattern': 'hatch', 'fill-opacity': 0.55 },
          },
          'graticule',
        );
      }
      map.resize();
      setReady(true);
    };

    map.on('load', markReady);
    map.on('style.load', markReady);
    map.on('error', (e) => console.error('[maplibre]', e.error ?? e));

    const setHover = (fid: number | null) => {
      if (hoveredRef.current === fid) return;
      if (hoveredRef.current !== null) map.setFeatureState({ source: 'regions', id: hoveredRef.current }, { hover: false });
      hoveredRef.current = fid;
      if (fid !== null) map.setFeatureState({ source: 'regions', id: fid }, { hover: true });
    };

    const onMove = (e: MapMouseEvent) => {
      if (!map.getLayer('region-fill')) return;
      const feats = map.queryRenderedFeatures(e.point, { layers: ['event-dot', 'region-fill'] });
      const ev = feats.find((f: MapGeoJSONFeature) => f.layer.id === 'event-dot');
      const region = feats.find((f: MapGeoJSONFeature) => f.layer.id === 'region-fill');
      map.getCanvas().style.cursor = ev || region ? 'pointer' : '';

      if (ev) {
        setHover(null);
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div class="cg-popup-title">${esc(ev.properties.title)}</div><div class="cg-popup-sub">${esc(ev.properties.yearLabel)}</div>`,
          )
          .addTo(map);
        return;
      }
      if (region) {
        const p = region.properties as RegionProps;
        setHover(Number(p.fid));
        if (p.NAME) {
          const sub =
            p.SUBJECTO && p.SUBJECTO !== p.NAME && p.SUBJECTO !== '3'
              ? `<div class="cg-popup-sub">${esc(p.SUBJECTO)}</div>`
              : '';
          popup.setLngLat(e.lngLat).setHTML(`<div class="cg-popup-title">${esc(p.NAME)}</div>${sub}`).addTo(map);
        } else {
          popup.remove();
        }
        return;
      }
      setHover(null);
      popup.remove();
    };
    const onLeave = () => {
      setHover(null);
      popup.remove();
      map.getCanvas().style.cursor = '';
    };
    const onClick = (e: MapMouseEvent) => {
      if (!map.getLayer('region-fill')) return;
      const feats = map.queryRenderedFeatures(e.point, { layers: ['event-dot', 'region-fill'] });
      const ev = feats.find((f: MapGeoJSONFeature) => f.layer.id === 'event-dot');
      if (ev) {
        cbRef.current.onSelectEvent(String(ev.properties.id));
        return;
      }
      const region = feats.find((f: MapGeoJSONFeature) => f.layer.id === 'region-fill');
      if (region) {
        const fid = Number((region.properties as RegionProps).fid);
        const full = regionsRef.current.get(fid) ?? (region.properties as RegionProps);
        cbRef.current.onSelectRegion(full);
        return;
      }
      cbRef.current.onSelectRegion(null);
      cbRef.current.onSelectEvent(null);
    };

    map.on('mousemove', onMove);
    map.on('mouseout', onLeave);
    map.on('click', onClick);

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(shell);

    return () => {
      cancelled = true;
      ro.disconnect();
      popup.remove();
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Horizontal only. Vertical placement is the CSS frame (header → timeline),
    // so padding cannot drag the sphere into the date bar.
    map.setPadding({
      top: 0,
      bottom: 0,
      right: 8,
      left: panelCollapsed ? 8 : 200,
    });
  }, [panelCollapsed, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    let cancelled = false;
    onLoadingChange(true);
    loadSnapshot(snapshot)
      .then((prepared) => {
        if (cancelled || !mapRef.current) return;
        const labels = {
          ...prepared.labels,
          features: prepared.labels.features.map((f) => ({
            ...f,
            properties: {
              ...f.properties,
              size: Math.min(1, Math.max(0, (Math.log10(Math.max(f.properties.areaKm2, 1)) - 4.3) / 2.9)),
            },
          })),
        };
        source(map, 'regions')?.setData(prepared.regions);
        source(map, 'labels')?.setData(labels);
        regionsRef.current = new Map(prepared.regions.features.map((f) => [f.properties.fid, f.properties]));
        hoveredRef.current = null;
        onRegionCount(prepared.regions.features.filter((f) => f.properties.kind === 'polity').length);
        onLoadingChange(false);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) onLoadingChange(false);
      });
    return () => {
      cancelled = true;
    };
  }, [snapshot, ready, onLoadingChange, onRegionCount]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    source(map, 'events')?.setData(eventsToGeoJSON(visibleEvents, year));
  }, [visibleEvents, year, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !map.getLayer('event-selected')) return;
    map.setFilter('event-selected', ['==', ['get', 'id'], selectedEventId ?? '']);
  }, [selectedEventId, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !map.getLayer('region-selected')) return;
    map.setFilter('region-selected', ['==', ['get', 'fid'], selectedRegionFid ?? -1]);
  }, [selectedRegionFid, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const vis = (ids: string[], on: boolean) =>
      ids.forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
      });
    vis(['labels-large', 'labels-mid', 'labels-small'], layers.labels);
    vis(['graticule'], layers.graticule);
    vis(['event-halo', 'event-dot', 'event-selected', 'event-label'], layers.events);
  }, [layers, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !flyTarget) return;
    map.flyTo({
      center: [flyTarget.lon, flyTarget.lat],
      zoom: flyTarget.zoom ?? Math.max(map.getZoom(), 3.2),
      speed: 0.9,
      curve: 1.4,
      essential: true,
    });
  }, [flyTarget, ready]);

  return (
    <div ref={shellRef} className="globe-shell">
      <div ref={containerRef} className="globe" aria-label="Interactive historical globe" />
    </div>
  );
}
