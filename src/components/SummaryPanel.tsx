import { useEffect, useState } from 'react';
import { CATEGORY_META, nextEventYear, prevEventYear, type HistoricalEvent } from '../data/events';
import { eraFor } from '../data/eras';
import { nextBorderYear, type Snapshot } from '../data/snapshots';
import type { RegionProps } from '../lib/geo';
import { eventWindow, formatYear } from '../lib/time';
import { briefingHint, fetchPolitySummary, type PolitySummary } from '../lib/wikiSummary';

interface SummaryPanelProps {
  year: number;
  snapshot: Snapshot;
  visibleEvents: HistoricalEvent[];
  selectedEvent: HistoricalEvent | null;
  selectedRegion: RegionProps | null;
  polityCount: number;
  loading: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelectEvent: (ev: HistoricalEvent | null, fly?: boolean) => void;
  onClearRegion: () => void;
  onGoToYear: (year: number) => void;
}

const PRECISION_TEXT: Record<number, string> = {
  1: 'approximate border',
  2: 'moderately precise border',
  3: 'border defined by treaty / international law',
};

function wikiSearch(name: string) {
  return `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(name)}`;
}

function formatArea(km2: number) {
  if (km2 >= 1e6) return `${(km2 / 1e6).toFixed(2)} million km²`;
  if (km2 >= 1e4) return `${Math.round(km2 / 1000).toLocaleString()},000 km²`;
  return `${Math.round(km2).toLocaleString()} km²`;
}

function usePolityBriefing(name: string | undefined, year: number) {
  const [brief, setBrief] = useState<PolitySummary | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!name) {
      setBrief(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setBrief(null);
    fetchPolitySummary(name, year)
      .then((s) => {
        if (!cancelled) setBrief(s);
      })
      .catch(() => {
        if (!cancelled) setBrief(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [name, year]);
  return { brief, loading };
}

export default function SummaryPanel({
  year,
  snapshot,
  visibleEvents,
  selectedEvent,
  selectedRegion,
  polityCount,
  loading,
  collapsed,
  onToggleCollapsed,
  onSelectEvent,
  onClearRegion,
  onGoToYear,
}: SummaryPanelProps) {
  const era = eraFor(year);
  const next = nextBorderYear(year);
  const window = eventWindow(year);
  const exact = visibleEvents.filter((e) => e.year === year);
  const nearby = visibleEvents.filter((e) => e.year !== year);
  const prevY = prevEventYear(year - window);
  const nextY = nextEventYear(year + window);
  const { brief, loading: briefLoading } = usePolityBriefing(selectedRegion?.NAME, year);

  if (collapsed) {
    return (
      <button className="panel-collapsed" onClick={onToggleCollapsed} title="Show summary">
        <span className="panel-collapsed-year">{formatYear(year, { ad: false })}</span>
        <span className="panel-collapsed-hint">Summary ›</span>
      </button>
    );
  }

  return (
    <aside className="panel">
      <header className="panel-head">
        <div>
          <div className="panel-era" style={{ color: era.color }}>
            {era.name}
          </div>
          <h1 className="panel-year">{formatYear(year)}</h1>
        </div>
        <button className="icon-btn" onClick={onToggleCollapsed} title="Hide summary" aria-label="Hide summary">
          ›
        </button>
      </header>

      <div className="panel-scroll">
        <section className="panel-section">
          <div className="section-kicker">
            Borders as of {formatYear(snapshot.year)}
            {snapshot.source === 'cshapes' && <span className="muted"> · CShapes 2.0</span>}
            {next !== null && <span className="muted"> · next change {formatYear(next)}</span>}
            {loading && <span className="loading-dot" aria-label="loading" />}
          </div>
          <p className="panel-text">{snapshot.summary}</p>
          <div className="stat-row">
            <span className="stat">
              <b>{polityCount}</b> states &amp; polities mapped
            </span>
            {snapshot.source !== 'cshapes' && (
              <span className="stat muted">Hatched areas are cultural regions, not states</span>
            )}
          </div>
        </section>

        {selectedEvent && (
          <section className="card card-event" style={{ borderColor: CATEGORY_META[selectedEvent.category].color }}>
            <div className="card-top">
              <span className="chip" style={{ background: CATEGORY_META[selectedEvent.category].color }}>
                {CATEGORY_META[selectedEvent.category].label}
              </span>
              <button className="icon-btn small" onClick={() => onSelectEvent(null)} aria-label="Close event">
                ×
              </button>
            </div>
            <div className="card-year">{formatYear(selectedEvent.year, { approx: selectedEvent.approx })}</div>
            <h2 className="card-title">{selectedEvent.title}</h2>
            <p className="panel-text">{selectedEvent.summary}</p>
            <div className="card-actions">
              <button className="btn" onClick={() => onSelectEvent(selectedEvent, true)}>
                Show on globe
              </button>
              {selectedEvent.year !== year && (
                <button className="btn ghost" onClick={() => onGoToYear(selectedEvent.year)}>
                  Go to {formatYear(selectedEvent.year, { ad: false })}
                </button>
              )}
              <a className="btn ghost" href={`https://en.wikipedia.org/wiki/${selectedEvent.wiki}`} target="_blank" rel="noreferrer">
                Wikipedia ↗
              </a>
            </div>
          </section>
        )}

        {selectedRegion && (
          <section className="card card-region" style={{ borderColor: selectedRegion.color }}>
            <div className="card-top">
              <span className="chip outline" style={{ borderColor: selectedRegion.color, color: selectedRegion.color }}>
                {selectedRegion.kind === 'culture' ? 'Cultural region' : selectedRegion.kind === 'polity' ? 'State / polity' : 'Unattributed land'}
              </span>
              <button className="icon-btn small" onClick={onClearRegion} aria-label="Close region">
                ×
              </button>
            </div>
            <h2 className="card-title">{selectedRegion.NAME ?? 'No recorded polity'}</h2>
            {briefLoading && <p className="panel-text muted">Looking up a short briefing…</p>}
            {brief && (
              <p className="region-blurb">
                {brief.extract}
                <span className="region-blurb-src">{briefingHint(year)}</span>
              </p>
            )}
            <dl className="kv">
              {selectedRegion.SUBJECTO && selectedRegion.SUBJECTO !== selectedRegion.NAME && selectedRegion.SUBJECTO !== '3' && (
                <>
                  <dt>Ruled by</dt>
                  <dd>{selectedRegion.SUBJECTO}</dd>
                </>
              )}
              {selectedRegion.PARTOF && selectedRegion.PARTOF !== selectedRegion.NAME && (
                <>
                  <dt>Part of</dt>
                  <dd>{selectedRegion.PARTOF}</dd>
                </>
              )}
              <dt>Area</dt>
              <dd>{formatArea(selectedRegion.areaKm2)}</dd>
              <dt>Precision</dt>
              <dd>{PRECISION_TEXT[selectedRegion.BORDERPRECISION] ?? 'approximate border'}</dd>
            </dl>
            {selectedRegion.NAME && (
              <div className="card-actions">
                <a
                  className="btn ghost"
                  href={brief?.url ?? wikiSearch(selectedRegion.NAME)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Wikipedia ↗
                </a>
              </div>
            )}
          </section>
        )}

        <section className="panel-section">
          <div className="section-kicker">
            {window === 0 ? `Events in ${formatYear(year, { ad: false })}` : `Events around ${formatYear(year, { ad: false })} (± ${window} years)`}
          </div>
          {visibleEvents.length === 0 ? (
            <p className="panel-text muted">No events recorded for this year.</p>
          ) : (
            <ul className="event-list">
              {[...exact, ...nearby].map((ev) => (
                <li key={ev.id}>
                  <button
                    className={`event-item${selectedEvent?.id === ev.id ? ' active' : ''}`}
                    onClick={() => onSelectEvent(ev, true)}
                  >
                    <span className="event-dot" style={{ background: CATEGORY_META[ev.category].color }} />
                    <span className="event-year">{formatYear(ev.year, { approx: ev.approx, ad: false })}</span>
                    <span className="event-title">
                      {ev.title}
                      {ev.source === 'wikidata' ? <span className="event-src">Wikidata</span> : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="nav-row">
            <button className="btn ghost" disabled={prevY === null} onClick={() => prevY !== null && onGoToYear(prevY)}>
              ‹ {prevY !== null ? formatYear(prevY, { ad: false }) : '—'}
            </button>
            <span className="muted small">nearest events</span>
            <button className="btn ghost" disabled={nextY === null} onClick={() => nextY !== null && onGoToYear(nextY)}>
              {nextY !== null ? formatYear(nextY, { ad: false }) : '—'} ›
            </button>
          </div>
        </section>

        <footer className="panel-foot">
          Borders from the open <a href="https://github.com/aourednik/historical-basemaps" target="_blank" rel="noreferrer">historical-basemaps</a> project
          (GPL-3.0), simplified for display. They are scholarly approximations — dashed lines mark uncertain frontiers — and most
          pre-modern boundaries are zones of influence rather than lines. Major events are hand-curated; a Wikidata
          supplement adds further dated, geolocated items. Each links to Wikipedia.
        </footer>
      </div>
    </aside>
  );
}
