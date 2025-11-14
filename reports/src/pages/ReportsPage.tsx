import { format, parseISO } from 'date-fns';
import { RangeControls } from '../activity/components/RangeControls';
import { ActivityHeatmap } from '../activity/components/ActivityHeatmap';
import { YearOverview } from '../activity/components/YearOverview';
import { useReportRange } from '../activity/reportRangeStore';

export function ReportsPage() {
  const { from, to, prevWindow, nextWindow, today } = useReportRange();

  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevWindow();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextWindow();
    } else if (e.key === 'Home') {
      e.preventDefault();
      today();
    }
  };

  const fmt = (d: string) => format(parseISO(d), 'MMM d, yyyy');

  return (
    <section aria-labelledby="recent-activity" className="px-4 sm:px-6 lg:px-8 py-6 space-y-4" data-testid="activity-heatmap-v2">
      <header className="flex items-center justify-between gap-3" role="region" aria-label="Recent activity controls" tabIndex={0} onKeyDown={onKey}>
        <h3 id="recent-activity" className="text-sm font-medium opacity-80">
          Recent activity — {fmt(from)} → {fmt(to)}
        </h3>
        <div className="flex items-center gap-2">
          <RangeControls />
          <div className="flex gap-1">
            <button className="btn btn-ghost h-10 px-3 rounded-md border bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600" onClick={prevWindow} aria-label="Previous window">Prev</button>
            <button className="btn btn-ghost h-10 px-3 rounded-md border bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600" onClick={nextWindow} aria-label="Next window">Next</button>
            <button className="btn btn-outline h-10 px-3 rounded-md border bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600" onClick={today} aria-label="Jump to today">Today</button>
          </div>
        </div>
      </header>

      <ActivityHeatmap />
      <div className="mt-2">
        <YearOverview />
      </div>
    </section>
  );
}
