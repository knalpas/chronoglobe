# Chronoglobe

An interactive globe of political history from 5000 BC to the present. Drag the timeline to any year, see the frontiers of that moment, and open events and states for a short briefing.

## Run

```bash
npm install
npm run fetch-data   # downloads and simplifies historical borders (once)
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

## How to use

- **Drag** the timeline for coarse travel. **Hover** to open a magnifying lens, then drag inside it for year-by-year precision.
- **Scroll** over the timeline to step one year (⇧ = 10, ⌥ = 100). Arrow keys do the same; **[** / **]** jump between events; **Space** plays.
- Coloured ticks are events. Small triangles mark years where the border data changes.
- Click a state or an event marker for details. Wikipedia links are there to check the underlying claim.

## Data

- **Borders** come from [historical-basemaps](https://github.com/aourednik/historical-basemaps) (GPL-3.0): 50 snapshots from 5000 BC to 2010. The globe holds the latest snapshot at or before the selected year. Pre-modern lines are zones of influence; dashed borders are flagged as approximate by the source.
- **Events** are a hand-curated list in `src/data/events.ts`, each with a Wikipedia article. Dates marked *c.* are approximate or debated.

Re-download borders with `npm run fetch-data -- --force`.
