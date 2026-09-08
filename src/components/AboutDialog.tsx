import { useEffect } from 'react';
import { CATEGORY_META } from '../data/events';
import { EVENTS } from '../data/events';
import { SNAPSHOTS } from '../data/snapshots';

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function AboutDialog({ open, onClose }: AboutDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="about-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id="about-title">About Chronoglobe</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">
          <p>
            Chronoglobe shows the political map of the world at any year from 5000 BC to today. Drag the timeline, hover
            it to open a magnifying lens for year-by-year precision, and click any state or event marker for details.
          </p>

          <h3>How to navigate</h3>
          <ul>
            <li>
              <b>Drag</b> along the main track for fast, coarse travel. <b>Hover</b> to open the lens, then <b>drag inside the
              lens</b> for 8× finer control; drag past its edge to keep panning.
            </li>
            <li>
              <b>Scroll</b> over the timeline to step one year (⇧ = 10 years, ⌥ = 100 years). <b>← →</b> arrows do the
              same; <b>[</b> and <b>]</b> jump between events; <b>Space</b> plays.
            </li>
            <li>Coloured ticks above the track are events — a hint of where to stop. Small triangles below it mark years where the border data changes.</li>
          </ul>

          <h3>Borders</h3>
          <p>
            Boundaries come from the open-source{' '}
            <a href="https://github.com/aourednik/historical-basemaps" target="_blank" rel="noreferrer">
              historical-basemaps
            </a>{' '}
            project by André Ourednik and contributors (GPL-3.0), which provides {SNAPSHOTS.length} snapshots between 5000 BC
            and 2010. The globe shows the latest snapshot at or before the selected year, so between snapshots the map is
            held constant — the side panel always states which snapshot year is displayed. Granularity is coarser in the
            deep past (every 1,000 years before 1500 BC, every century in antiquity, then every few decades).
          </p>
          <p>
            Colours follow the ruling power (colonies share their metropole’s hue). <b>Dashed</b> borders are flagged as
            approximate by the source; <b>hatched</b> areas are cultural regions or peoples without a state. Pre-modern
            borders were rarely lines at all — treat them as zones of influence. Geometry has been simplified for fast
            rendering.
          </p>

          <h3>Events</h3>
          <p>
            The {EVENTS.length} events are hand-curated with an emphasis on developments that changed the political,
            technological or cultural map. Each links to its Wikipedia article for verification. Dates marked
            <i> c.</i> are approximate, traditional or debated. The curated list currently runs to 2024; add more in{' '}
            <code>src/data/events.ts</code>.
          </p>
          <div className="legend">
            {Object.entries(CATEGORY_META).map(([k, m]) => (
              <span key={k} className="legend-item">
                <span className="event-dot" style={{ background: m.color }} /> {m.label}
              </span>
            ))}
          </div>

          <h3>Accuracy</h3>
          <p>
            Historical cartography is interpretation. The underlying dataset is a work in progress and its authors ask
            that it be verified against other sources before academic use. If you spot an error, both the border data
            (upstream) and the event list (this project) are open to correction.
          </p>
          <p className="muted small">
            Built with React, MapLibre GL JS (globe projection) and Vite. Fonts: Cormorant Garamond &amp; Inter.
          </p>
        </div>
      </div>
    </div>
  );
}
