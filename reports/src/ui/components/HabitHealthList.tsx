import { useMemo } from 'react';
import { useStore } from '../../state/store';
import type { Habit } from '../../domain/types';

type Row = {
  habit: Habit;
  strength: number; // 0..100
  completion: number; // 0..100
  streak: number; // days
};

export function HabitHealthList() {
  const { habits, instances, filters, todayISO } = useStore();

  const rows = useMemo<Row[]>(() => {
    const hs = habits.filter((h) => h.isActive).filter((h) => (filters.tags.length ? h.tags.some((t) => filters.tags.includes(t)) : true));
    return hs.map((h) => {
      const inRange = instances.filter((i) => i.habitId === h.id && i.date >= filters.dateFrom && i.date <= filters.dateTo && i.date <= todayISO);
      const scheduled = inRange.length;
      const completed = inRange.filter((i) => i.status === 'completed').length;
      const completion = scheduled === 0 ? 0 : Math.round((completed / scheduled) * 100);
      const streak = computeStreak(inRange);
      const strength = mockStrength(h.id);
      return { habit: h, strength, completion, streak };
    })
    .sort((a, b) => {
      // At risk first: lower completion, then lower strength
      if (a.completion !== b.completion) return a.completion - b.completion;
      return a.strength - b.strength;
    });
  }, [habits, instances, filters, todayISO]);

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200/60 dark:border-slate-700/60 p-6 text-sm text-slate-600 dark:text-slate-300">No habits match the selected filters.</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-left text-slate-600 dark:text-slate-300">
          <tr>
            <th className="py-2 pr-6">Name</th>
            <th className="py-2 pr-6">Strength</th>
            <th className="py-2 pr-6">Completion %</th>
            <th className="py-2 pr-6">Streak</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.habit.id} className="border-t border-slate-200/60 dark:border-slate-700/60">
              <td className="py-3 pr-6">{r.habit.name}</td>
              <td className="py-3 pr-6"><Progress value={r.strength} /></td>
              <td className="py-3 pr-6"><Progress value={r.completion} label={`${r.completion}%`} /></td>
              <td className="py-3 pr-6">{r.streak}d</td>
              <td className="py-3">
                <div className="flex gap-2 justify-end">
                  <button className="h-10 px-3 rounded-md border bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600">Rename</button>
                  <button className="h-10 px-3 rounded-md border bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600">Edit schedule</button>
                  <button className="h-10 px-3 rounded-md border bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600">Archive</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Progress({ value, label }: { value: number; label?: string }) {
  return (
    <div className="min-w-[160px] flex items-center gap-2">
      <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} role="progressbar">
        <div className="h-3 rounded-full bg-brand-600" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <span className="tabular-nums text-slate-600 dark:text-slate-300">{label ?? `${value}%`}</span>
    </div>
  );
}

function mockStrength(seed: string): number {
  // deterministic hash -> 0..100
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return (h % 101);
}

function computeStreak(rows: { date: string; status: string }[]) {
  const completedDates = new Set(rows.filter((r) => r.status === 'completed').map((r) => r.date));
  const sorted = Array.from(completedDates.values()).sort();
  let best = 0;
  let curr = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    if (prev && addDaysISO(prev, 1) === d) curr += 1; else curr = 1;
    prev = d;
    best = Math.max(best, curr);
  }
  return best;
}

function addDaysISO(iso: string, delta: number): string {
  const dt = new Date(iso + 'T00:00:00');
  dt.setDate(dt.getDate() + delta);
  return dt.toISOString().slice(0, 10);
}

