import { useMemo } from 'react';
import { useStore } from '../../state/store';
import { DateRange, HabitInstance } from '../../domain/types';

type Props = { completion: number };

export function KpiCards({ completion }: Props) {
  const { habits, instances, filters, todayISO } = useStore();

  const { activeCount, entriesLogged, topStreak } = useMemo(() => {
    const activeHabits = habits.filter((h) => h.isActive).filter((h) => (filters.tags.length ? h.tags.some((t) => filters.tags.includes(t)) : true));
    const range: DateRange = { from: filters.dateFrom, to: filters.dateTo };
    const inRange = instances.filter((i) => i.date >= range.from && i.date <= range.to && i.date <= todayISO);
    const completed = inRange.filter((i) => i.status === 'completed');

    return {
      activeCount: activeHabits.length,
      entriesLogged: completed.length,
      topStreak: computeTopStreak(activeHabits.map((h) => h.id), inRange)
    };
  }, [habits, instances, filters, todayISO]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Kpi title="Active habits" value={String(activeCount)} />
      <Kpi title="Avg completion (filtered)" value={`${Math.round(completion)}%`} />
      <Kpi title="Top streak" value={`${topStreak.value}d`} subtitle={topStreak.habit ?? '—'} />
      <Kpi title="Entries logged" value={String(entriesLogged)} />
    </div>
  );
}

function Kpi({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <div className="rounded-lg border border-slate-200/60 dark:border-slate-700/60 p-4 bg-white dark:bg-slate-900/50">
      <div className="text-sm text-slate-600 dark:text-slate-300">{title}</div>
      <div className="mt-1 text-3xl font-semibold tracking-tight">{value}</div>
      {subtitle ? <div className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</div> : null}
    </div>
  );
}

function computeTopStreak(habitIds: string[], rows: HabitInstance[]) {
  // For each habit, compute the longest consecutive-day streak with at least one completed instance per day.
  const byHabit = new Map<string, Map<string, boolean>>();
  for (const h of habitIds) byHabit.set(h, new Map());
  for (const r of rows) {
    if (!byHabit.has(r.habitId)) continue;
    if (r.status === 'completed') byHabit.get(r.habitId)!.set(r.date, true);
  }
  let best = { habit: undefined as string | undefined, value: 0 };
  for (const [hid, days] of byHabit) {
    const sorted = Array.from(days.keys()).sort();
    let current = 0;
    let prev: string | null = null;
    for (const d of sorted) {
      if (prev && addDaysISO(prev, 1) === d) {
        current += 1;
      } else {
        current = 1;
      }
      prev = d;
      if (current > best.value) best = { habit: hid, value: current };
    }
  }
  return best;
}

function addDaysISO(iso: string, delta: number): string {
  const dt = new Date(iso + 'T00:00:00');
  dt.setDate(dt.getDate() + delta);
  return dt.toISOString().slice(0, 10);
}

