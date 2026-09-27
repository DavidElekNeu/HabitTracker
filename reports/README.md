# Habit Reports (React + Vite + Tailwind)

Responsive Habit Reports dashboard with correct micro/macro percentage logic, seeded data, and unit tests.

## Tech

- React + TypeScript + Vite
- State: Zustand
- Charts: Recharts
- Styling: Tailwind (prefers-color-scheme dark)
- Tests: Vitest + Testing Library

## Getting started

```
cd reports
npm install
npm run dev
```

Run tests and coverage:

```
npm test
```

## Data model

TypeScript types live in `src/domain/types.ts`.

## Seed data

`src/domain/fixtures.ts` provides ~8 active habits (with 2 tagged `Sport`) and deterministic instances. The last 14 days contain ~11 completed entries. Some days have zero scheduling and a few future instances exist to prove exclusion.

## Formulas (stats.ts)

All utilities exclude future days and clamp percentages to [0, 100]. Values are not rounded at the data level; rounding is applied only for display.

- `getScheduledInstances(range, tags)` – returns instances for active habits within the inclusive date range clamped to today, filtered by tags. Any status counts as a scheduled instance.
- `completionMicro(range, tags)` – micro-average: sum(completed) / sum(scheduled) * 100.
- `completionMacro(range, tags)` – macro-average: mean over habits of (completed / scheduled) * 100, for habits with scheduled > 0.
- `dailyHeatstrip(range, tags)` – per-day summaries with `pct = null` when `scheduled == 0` (rendered as `—`).
- `weeklyBuckets(range, tags)` – ISO-week buckets `{ weekStart, completed, scheduled, pct }`.
- `weeklyAverageFromBuckets(buckets)` – header "Weekly avg" computed as aggregate ratio sum(completed) / sum(scheduled) * 100 over the visible bars, not the mean of percents.

## UI behavior

- KPI cards: Active habits • Avg completion (filtered) • Top streak • Entries logged.
- Recent activity heatstrip: last ~21 days; tooltip `YYYY-MM-DD — X/Y completed (Z%)`. Squares show a dashed outline when `scheduled == 0` (rendered as `—`).
- Weekly completion bars: last up to 8 weeks from the current filter range; labels show integer `%` and tooltip shows `completed/scheduled` and `%`. Right-aligned header shows "Weekly avg" computed from visible bars.
- Habit health list: Name • Strength (0–100, mocked deterministically) • Completion % • Streak (Xd). Sorted by "At risk" first (low completion, then low strength). Row actions: Rename, Edit schedule, Archive.
- Filters: sticky filter bar with segmented controls for range (7/30/Quarter/Year), tag chips (multi), and aggregation mode (Micro/Macro). Reset restores defaults. A summary chip near the title shows the active range and selected tags.

## Accessibility & theming

- WCAG AA color contrast; visible focus states; large 44×44px click targets for filter controls.
- Dark mode via `prefers-color-scheme` and Tailwind’s media strategy.
- Color-blind friendly palette; heatstrip uses color + outline pattern; weekly bars use a single hue with labels.

## Percentage correctness

See `src/domain/stats.ts` and `src/domain/stats.test.ts`.

Unit tests cover:

- Future days do not affect percentages.
- Days with `0` scheduled produce `—` (null pct) in the heatstrip, not `0%`.
- Micro vs macro produce different, deterministic results on seeded data.
- Weekly avg equals the aggregate ratio of visible weeks (sum completed / sum scheduled), not the mean of weekly percents.

## Switching Micro/Macro in the UI

Use the segmented control on the right of the filter bar to toggle between Micro and Macro. KPI and charts recompute using the selected aggregation and the active filters.

