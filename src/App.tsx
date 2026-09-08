import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Globe, { type FlyTarget, type LayerToggles } from './components/Globe';
import Timeline from './components/Timeline';
import SummaryPanel from './components/SummaryPanel';
import Header from './components/Header';
import AboutDialog from './components/AboutDialog';
import { EVENTS, eventsNear, nextEventYear, prevEventYear, type HistoricalEvent } from './data/events';
import { eraFor } from './data/eras';
import { snapshotFor } from './data/snapshots';
import type { RegionProps } from './lib/geo';
import { MAX_YEAR, clampYear, eventWindow, formatYear, yearsPerFraction } from './lib/time';

const SPEEDS = [0.5, 1, 2, 4];
const PLAY_PX_PER_SEC = 28; // constant on-screen speed → faster through sparse millennia

export default function App() {
  const [year, setYear] = useState(1492);
  const [previewYear, setPreviewYear] = useState<number | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<RegionProps | null>(null);
  const [layers, setLayers] = useState<LayerToggles>({ labels: true, graticule: true, events: true });
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null);
  const [loading, setLoading] = useState(false);
  const [polityCount, setPolityCount] = useState(0);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const snapshot = useMemo(() => snapshotFor(year), [year]);
  const visibleEvents = useMemo(() => eventsNear(year, eventWindow(year)), [year]);
  const selectedEvent = useMemo(() => EVENTS.find((e) => e.id === selectedEventId) ?? null, [selectedEventId]);

  // Deselect an event once the timeline has moved away from it.
  useEffect(() => {
    if (selectedEventId && !visibleEvents.some((e) => e.id === selectedEventId)) setSelectedEventId(null);
  }, [visibleEvents, selectedEventId]);

  // The region card refers to a specific snapshot; clear it when the snapshot changes.
  const lastSnapshotRef = useRef(snapshot.file);
  useEffect(() => {
    if (lastSnapshotRef.current !== snapshot.file) {
      lastSnapshotRef.current = snapshot.file;
      setSelectedRegion(null);
    }
  }, [snapshot]);

  const goToYear = useCallback((y: number) => {
    setPlaying(false);
    setYear(clampYear(y));
  }, []);

  const selectEvent = useCallback((ev: HistoricalEvent | null, fly = false) => {
    setSelectedEventId(ev?.id ?? null);
    if (ev && fly) setFlyTarget({ lon: ev.lon, lat: ev.lat, key: Date.now() });
  }, []);

  const pickEventFromTimeline = useCallback(
    (ev: HistoricalEvent) => {
      goToYear(ev.year);
      selectEvent(ev, true);
    },
    [goToYear, selectEvent],
  );

  // ── Autoplay ────────────────────────────────────────────────────────────
  const yearRef = useRef(year);
  yearRef.current = year;
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const trackW = Math.max(600, window.innerWidth - 80);
    let pos = yearRef.current; // fractional position, so slow speeds still accumulate
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const yearsPerPx = yearsPerFraction(pos) / trackW;
      pos += yearsPerPx * PLAY_PX_PER_SEC * speed * dt;
      if (pos >= MAX_YEAR) {
        setYear(MAX_YEAR);
        setPlaying(false);
        return;
      }
      setYear(Math.floor(pos));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed]);

  // ── Keyboard ────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) return;
      const step = e.altKey ? 100 : e.shiftKey ? 10 : 1;
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goToYear(yearRef.current - step);
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToYear(yearRef.current + step);
          break;
        case '[': {
          const p = prevEventYear(yearRef.current);
          if (p !== null) goToYear(p);
          break;
        }
        case ']': {
          const n = nextEventYear(yearRef.current);
          if (n !== null) goToYear(n);
          break;
        }
        case ' ':
          e.preventDefault();
          setPlaying((p) => !p);
          break;
        case 'Escape':
          setSelectedEventId(null);
          setSelectedRegion(null);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goToYear]);

  const toggleLayer = (key: keyof LayerToggles) => setLayers((l) => ({ ...l, [key]: !l[key] }));
  const onLoadingChange = useCallback((v: boolean) => setLoading(v), []);
  const onRegionCount = useCallback((n: number) => setPolityCount(n), []);
  const onSelectRegion = useCallback((p: RegionProps | null) => {
    setSelectedRegion(p);
    if (p) setSelectedEventId(null);
  }, []);
  const onSelectEventFromMap = useCallback((id: string | null) => {
    setSelectedEventId(id);
    if (id) setSelectedRegion(null);
  }, []);

  const shownYear = previewYear ?? year;
  const era = eraFor(shownYear);
  const prevEv = prevEventYear(year);
  const nextEv = nextEventYear(year);

  return (
    <div className="app">
      <Globe
        year={year}
        snapshot={snapshot}
        visibleEvents={visibleEvents}
        selectedEventId={selectedEventId}
        selectedRegionFid={selectedRegion?.fid ?? null}
        layers={layers}
        flyTarget={flyTarget}
        onSelectRegion={onSelectRegion}
        onSelectEvent={onSelectEventFromMap}
        onLoadingChange={onLoadingChange}
        onRegionCount={onRegionCount}
      />
      <div className="vignette" aria-hidden />

      <Header layers={layers} onToggleLayer={toggleLayer} onAbout={() => setAboutOpen(true)} />

      <SummaryPanel
        year={year}
        snapshot={snapshot}
        visibleEvents={visibleEvents}
        selectedEvent={selectedEvent}
        selectedRegion={selectedRegion}
        polityCount={polityCount}
        loading={loading}
        collapsed={panelCollapsed}
        onToggleCollapsed={() => setPanelCollapsed((c) => !c)}
        onSelectEvent={selectEvent}
        onClearRegion={() => setSelectedRegion(null)}
        onGoToYear={goToYear}
      />

      <div className="timeline-dock">
        <div className="timeline-bar">
          <div className="tl-group">
            <button className="btn play" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Play'} title="Play / pause (Space)">
              {playing ? (
                <svg viewBox="0 0 16 16" width="14" height="14">
                  <rect x="3" y="2" width="3.5" height="12" fill="currentColor" />
                  <rect x="9.5" y="2" width="3.5" height="12" fill="currentColor" />
                </svg>
              ) : (
                <svg viewBox="0 0 16 16" width="14" height="14">
                  <path d="M4 2 L13 8 L4 14 Z" fill="currentColor" />
                </svg>
              )}
            </button>
            <div className="seg" role="group" aria-label="Playback speed">
              {SPEEDS.map((s) => (
                <button key={s} className={`seg-btn${speed === s ? ' on' : ''}`} onClick={() => setSpeed(s)}>
                  {s}×
                </button>
              ))}
            </div>
            <div className="seg" role="group" aria-label="Jump between events">
              <button className="seg-btn" disabled={prevEv === null} onClick={() => prevEv !== null && goToYear(prevEv)} title="Previous event ([)">
                ‹ event
              </button>
              <button className="seg-btn" disabled={nextEv === null} onClick={() => nextEv !== null && goToYear(nextEv)} title="Next event (])">
                event ›
              </button>
            </div>
          </div>

          <div className={`tl-year${previewYear !== null ? ' preview' : ''}`}>
            <span className="tl-year-value">{formatYear(shownYear)}</span>
            <span className="tl-year-era" style={{ color: era.color }}>
              {era.name}
            </span>
          </div>

          <div className="tl-hint">
            Drag for speed · hover to magnify · drag inside the lens for precision · scroll for single years
          </div>
        </div>
        <Timeline
          year={year}
          onChange={goToYear}
          onPreview={setPreviewYear}
          highlightEventId={selectedEventId}
          onPickEvent={pickEventFromTimeline}
        />
      </div>

      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
