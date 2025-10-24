import { AnalyticsService } from './analytics.service';
import { Habit } from '../../data/models/habit.model';
import { HabitLog } from '../../data/models/log.model';

describe('AnalyticsService', () => {
  const service = new AnalyticsService();

  const createHabit = (overrides: Partial<Habit> = {}): Habit => ({
    id: overrides.id ?? 1,
    title: overrides.title ?? 'Test Habit',
    type: overrides.type ?? 'binary',
    schedule: overrides.schedule ?? {},
    createdDate: overrides.createdDate ?? new Date().toISOString(),
    ...overrides
  });

  const createLog = (overrides: Partial<HabitLog> = {}): HabitLog => ({
    id: overrides.id,
    habitId: overrides.habitId ?? 1,
    date: overrides.date ?? new Date().toISOString(),
    dayKey: overrides.dayKey ?? '2024-01-01',
    habitDayKey: overrides.habitDayKey ?? `1::${overrides.dayKey ?? '2024-01-01'}`,
    value: overrides.value ?? true,
    notes: overrides.notes,
    synced: overrides.synced ?? false
  });

  it('calculates completion rate with boolean logs', () => {
    const logs = [
      createLog({ value: true }),
      createLog({ value: false })
    ];
    expect(service.calculateCompletionRate(logs)).toBe(50);
  });

  it('treats numeric logs greater than zero as completed', () => {
    const logs = [
      createLog({ value: 3 }),
      createLog({ value: 0 })
    ];
    expect(service.calculateCompletionRate(logs)).toBe(50);
  });

  it('returns habit strength based on recent consistency', () => {
    const habit = createHabit({ type: 'frequency', schedule: { frequencyCount: 3 } });
    const logs = [
      createLog({ dayKey: '2024-01-01', value: true }),
      createLog({ dayKey: '2024-01-02', value: true }),
      createLog({ dayKey: '2024-01-03', value: true }),
      createLog({ dayKey: '2024-01-04', value: false })
    ];
    const strength = service.getHabitStrength(habit, logs);
    expect(strength).toBeGreaterThan(0);
    expect(strength).toBeLessThanOrEqual(100);
  });

  it('builds weekly trends with requested length', () => {
    const logs = [
      createLog({ date: '2024-06-01T00:00:00Z', dayKey: '2024-06-01', value: true }),
      createLog({ date: '2024-06-08T00:00:00Z', dayKey: '2024-06-08', value: false })
    ];
    const result = service.buildWeeklyTrend(logs, 6);
    expect(result.length).toBe(6);
    expect(result[0].label).toBeDefined();
  });

  it('builds heatmap cells with intensity', () => {
    const logs = [
      createLog({ dayKey: '2024-05-01', value: true }),
      createLog({ dayKey: '2024-05-01', value: true }),
      createLog({ dayKey: '2024-05-02', value: false })
    ];
    const heatmap = service.buildHeatmap(logs, 7);
    expect(heatmap.length).toBeLessThanOrEqual(7);
    const first = heatmap.find((cell) => cell.dayKey === '2024-05-01');
    expect(first?.value ?? 0).toBeGreaterThanOrEqual(0);
    expect(first?.intensity ?? 0).toBeGreaterThanOrEqual(0);
  });
});
