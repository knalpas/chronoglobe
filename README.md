# Chronoglobe

An interactive globe of political history from 5000 BC to the present. Drag the timeline to any year, see the frontiers of that moment, and open events and states for a short briefing.

**Live:** [knalpas.github.io/chronoglobe](https://knalpas.github.io/chronoglobe/)

## Run

```bash
npm install
npm run fetch-data     # historical-basemaps snapshots (once)
npm run fetch-cshapes  # CShapes 2.0 modern borders (once)
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

## How to use

- Open a year directly: `?year=1492` or `?year=44bc`. The **Link** button copies the current address.
- **Scroll** over the timeline to step one year (⇧ = 10, ⌥ = 100). Arrow keys do the same; **[** / **]** jump between events; **Space** plays.
- Coloured ticks are events. Small triangles mark years where the border data changes.
- Click a state or an event marker for details. Wikipedia links are there to check the underlying claim.

## Data

- **Borders** before 1886 come from [historical-basemaps](https://github.com/aourednik/historical-basemaps) (GPL-3.0). From 1886 to 2019 they come from [CShapes 2.0](https://icr.ethz.ch/data/cshapes/) (Schvitz et al. 2022): independent states and dependencies, filtered to 1 January of the selected year. Pre-modern lines are zones of influence; dashed borders are flagged as approximate by historical-basemaps.
- **Events** are a hand-curated list in `src/data/events.ts` (the major layer), plus a Wikidata supplement in `src/data/wikidata-events.json`. Wikidata items need a date, coordinates, an English Wikipedia article, and enough language editions to count as notable. Dates marked *c.* are approximate or debated.

Re-download historical-basemaps with `npm run fetch-data -- --force`. Refresh CShapes with `npm run fetch-cshapes -- --force`. Refresh extra events with `npm run fetch-events`.
