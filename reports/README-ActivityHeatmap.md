# Activity Heatmap (React + TypeScript)

An accessible, scalable activity heatmap with virtualization, yearly overview + brush, and micro-averaged stats.

## Stack
- React + TypeScript + Vite
- Zustand store
- Recharts (Year overview + Brush)
- react-window (horizontal virtualization)
- Vitest + React Testing Library

## Components
- `ActivityHeatmap`
  - Props: `instances`, `startDate?`, `endDate?`, `onRangeChange?`, `zoom?`
  - Renders 44×44px day cells in a horizontal virtualized list.
  - Intensities computed by micro-average per day: `completed / scheduled * 100`.
  - Future days excluded; when `scheduled = 0`, the cell shows a dashed pattern and tooltip reads `No schedule`.
  - Sticky month labels; tooltips like `YYYY-MM-DD — X/Y (Z%)`.
  - Keyboard: ←/→ 1 day; PgUp/PgDn 1 window; Home = today.
- `YearOverview`
  - 7×53 GitHub-style overview; brush selects visible window and updates the heatmap range.
  - Legend includes “no schedule” pattern.
- `RangeControls`
  - Zoom segmented: `21d | 30d | 90d | 6m | 1y | Custom` (hooks ready; demo wires stock presets).
  - Prev/Next window and Today.

## Stats (`src/activity/stats.ts`)
- `dayStats(date, instances)` → `{ scheduled, completed, pct }` (pct null when `scheduled = 0`).
- `rangeStats(from, to, instances)` → micro-average sum(completed)/sum(scheduled)*100 (clamped, future excluded).
- `bucketByWeek(from, to, instances)` → ISO week aggregation.

## Demo
- `ActivityDemo` in `src/activity/Demo.tsx`.
- Seeded data for ~1y in `src/activity/fixtures.ts` with some days having no schedule.

## Tests
- Future days do not affect percentages.
- `scheduled = 0` renders as em dash/dashed cell.
- Range changes via controls and brush (brush calls `onRangeChange`).
- Virtualization only renders visible cells.
- Keyboard navigation moves focus.

## Run
```
cd reports
npm install
npm run dev
```

Run tests:
```
npm test
```
