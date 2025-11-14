import { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, Brush } from 'recharts';
import { addDays, differenceInCalendarDays, formatISO, parseISO, startOfDay } from 'date-fns';
import { dayStats, eachDay } from '../stats';
import type { HabitInstance } from '../types';
import { useReportRange } from '../reportRangeStore';
import { demoInstances } from '../fixtures';

export function YearOverview({ instances = demoInstances, from, to, onRangeChange }: { instances?: HabitInstance[]; from?: string; to?: string; onRangeChange?: (from: string, to: string) => void }) {
  const { from: storeFrom, to: storeTo, setRange } = useReportRange();
  const F = from ?? storeFrom;
  const T = to ?? storeTo;
  const days = useMemo(() => eachDay(F, T), [F, T]);
  const data = useMemo(() => days.map((d, i) => ({
    idx: i,
    date: d,
    pct: (dayStats(d, instances).pct ?? 0)
  })), [days, instances]);

  const handleBrush = (range: any) => {
    if (!range || range.startIndex == null || range.endIndex == null) return;
    const start = days[Math.max(0, range.startIndex)];
    const end = days[Math.min(days.length - 1, range.endIndex)];
    if (onRangeChange) onRangeChange(start, end);
    else setRange(start, end);
  };

  return (
    <div className="w-full h-24">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
          <XAxis dataKey="idx" hide />
          <Area type="monotone" dataKey="pct" stroke="#94a3b8" fill="#e2e8f0" hide />
          <Brush dataKey="idx" startIndex={Math.max(0, data.length - 30)} endIndex={data.length - 1} onChange={handleBrush} height={20} travellerWidth={8} />
        </AreaChart>
      </ResponsiveContainer>
      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-1 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
      <span>Intensity:</span>
      <span className="inline-block h-3 w-3 rounded bg-slate-200" />
      <span className="inline-block h-3 w-3 rounded bg-amber-400" />
      <span className="inline-block h-3 w-3 rounded bg-emerald-400" />
      <span className="inline-block h-3 w-3 rounded bg-emerald-600" />
      <span className="ml-4">No schedule: <span className="inline-block h-3 w-3 rounded border border-dashed border-slate-400 align-middle"></span></span>
    </div>
  );
}
