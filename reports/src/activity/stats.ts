import { addDays, differenceInCalendarDays, formatISO, isAfter, isBefore, isEqual, parseISO, startOfDay, startOfISOWeek } from 'date-fns';
import type { DayStat, HabitInstance } from './types';

export function clampPercent(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

export function iso(d: Date) {
  return formatISO(d, { representation: 'date' });
}

export function dayStats(dateISO: string, instances: HabitInstance[], todayISO?: string): DayStat {
  const today = todayISO ? parseISO(todayISO) : startOfDay(new Date());
  const d = parseISO(dateISO);
  if (isAfter(d, today)) {
    return { date: dateISO, scheduled: 0, completed: 0, pct: null };
  }
  const rows = instances.filter((i) => i.date === dateISO);
  const scheduled = rows.length;
  const completed = rows.filter((r) => r.status === 'completed').length;
  const pct = scheduled === 0 ? null : clampPercent((completed / scheduled) * 100);
  return { date: dateISO, scheduled, completed, pct };
}

export function eachDay(fromISO: string, toISO: string): string[] {
  const from = parseISO(fromISO);
  const to = parseISO(toISO);
  const days = Math.max(0, differenceInCalendarDays(to, from));
  const out: string[] = [];
  for (let i = 0; i <= days; i++) out.push(iso(addDays(from, i)));
  return out;
}

export function rangeStats(fromISO: string, toISO: string, instances: HabitInstance[], todayISO?: string): { completed: number; scheduled: number; pct: number } {
  const today = todayISO ? parseISO(todayISO) : startOfDay(new Date());
  const from = parseISO(fromISO);
  const toCap = parseISO(toISO);
  const to = isAfter(toCap, today) ? today : toCap;
  let completed = 0;
  let scheduled = 0;
  for (const date of eachDay(iso(from), iso(to))) {
    const ds = dayStats(date, instances, iso(today));
    completed += ds.completed;
    scheduled += ds.scheduled;
  }
  const pct = scheduled === 0 ? 0 : clampPercent((completed / scheduled) * 100);
  return { completed, scheduled, pct };
}

export function bucketByWeek(fromISO: string, toISO: string, instances: HabitInstance[], todayISO?: string) {
  const today = todayISO ? parseISO(todayISO) : startOfDay(new Date());
  const toCap = parseISO(toISO);
  const to = isAfter(toCap, today) ? today : toCap;
  const map = new Map<string, { completed: number; scheduled: number }>();
  for (const d of eachDay(fromISO, iso(to))) {
    const weekKey = iso(startOfISOWeek(parseISO(d)));
    const ds = dayStats(d, instances, iso(today));
    const acc = map.get(weekKey) ?? { completed: 0, scheduled: 0 };
    acc.completed += ds.completed;
    acc.scheduled += ds.scheduled;
    map.set(weekKey, acc);
  }
  return Array.from(map.entries()).map(([week, { completed, scheduled }]) => ({
    week,
    completed,
    scheduled,
    pct: scheduled === 0 ? 0 : clampPercent((completed / scheduled) * 100)
  }));
}

