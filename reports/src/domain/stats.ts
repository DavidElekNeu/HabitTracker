import { isAfter, parseISO, startOfISOWeek, formatISO, isBefore, isEqual } from 'date-fns';
import type { DateRange, Filters, Habit, HabitInstance } from './types';

export type DailySummary = {
  date: string; // YYYY-MM-DD
  completed: number;
  scheduled: number;
  pct: number | null; // null when scheduled == 0 for UI em dash
};

export type WeeklyBucket = {
  weekStart: string; // ISO date of Monday
  completed: number;
  scheduled: number;
  pct: number; // clamped [0,100]; 0 if scheduled==0
};

export function clampPercent(v: number): number {
  if (!isFinite(v) || isNaN(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

export function inRange(dateISO: string, range: DateRange, todayISO: string): boolean {
  // inclusive range, capped at today
  const d = parseISO(dateISO);
  const from = parseISO(range.from);
  const toCap = parseISO(range.to);
  const today = parseISO(todayISO);
  const end = isAfter(toCap, today) ? today : toCap;
  return (isAfter(d, from) || isEqual(d, from)) && (isBefore(d, end) || isEqual(d, end));
}

export function getScheduledInstances(
  range: DateRange,
  tags: string[],
  habits: Habit[],
  instances: HabitInstance[],
  todayISO: string
): HabitInstance[] {
  const allowedHabitIds = new Set(
    habits
      .filter((h) => h.isActive)
      .filter((h) => (tags.length ? h.tags.some((t) => tags.includes(t)) : true))
      .map((h) => h.id)
  );
  return instances.filter(
    (i) => allowedHabitIds.has(i.habitId) && inRange(i.date, { from: range.from, to: range.to }, todayISO)
  );
}

export function completionMicro(
  range: DateRange,
  tags: string[],
  habits: Habit[],
  instances: HabitInstance[],
  todayISO: string
): number {
  const rows = getScheduledInstances(range, tags, habits, instances, todayISO);
  const scheduled = rows.length;
  const completed = rows.filter((r) => r.status === 'completed').length;
  if (scheduled === 0) return 0;
  return clampPercent((completed / scheduled) * 100);
}

export function completionMacro(
  range: DateRange,
  tags: string[],
  habits: Habit[],
  instances: HabitInstance[],
  todayISO: string
): number {
  const rows = getScheduledInstances(range, tags, habits, instances, todayISO);
  const byHabit = new Map<string, HabitInstance[]>();
  for (const r of rows) {
    if (!byHabit.has(r.habitId)) byHabit.set(r.habitId, []);
    byHabit.get(r.habitId)!.push(r);
  }
  const perHabitPercents: number[] = [];
  for (const [habitId, arr] of byHabit) {
    const scheduled = arr.length;
    if (scheduled === 0) continue;
    const completed = arr.filter((a) => a.status === 'completed').length;
    perHabitPercents.push((completed / scheduled) * 100);
  }
  if (perHabitPercents.length === 0) return 0;
  const avg = perHabitPercents.reduce((a, b) => a + b, 0) / perHabitPercents.length;
  return clampPercent(avg);
}

export function dailyHeatstrip(
  range: DateRange,
  tags: string[],
  habits: Habit[],
  instances: HabitInstance[],
  todayISO: string
): DailySummary[] {
  const rows = getScheduledInstances(range, tags, habits, instances, todayISO);
  const byDate = new Map<string, HabitInstance[]>();
  for (const r of rows) {
    if (!byDate.has(r.date)) byDate.set(r.date, []);
    byDate.get(r.date)!.push(r);
  }
  // Enumerate each day in range (capped at today)
  const out: DailySummary[] = [];
  let cursor = parseISO(range.from);
  const endCap = (() => {
    const cap = parseISO(range.to);
    const t = parseISO(todayISO);
    return isAfter(cap, t) ? t : cap;
  })();
  while (isBefore(cursor, endCap) || isEqual(cursor, endCap)) {
    const d = formatISO(cursor, { representation: 'date' });
    const arr = byDate.get(d) ?? [];
    const scheduled = arr.length;
    const completed = arr.filter((a) => a.status === 'completed').length;
    const pct = scheduled === 0 ? null : clampPercent((completed / scheduled) * 100);
    out.push({ date: d, scheduled, completed, pct });
    // advance 1 day
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
  return out;
}

export function weeklyBuckets(
  range: DateRange,
  habits: Habit[],
  instances: HabitInstance[],
  todayISO: string,
  tags: string[] = []
): WeeklyBucket[] {
  const rows = getScheduledInstances(range, tags, habits, instances, todayISO);
  type Acc = { completed: number; scheduled: number };
  const byWeek = new Map<string, Acc>();
  for (const r of rows) {
    const weekStart = formatISO(startOfISOWeek(parseISO(r.date)), { representation: 'date' });
    const acc = byWeek.get(weekStart) ?? { completed: 0, scheduled: 0 };
    acc.scheduled += 1;
    if (r.status === 'completed') acc.completed += 1;
    byWeek.set(weekStart, acc);
  }
  const weeks = Array.from(byWeek.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([weekStart, { completed, scheduled }]) => ({
      weekStart,
      completed,
      scheduled,
      pct: scheduled === 0 ? 0 : clampPercent((completed / scheduled) * 100)
    }));
  return weeks;
}

export function weeklyAverageFromBuckets(buckets: WeeklyBucket[]): number {
  const completed = buckets.reduce((sum, b) => sum + b.completed, 0);
  const scheduled = buckets.reduce((sum, b) => sum + b.scheduled, 0);
  if (scheduled === 0) return 0;
  return clampPercent((completed / scheduled) * 100);
}

export function effectiveRange(from: string, to: string, todayISO: string): DateRange {
  // clamp to today inclusive
  const t = parseISO(todayISO);
  const toDate = parseISO(to);
  const cappedTo = isAfter(toDate, t) ? formatISO(t, { representation: 'date' }) : to;
  return { from, to: cappedTo };
}

export function pickCompletion(
  filters: Filters,
  habits: Habit[],
  instances: HabitInstance[],
  todayISO: string
): number {
  const range = { from: filters.dateFrom, to: filters.dateTo };
  return filters.agg === 'macro'
    ? completionMacro(range, filters.tags, habits, instances, todayISO)
    : completionMicro(range, filters.tags, habits, instances, todayISO);
}

