import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ERAS } from '../data/eras';
import { ALL_EVENTS, CATEGORY_META, type HistoricalEvent } from '../data/events';
import { SNAPSHOT_YEARS } from '../data/snapshots';
import {
  MAX_YEAR,
  MIN_YEAR,
  clampYear,
  formatYear,
  formatYearShort,
  fractionToYear,
  niceStep,
  yearToFraction,
  yearsPerFraction,
} from '../lib/time';

interface TimelineProps {
  year: number;
  onChange: (year: number) => void;
  /** Called with the year under the cursor while hovering (null when leaving). */
  onPreview?: (year: number | null) => void;
  highlightEventId?: string | null;
  onPickEvent?: (ev: HistoricalEvent) => void;
}

// ── Geometry constants ────────────────────────────────────────────────────
const PAD_L = 18;
const PAD_R = 18;
const SVG_H = 142;
const LENS_TOP = 2;
const LENS_H = 76;
const LENS_BOTTOM = LENS_TOP + LENS_H;
const BAND_TOP = 100;
const BAND_H = 20;
const BAND_BOTTOM = BAND_TOP + BAND_H;
const LABEL_Y = BAND_BOTTOM + 18;
const LENS_ZOOM = 8;
const LENS_AXIS_Y = LENS_BOTTOM - 16;
const LABEL_ROWS = 2;
const LABEL_ROW_H = 14;
const LABEL_MAX = 6;

const MACRO_TICK_YEARS = [
  MIN_YEAR, 1 - 4000, 1 - 3000, 1 - 2000, 1 - 1500, 1 - 1000, 1 - 500, 1, 250, 500, 750, 1000, 1250, 1500, 1600, 1700,
  1800, 1850, 1900, 1950, 2000, MAX_YEAR,
];

type Zone = 'track' | 'lens';

export default function Timeline({ year, onChange, onPreview, highlightEventId, onPickEvent }: TimelineProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(1200);
  const [lensCenter, setLensCenter] = useState<number | null>(null);
  const [preview, setPreview] = useState<number | null>(null);
  const [dragZone, setDragZone] = useState<Zone | null>(null);
  const [pointerX, setPointerX] = useState<number | null>(null);

  // ── Responsive width ────────────────────────────────────────────────────
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(Math.max(320, e.contentRect.width));
    });
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const trackW = width - PAD_L - PAD_R;
  const xOf = useCallback((y: number) => PAD_L + yearToFraction(y) * trackW, [trackW]);
  const yearAt = useCallback((x: number) => clampYear(fractionToYear((x - PAD_L) / trackW)), [trackW]);

  // ── Lens geometry ───────────────────────────────────────────────────────
  const lensW = Math.min(440, Math.max(260, trackW * 0.36));
  const lens = useMemo(() => {
    if (lensCenter === null) return null;
    const yearsPerPx = yearsPerFraction(lensCenter) / trackW;
    const span = Math.max(12, (lensW * yearsPerPx) / LENS_ZOOM);
    let start = lensCenter - span / 2;
    let end = lensCenter + span / 2;
    if (start < MIN_YEAR) {
      start = MIN_YEAR;
      end = MIN_YEAR + span;
    }
    if (end > MAX_YEAR) {
      end = MAX_YEAR;
      start = MAX_YEAR - span;
    }
    const cx = xOf(lensCenter);
    const left = Math.min(Math.max(PAD_L, cx - lensW / 2), width - PAD_R - lensW);
    const xOfLens = (y: number) => left + ((y - start) / (end - start)) * lensW;
    const yearAtLens = (x: number) => clampYear(start + ((x - left) / lensW) * (end - start));
    return { start, end, span, left, right: left + lensW, xOfLens, yearAtLens };
  }, [lensCenter, trackW, lensW, xOf, width]);

  // ── Pointer handling ────────────────────────────────────────────────────
  const zoneAt = (x: number, y: number): Zone => {
    if (lens && y <= LENS_BOTTOM + 8 && x >= lens.left - 6 && x <= lens.right + 6) return 'lens';
    return 'track';
  };

  const localPoint = (e: ReactPointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMove = (e: ReactPointerEvent) => {
    const { x, y } = localPoint(e);
    setPointerX(x);
    if (dragZone === 'track') {
      const yr = yearAt(x);
      setLensCenter(yr);
      setPreview(yr);
      onChange(yr);
      return;
    }
    if (dragZone === 'lens' && lens) {
      // Pan the lens when dragging past its edges so fine scrubbing can continue.
      if (x < lens.left || x > lens.right) {
        const edgeYear = x < lens.left ? lens.start : lens.end;
        const overshoot = x < lens.left ? lens.left - x : x - lens.right;
        const yearsPerPx = lens.span / lensW;
        const target = clampYear(edgeYear + (x < lens.left ? -1 : 1) * overshoot * yearsPerPx);
        setLensCenter(target);
        setPreview(target);
        onChange(target);
      } else {
        const yr = lens.yearAtLens(x);
        setPreview(yr);
        onChange(yr);
      }
      return;
    }
    const zone = zoneAt(x, y);
    if (zone === 'lens' && lens) {
      const yr = lens.yearAtLens(x);
      setPreview(yr);
      onPreview?.(yr);
    } else {
      const yr = yearAt(x);
      setLensCenter(yr);
      setPreview(yr);
      onPreview?.(yr);
    }
  };

  const handleDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    const { x, y } = localPoint(e);
    const zone = zoneAt(x, y);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDragZone(zone);
    if (zone === 'lens' && lens) {
      const yr = lens.yearAtLens(x);
      setPreview(yr);
      onChange(yr);
    } else {
      const yr = yearAt(x);
      setLensCenter(yr);
      setPreview(yr);
      onChange(yr);
    }
  };

  const handleUp = (e: ReactPointerEvent) => {
    setDragZone(null);
    try {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const handleLeave = () => {
    if (dragZone) return;
    setLensCenter(null);
    setPreview(null);
    setPointerX(null);
    onPreview?.(null);
  };

  // Wheel: nudge by one year (shift ×10, alt ×100). Native listener so we can preventDefault.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dir = Math.sign(e.deltaY || e.deltaX);
      if (!dir) return;
      const step = e.altKey ? 100 : e.shiftKey ? 10 : 1;
      onChange(clampYear(year + dir * step));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [year, onChange]);

  // ── Static macro decorations ───────────────────────────────────────────
  const macroTicks = useMemo(() => {
    const out: Array<{ x: number; label: string; year: number }> = [];
    let lastX = -Infinity;
    for (const y of MACRO_TICK_YEARS) {
      const x = xOf(y);
      if (x - lastX < 46) continue;
      out.push({ x, label: formatYearShort(y), year: y });
      lastX = x;
    }
    return out;
  }, [xOf]);

  const eventTicks = useMemo(
    () =>
      ALL_EVENTS.map((e) => ({
        id: e.id,
        x: xOf(e.year),
        h: e.importance === 3 ? 15 : e.importance === 2 ? 10 : 5,
        color: CATEGORY_META[e.category].color,
        minor: e.source === 'wikidata',
      })),
    [xOf],
  );

  const lensEvents = useMemo(() => {
    if (!lens) return [];
    const inRange = ALL_EVENTS.filter((e) => e.year >= lens.start && e.year <= lens.end).sort(
      (a, b) => b.importance - a.importance || (b.sitelinks ?? 0) - (a.sitelinks ?? 0) || a.year - b.year,
    );
    const labelPad = 6;
    const rows: Array<Array<{ x0: number; x1: number }>> = Array.from({ length: LABEL_ROWS }, () => []);
    let labelsUsed = 0;
    const placed: Array<{
      ev: HistoricalEvent;
      x: number;
      row: number | null;
      textX: number;
      anchor: 'start' | 'end';
      short: string;
    }> = [];

    for (const ev of inRange) {
      const x = lens.xOfLens(ev.year);
      const raw = `${ev.approx ? 'c. ' : ''}${ev.title}`;
      const short = raw.length > 28 ? `${raw.slice(0, 27)}…` : raw;
      const w = 8 + Math.min(short.length, 28) * 5.4;
      let row: number | null = null;
      let textX = x + 5;
      let anchor: 'start' | 'end' = 'start';
      const canLabel = ev.importance >= 2 && labelsUsed < LABEL_MAX;

      if (canLabel) {
        const tryPlace = (a: 'start' | 'end') => {
          const x0 = a === 'start' ? x + 5 : x - 5 - w;
          const x1 = x0 + w;
          if (x0 < lens.left + labelPad || x1 > lens.right - labelPad) return null;
          for (let r = 0; r < rows.length; r++) {
            if (rows[r].every((o) => x1 + 8 <= o.x0 || x0 >= o.x1 + 8)) {
              return { r, x0, x1, a };
            }
          }
          return null;
        };
        const fit = tryPlace('start') ?? tryPlace('end');
        if (fit) {
          row = fit.r;
          textX = fit.a === 'start' ? fit.x0 : fit.x1;
          anchor = fit.a;
          rows[fit.r].push({ x0: fit.x0, x1: fit.x1 });
          labelsUsed++;
        }
      }
      placed.push({ ev, x, row, textX, anchor, short });
    }
    return placed;
  }, [lens]);

  const lensTicks = useMemo(() => {
    if (!lens) return [];
    const step = niceStep(lens.span, 7);
    const first = Math.ceil(lens.start / step) * step;
    const out: Array<{ x: number; year: number; label: string }> = [];
    for (let y = first; y <= lens.end; y += step) {
      // Skip astronomical year 0 label duplication issue: show "1 BC" for 0.
      out.push({ x: lens.xOfLens(y), year: y, label: formatYearShort(y) });
    }
    return out;
  }, [lens]);

  const handleX = xOf(year);
  const lensActive = lens !== null;
  const pointerInLens = lensActive && pointerX !== null && pointerX >= lens.left && pointerX <= lens.right;
  const previewX = lens && preview !== null && (pointerInLens || dragZone === 'lens') ? lens.xOfLens(preview) : null;

  return (
    <div ref={wrapRef} className="timeline-svg-wrap">
      <svg
        ref={svgRef}
        className={`timeline-svg${dragZone ? ' dragging' : ''}`}
        width={width}
        height={SVG_H}
        onPointerMove={handleMove}
        onPointerDown={handleDown}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        onPointerLeave={handleLeave}
        role="slider"
        aria-label="Year"
        aria-valuemin={MIN_YEAR}
        aria-valuemax={MAX_YEAR}
        aria-valuenow={year}
        aria-valuetext={formatYear(year)}
        tabIndex={-1}
      >
        <defs>
          <linearGradient id="lensGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(40,44,52,0.98)" />
            <stop offset="1" stopColor="rgba(24,27,33,0.98)" />
          </linearGradient>
          <linearGradient id="connGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(232,224,208,0.10)" />
            <stop offset="1" stopColor="rgba(232,224,208,0.02)" />
          </linearGradient>
        </defs>

        {/* Era bands */}
        {ERAS.map((era) => {
          const x0 = xOf(era.start);
          const x1 = xOf(Math.min(era.end + 1, MAX_YEAR));
          const w = Math.max(0, x1 - x0);
          return (
            <g key={era.id}>
              <rect x={x0} y={BAND_TOP} width={w} height={BAND_H} fill={era.color} opacity={0.62} />
              <line x1={x0} x2={x0} y1={BAND_TOP} y2={BAND_BOTTOM} stroke="rgba(0,0,0,0.35)" strokeWidth={1} />
              {w > 70 && (
                <text x={x0 + w / 2} y={BAND_TOP + BAND_H / 2 + 3.5} className="era-label" textAnchor="middle">
                  {w > 150 ? era.name : era.short}
                </text>
              )}
            </g>
          );
        })}
        <rect x={PAD_L} y={BAND_TOP} width={trackW} height={BAND_H} fill="none" stroke="rgba(232,224,208,0.28)" />

        {/* Event hints (ticks above the band) */}
        <g className="event-ticks">
          {eventTicks.map((t) => (
            <line
              key={t.id}
              x1={t.x}
              x2={t.x}
              y1={BAND_TOP - 2}
              y2={BAND_TOP - 2 - t.h}
              stroke={t.color}
              strokeWidth={t.id === highlightEventId ? 2.5 : t.minor ? 0.9 : 1.3}
              opacity={t.id === highlightEventId ? 1 : t.minor ? 0.4 : 0.8}
            />
          ))}
        </g>

        {/* Snapshot markers (where the border data changes) */}
        <g className="snapshot-ticks">
          {SNAPSHOT_YEARS.map((y) => {
            const x = xOf(y);
            return <path key={y} d={`M${x - 3} ${BAND_BOTTOM + 7} L${x} ${BAND_BOTTOM + 2} L${x + 3} ${BAND_BOTTOM + 7} Z`} fill="rgba(232,224,208,0.55)" />;
          })}
        </g>

        {/* Macro axis labels */}
        <g className="axis">
          {macroTicks.map((t) => (
            <g key={t.year}>
              <line x1={t.x} x2={t.x} y1={BAND_BOTTOM + 8} y2={BAND_BOTTOM + 12} stroke="rgba(232,224,208,0.4)" />
              <text x={t.x} y={LABEL_Y} textAnchor="middle" className="axis-label">
                {t.label}
              </text>
            </g>
          ))}
        </g>

        {/* Lens connector + magnified strip */}
        {lens && (
          <g className="lens">
            <path
              d={`M${lens.left} ${LENS_BOTTOM} L${lens.right} ${LENS_BOTTOM} L${xOf(lens.end)} ${BAND_TOP - 1} L${xOf(lens.start)} ${BAND_TOP - 1} Z`}
              fill="url(#connGrad)"
              stroke="rgba(232,224,208,0.18)"
              strokeWidth={1}
            />
            <rect
              x={xOf(lens.start)}
              y={BAND_TOP - 20}
              width={Math.max(2, xOf(lens.end) - xOf(lens.start))}
              height={BAND_H + 20}
              fill="rgba(255,250,240,0.10)"
              stroke="rgba(255,250,240,0.6)"
              strokeWidth={1}
            />
            <rect x={lens.left} y={LENS_TOP} width={lensW} height={LENS_H} rx={8} fill="url(#lensGrad)" stroke="rgba(232,224,208,0.45)" strokeWidth={1} />
            {/* lens axis */}
            <clipPath id="lensClip">
              <rect x={lens.left} y={LENS_TOP} width={lensW} height={LENS_H} rx={8} />
            </clipPath>
            <line x1={lens.left + 6} x2={lens.right - 6} y1={LENS_AXIS_Y} y2={LENS_AXIS_Y} stroke="rgba(232,224,208,0.35)" />
            {lensTicks.map((t) => (
              <g key={t.year}>
                <line x1={t.x} x2={t.x} y1={LENS_AXIS_Y - 3} y2={LENS_AXIS_Y + 3} stroke="rgba(232,224,208,0.55)" />
                <text x={t.x} y={LENS_BOTTOM - 3} textAnchor="middle" className="lens-tick-label">
                  {t.label}
                </text>
              </g>
            ))}
            {SNAPSHOT_YEARS.filter((y) => y >= lens.start && y <= lens.end).map((y) => {
              const x = lens.xOfLens(y);
              return <line key={y} x1={x} x2={x} y1={LENS_TOP + 6} y2={LENS_AXIS_Y} stroke="rgba(232,224,208,0.22)" strokeDasharray="2 3" />;
            })}
            <g clipPath="url(#lensClip)">
              {lensEvents.map(({ ev, x, row, textX, anchor, short }) => {
                const color = CATEGORY_META[ev.category].color;
                const isHl = ev.id === highlightEventId;
                const stemTop = row !== null ? LENS_TOP + 6 + row * LABEL_ROW_H : LENS_TOP + 10;
                return (
                  <g
                    key={ev.id}
                    className="lens-event"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPickEvent?.(ev);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <title>{`${ev.title} (${formatYear(ev.year, { approx: ev.approx, ad: false })})`}</title>
                    <line x1={x} x2={x} y1={stemTop} y2={LENS_AXIS_Y} stroke={color} strokeWidth={isHl ? 2 : ev.importance >= 2 ? 1.2 : 0.8} opacity={0.7} />
                    <circle cx={x} cy={LENS_AXIS_Y} r={isHl ? 4 : ev.importance >= 2 ? 3 : 2.2} fill={color} stroke="#1b1e24" strokeWidth={1} />
                    {row !== null && (
                      <text x={textX} y={LENS_TOP + 16 + row * LABEL_ROW_H} textAnchor={anchor} className={`lens-event-label${isHl ? ' hl' : ''}`}>
                        {short}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
            {year >= lens.start && year <= lens.end && (
              <line x1={lens.xOfLens(year)} x2={lens.xOfLens(year)} y1={LENS_TOP + 2} y2={LENS_BOTTOM - 2} stroke="#f2e9d6" strokeWidth={1.5} />
            )}
            {previewX !== null && preview !== null && (
              <g>
                <line x1={previewX} x2={previewX} y1={LENS_TOP + 2} y2={LENS_BOTTOM - 2} stroke="rgba(255,255,255,0.55)" strokeDasharray="2 2" />
                <rect x={previewX - 26} y={LENS_BOTTOM + 2} width={52} height={14} rx={3} fill="#f2e9d6" />
                <text x={previewX} y={LENS_BOTTOM + 12.5} textAnchor="middle" className="lens-preview-label">
                  {formatYearShort(preview)}
                </text>
              </g>
            )}
          </g>
        )}

        {/* Preview cursor on the macro track (when not inside lens) */}
        {preview !== null && !pointerInLens && dragZone !== 'lens' && (
          <line x1={xOf(preview)} x2={xOf(preview)} y1={BAND_TOP - 4} y2={BAND_BOTTOM + 4} stroke="rgba(255,250,240,0.7)" strokeWidth={1} />
        )}

        {/* Handle for the selected year */}
        <g className="handle" transform={`translate(${handleX} 0)`}>
          <line x1={0} x2={0} y1={BAND_TOP - 22} y2={BAND_BOTTOM + 10} stroke="#f7efdd" strokeWidth={2} />
          <path d={`M0 ${BAND_TOP - 22} l-5 -7 h10 z`} fill="#f7efdd" />
          <circle cx={0} cy={BAND_BOTTOM + 10} r={4} fill="#f7efdd" stroke="#1b1e24" strokeWidth={1.2} />
        </g>
      </svg>
    </div>
  );
}
