import { describe, it, expect } from 'vitest';
import { demoInstances } from './fixtures';
import { bucketByWeek, dayStats, rangeStats } from './stats';

const todayISO = new Date().toISOString().slice(0, 10);

function addDaysISO(iso: string, delta: number): string {
  const dt = new Date(iso + 'T00:00:00');
  dt.setDate(dt.getDate() + delta);
  return dt.toISOString().slice(0, 10);
}

describe('stats.ts', () => {
  it('dayStats excludes future days and returns null pct when scheduled=0', () => {
    const future = addDaysISO(todayISO, 5);
    const ds = dayStats(future, demoInstances, todayISO);
    expect(ds.pct).toBeNull();
    expect(ds.scheduled).toBe(0);
    expect(ds.completed).toBe(0);
  });

  it('rangeStats micro-average and clamping', () => {
    const from = addDaysISO(todayISO, -30);
    const to = addDaysISO(todayISO, 7); // includes future
    const r1 = rangeStats(from, to, demoInstances, todayISO);
    const r2 = rangeStats(from, todayISO, demoInstances, todayISO);
    expect(Math.abs(r1.pct - r2.pct)).toBeLessThan(1e-9);
    expect(r1.pct).toBeGreaterThanOrEqual(0);
    expect(r1.pct).toBeLessThanOrEqual(100);
  });

  it('bucketByWeek aggregates to weeks', () => {
    const from = addDaysISO(todayISO, -56);
    const to = todayISO;
    const weeks = bucketByWeek(from, to, demoInstances, todayISO);
    expect(weeks.length).toBeGreaterThan(0);
    expect(weeks[0]).toHaveProperty('completed');
    expect(weeks[0]).toHaveProperty('scheduled');
    expect(weeks[0]).toHaveProperty('pct');
  });
});

