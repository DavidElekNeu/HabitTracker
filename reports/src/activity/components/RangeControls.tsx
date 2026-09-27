import clsx from 'clsx';
import { useReportRange, type Zoom } from '../reportRangeStore';

export function RangeControls() {
  const { zoom, from, to, setZoom, prevWindow, nextWindow, today } = useReportRange();
  const btn = (z: Zoom, label: string) => (
    <button
      onClick={() => setZoom(z)}
      className={clsx('h-10 px-3 rounded-full text-sm border', zoom === z ? 'bg-brand-600 text-white border-transparent' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600')}
      aria-pressed={zoom === z}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {btn('21d', '21d')}
      {btn('30d', '30d')}
      {btn('90d', '90d')}
      {btn('6m', '6m')}
      {btn('1y', '1y')}
      {btn('custom', 'Custom')}
      <div className="ml-auto flex items-center gap-2">
        <button onClick={prevWindow} className="h-10 px-3 rounded-md border bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600">Prev</button>
        <button onClick={nextWindow} className="h-10 px-3 rounded-md border bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600">Next</button>
        <button onClick={today} className="h-10 px-3 rounded-md border bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600">Today</button>
      </div>
    </div>
  );
}
