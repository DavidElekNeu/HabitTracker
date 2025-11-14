import { describe, it, expect } from 'vitest';
import { habits as seedHabits, habitInstances as seedInstances } from './fixtures';
import {
  completionMicro,
  completionMacro,
  dailyHeatstrip,
  weeklyAverageFromBuckets,
  weeklyBuckets,
  getScheduledInstances,
  clampPercent,
  effectiveRange,
  pickCompletion
} from './stats';

const todayISO = new Date().toISOString().slice(0, 10);

describe('stats utilities', () => {
  it('excludes future days from scheduled instances and micro percentage', () => {
    const from = addDaysISO(todayISO, -14);
    const to = addDaysISO(todayISO, 7); // includes future
    const range = { from, to };
    const rows = getScheduledInstances(range, [], seedHabits, seedInstances, todayISO);
    expect(rows.every((r) => r.date <= todayISO)).toBe(true);

    const microWithFuture = completionMicro(range, [], seedHabits, seedInstances, todayISO);
    const microCapped = completionMicro({ from, to: todayISO }, [], seedHabits, seedInstances, todayISO);
    expect(Math.abs(microWithFuture - microCapped)).toBeLessThanOrEqual(0.0001);
  });

  it('heatstrip marks days with 0 scheduled as null pct (rendered as em dash)', () => {
    // Pick a short range likely to include empty days due to sparse scheduling
    const from = addDaysISO(todayISO, -7);
    const to = todayISO;
    const days = dailyHeatstrip({ from, to }, [], seedHabits, seedInstances, todayISO);
    const hasZero = days.some((d) => d.scheduled === 0 && d.pct === null);
    expect(hasZero).toBe(true);
  });

  it('micro and macro averages differ on seeded data', () => {
    const from = addDaysISO(todayISO, -14);
    const to = todayISO;
    const micro = completionMicro({ from, to }, [], seedHabits, seedInstances, todayISO);
    const macro = completionMacro({ from, to }, [], seedHabits, seedInstances, todayISO);
    expect(micro).toBeGreaterThan(0);
    expect(macro).toBeGreaterThan(0);
    // Deterministically should not match exactly with our distribution
    expect(Math.abs(micro - macro)).toBeGreaterThan(0.5);
  });

  it('weekly average equals aggregate completed/scheduled across visible weeks (not mean of percents)', () => {
    const from = addDaysISO(todayISO, -56);
    const to = todayISO;
    const buckets = weeklyBuckets({ from, to }, seedHabits, seedInstances, todayISO, []);
    const visible = buckets.slice(-8);
    const avg = weeklyAverageFromBuckets(visible);
    const sums = visible.reduce(
      (acc, b) => {
        acc.completed += b.completed;
        acc.scheduled += b.scheduled;
        return acc;
      },
      { completed: 0, scheduled: 0 }
    );
    const expected = sums.scheduled === 0 ? 0 : (sums.completed / sums.scheduled) * 100;
    expect(Math.abs(avg - expected)).toBeLessThan(1e-9);
  });

  it('clamps percent and caps effective range to today', () => {
    expect(clampPercent(150)).toBe(100);
    expect(clampPercent(-5)).toBe(0);
    expect(clampPercent(Number.NaN)).toBe(0);

    const eff = effectiveRange(addDaysISO(todayISO, -5), addDaysISO(todayISO, 5), todayISO);
    expect(eff.to).toBe(todayISO);
  });

  it('pickCompletion switches between micro and macro', () => {
    const from = addDaysISO(todayISO, -14);
    const to = todayISO;
    const filtersMicro = { dateFrom: from, dateTo: to, tags: [], agg: 'micro' as const };
    const filtersMacro = { ...filtersMicro, agg: 'macro' as const };
    const micro = pickCompletion(filtersMicro, seedHabits, seedInstances, todayISO);
    const macro = pickCompletion(filtersMacro, seedHabits, seedInstances, todayISO);
    expect(micro).toBeCloseTo(
      completionMicro({ from, to }, [], seedHabits, seedInstances, todayISO)
    );
    expect(macro).toBeCloseTo(
      completionMacro({ from, to }, [], seedHabits, seedInstances, todayISO)
    );
  });
});

function addDaysISO(iso: string, delta: number): string {
  const dt = new Date(iso + 'T00:00:00');
  dt.setDate(dt.getDate() + delta);
  return dt.toISOString().slice(0, 10);
}
