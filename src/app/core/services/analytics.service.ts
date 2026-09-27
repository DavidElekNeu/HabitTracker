import { Injectable } from '@angular/core';
import { Habit } from '../../data/models/habit.model';
import { HabitLog } from '../../data/models/log.model';
import { daysBetween, startOfDay, startOfMonth, startOfWeek, toDayKey } from '../utils/date-utils';
import { groupLogsByDay, isLogCompleted } from '../utils/log-helpers';
import { LanguageService } from '../../shared/services/language.service';

export interface CompletionTrendPoint {
  label: string;
  value: number;
  average?: number;
}

export interface HeatmapCell {
  dayKey: string;
  value: number; // completed count
  intensity: number; // completed / scheduled (0..1)
  scheduled?: number; // total logs (for labels)
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  constructor(
    private readonly languageService: LanguageService = {
      language: () => 'en'
    } as LanguageService
  ) {}
  calculateCompletionRate(logs: HabitLog[]): number {
    if (!logs.length) {
      return 0;
    }

    const completed = logs.filter(isLogCompleted);
    return Math.round((completed.length / logs.length) * 100);
  }

  /**
   * Goal-aware micro-average over a date range.
   * For each day, count how many active habits are considered completed that day:
   *  - Daily period:
   *    - Binary: any true log that day.
   *    - Quantitative: sum of values that day >= dailyTargetValue (if set), else > 0.
   *  - Weekly/Monthly period:
   *    - Binary: counts on the first day in the period with a true log.
   *    - Quantitative: counts on the first day cumulative period sum reaches the target (dailyTargetValue used as period target).
   * Then: rate = (sum over days of completed habits) / (days * activeHabits).
   */
  calculateMicroRateAgainstHabits(
    logs: HabitLog[],
    habits: Habit[],
    rangeStart: Date,
    rangeEnd: Date
  ): number {
    const active = (habits ?? []).filter((h) => !h.archived);
    if (!active.length) return 0;

    const today = new Date();
    const start = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
    const endRaw = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate());
    const end = endRaw > today ? new Date(today.getFullYear(), today.getMonth(), today.getDate()) : endRaw;

    const days = daysBetween(start, end) + 1;
    if (days <= 0) return 0;

    let completedTotal = 0;

    for (let i = 0; i < days; i++) {
      const dayStart = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const dayEnd = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate(), 23, 59, 59, 999);

      for (const habit of active) {
        const period = habit.schedule?.frequencyPeriod ?? 'day';
        const habitLogs = logs.filter((log) => log.habitId === habit.id);

        if (period === 'day') {
          const dayLogs = habitLogs.filter((log) => {
            const d = new Date(log.date);
            return d >= dayStart && d <= dayEnd;
          });
          if (habit.type === 'binary') {
            const done = dayLogs.some((log) => log.value === true);
            if (done) completedTotal++;
          } else {
            const sum = dayLogs.reduce((acc, log) => acc + (typeof log.value === 'number' ? Math.max(0, Number(log.value) || 0) : 0), 0);
            const target = Math.max(0, Number(habit.schedule?.dailyTargetValue ?? 0));
            const done = target > 0 ? sum >= target : sum > 0;
            if (done) completedTotal++;
          }
          continue;
        }

        // Weekly/Monthly goal-aware day completion
        const periodStart = period === 'week' ? startOfWeek(dayStart) : startOfMonth(dayStart);
        const inRange = (d: Date) => d >= periodStart && d <= dayEnd;
        const periodLogs = habitLogs.filter((log) => inRange(new Date(log.date)));

        if (habit.type === 'binary') {
          const anyToday = periodLogs.some((log) => new Date(log.date) >= dayStart && new Date(log.date) <= dayEnd && log.value === true);
          if (!anyToday) continue;
          const anyEarlier = periodLogs.some((log) => new Date(log.date) < dayStart && log.value === true);
          if (!anyEarlier) completedTotal++;
        } else {
          const target = Math.max(0, Number(habit.schedule?.dailyTargetValue ?? 0));
          const sumBefore = periodLogs
            .filter((log) => new Date(log.date) < dayStart)
            .reduce((acc, log) => acc + (typeof log.value === 'number' ? Math.max(0, Number(log.value) || 0) : 0), 0);
          const sumUntilToday = periodLogs
            .filter((log) => new Date(log.date) <= dayEnd)
            .reduce((acc, log) => acc + (typeof log.value === 'number' ? Math.max(0, Number(log.value) || 0) : 0), 0);
          if ((target > 0 && sumBefore < target && sumUntilToday >= target) || (target <= 0 && sumBefore <= 0 && sumUntilToday > 0)) {
            completedTotal++;
          }
        }
      }
    }

    const scheduled = days * active.length;
    const pct = scheduled > 0 ? (completedTotal / scheduled) * 100 : 0;
    const clamped = Math.max(0, Math.min(100, pct));
    return Math.round(clamped);
  }

  getHabitStrength(habit: Habit, logs: HabitLog[]): number {
    if (!logs.length) {
      return 0;
    }

    const recentLogs = logs
      .slice()
      .sort((a, b) => (a.dayKey < b.dayKey ? 1 : -1))
      .slice(0, 30);

    const completed = recentLogs.filter(isLogCompleted).length;
    const streakWeight = Math.min(completed / recentLogs.length, 1);

    const hasPeriod = (habit.schedule?.frequencyPeriod ?? 'day') !== 'day';
    const frequencyWeight = hasPeriod
      ? Math.min(
          completed / Math.max(1, 4),
          1
        )
      : completed / recentLogs.length;

    const recencyWeight = streakWeight * 0.6 + frequencyWeight * 0.4;
    return Math.round(recencyWeight * 100);
  }

  buildWeeklyTrend(logs: HabitLog[], numberOfWeeks = 8): CompletionTrendPoint[] {
    const trend: CompletionTrendPoint[] = [];
    const now = new Date();

    for (let i = numberOfWeeks - 1; i >= 0; i--) {
      const start = startOfWeek(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7));
      const end = new Date(start);
      end.setDate(end.getDate() + 6);

      const weeklyLogs = logs.filter((log) => {
        const logDate = new Date(log.date);
        return logDate >= start && logDate <= end;
      });

      const rate = this.calculateCompletionRate(weeklyLogs);

      trend.push({
        label: `${start.getMonth() + 1}/${start.getDate()}`,
        value: rate
      });
    }

    return trend;
  }

  /**
   * Daily trend for the last N days ending today.
   * Returns one point per calendar day with completion rate for that day.
   */
  buildDailyTrend(logs: HabitLog[], numberOfDays: number): CompletionTrendPoint[] {
    const trend: CompletionTrendPoint[] = [];
    const now = new Date();
    const end = startOfDay(now);

    for (let i = numberOfDays - 1; i >= 0; i--) {
      const dayStart = startOfDay(new Date(end.getFullYear(), end.getMonth(), end.getDate() - i));
      const dayEnd = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate(), 23, 59, 59, 999);

      const dayLogs = logs.filter((log) => {
        const d = new Date(log.date);
        return d >= dayStart && d <= dayEnd;
      });

      // Show short weekday name for daily chart labels (e.g., Mon, Tue)
      const label = dayStart.toLocaleDateString(this.languageService.language() === 'hu' ? 'hu-HU' : 'en-US', { weekday: 'short' });
      trend.push({
        label,
        value: this.calculateCompletionRate(dayLogs)
      });
    }

    return trend;
  }

  /**
   * Goal-aware daily trend over the last N days.
   * - For daily-period habits: same as usual per-day completion.
   * - For weekly/monthly-period habits:
   *   - Binary: counts completion on the first day of the period with a positive log.
   *   - Quantitative: counts completion on the day cumulative period sum reaches target.
   * The output is a percentage of habits completed that day (completed/scheduled * 100).
   */
  buildDailyGoalTrend(habits: Habit[], logs: HabitLog[], numberOfDays: number): CompletionTrendPoint[] {
    const trend: CompletionTrendPoint[] = [];
    const end = startOfDay(new Date());

    const activeHabits = (habits ?? []).filter((h) => !h.archived);
    const scheduledPerDay = activeHabits.length;

    for (let i = numberOfDays - 1; i >= 0; i--) {
      const dayStart = startOfDay(new Date(end.getFullYear(), end.getMonth(), end.getDate() - i));
      const dayEnd = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate(), 23, 59, 59, 999);

      let completedCount = 0;

      for (const habit of activeHabits) {
        const period = habit.schedule?.frequencyPeriod ?? 'day';

        if (period === 'day') {
          const dayLogs = logs.filter(
            (log) => log.habitId === habit.id && new Date(log.date) >= dayStart && new Date(log.date) <= dayEnd
          );
          if (habit.type === 'binary') {
            const done = dayLogs.some((log) => log.value === true);
            if (done) completedCount++;
          } else {
            const sum = dayLogs.reduce(
              (acc, log) => acc + (typeof log.value === 'number' ? Math.max(0, Number(log.value) || 0) : 0),
              0
            );
            const target = Math.max(0, Number(habit.schedule?.dailyTargetValue ?? 0));
            const done = target > 0 ? sum >= target : sum > 0;
            if (done) completedCount++;
          }
          continue;
        }

        // Weekly/Monthly: attribute completion to the day it's achieved within the current period.
        const periodStart = period === 'week' ? startOfWeek(dayStart) : startOfMonth(dayStart);
        const inRange = (d: Date) => d >= periodStart && d <= dayEnd;
        const habitLogsInPeriod = logs.filter((log) => log.habitId === habit.id && inRange(new Date(log.date)));

        if (habit.type === 'binary') {
          // Completed today if we have a positive log today and none earlier in the period
          const anyToday = habitLogsInPeriod.some(
            (log) => new Date(log.date) >= dayStart && new Date(log.date) <= dayEnd && log.value === true
          );
          if (!anyToday) {
            continue;
          }
          const anyEarlier = habitLogsInPeriod.some((log) => new Date(log.date) < dayStart && log.value === true);
          if (!anyEarlier && anyToday) {
            completedCount++;
          }
        } else {
          // Quantitative: completed on the first day when cumulative sum reaches target
          const target = Math.max(0, Number(habit.schedule?.dailyTargetValue ?? 0));
          const sumBefore = habitLogsInPeriod
            .filter((log) => new Date(log.date) < dayStart)
            .reduce((acc, log) => acc + (typeof log.value === 'number' ? Math.max(0, Number(log.value) || 0) : 0), 0);
          const sumUntilToday = habitLogsInPeriod
            .filter((log) => new Date(log.date) <= dayEnd)
            .reduce((acc, log) => acc + (typeof log.value === 'number' ? Math.max(0, Number(log.value) || 0) : 0), 0);
          if ((target > 0 && sumBefore < target && sumUntilToday >= target) || (target <= 0 && sumBefore <= 0 && sumUntilToday > 0)) {
            completedCount++;
          }
        }
      }

      const pct = scheduledPerDay > 0 ? Math.round((completedCount / scheduledPerDay) * 100) : 0;
      const label = dayStart.toLocaleDateString(this.languageService.language() === 'hu' ? 'hu-HU' : 'en-US', { weekday: 'short' });
      trend.push({ label, value: pct });
    }

    return trend;
  }

  buildMonthlyAverages(logs: HabitLog[], monthsBack = 6): CompletionTrendPoint[] {
    const trend: CompletionTrendPoint[] = [];
    const now = new Date();

    for (let i = monthsBack - 1; i >= 0; i--) {
      const start = startOfMonth(new Date(now.getFullYear(), now.getMonth() - i, 1));
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);

      const monthLogs = logs.filter((log) => {
        const logDate = new Date(log.date);
        return logDate >= start && logDate <= end;
      });

      trend.push({
        label: start.toLocaleString('default', { month: 'short' }),
        value: this.calculateCompletionRate(monthLogs)
      });
    }

    return trend;
  }

  buildHeatmap(logs: HabitLog[], rangeInDays = 21): HeatmapCell[] {
    // Always show a fixed window ending today, filling missing days with 0s
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (rangeInDays - 1));

    const grouped = groupLogsByDay(logs ?? []);

    const cells: HeatmapCell[] = [];
    for (let i = rangeInDays - 1; i >= 0; i--) {
      const day = new Date(endDate);
      day.setDate(day.getDate() - i);
      const key = toDayKey(day);
      const dayLogs = grouped[key] ?? [];
      const completedCount = dayLogs.filter(isLogCompleted).length;
      const scheduled = dayLogs.length;
      const intensity = Math.min(completedCount / Math.max(scheduled, 1), 1);

      cells.push({
        dayKey: key,
        value: completedCount,
        intensity,
        scheduled
      });
    }

    return cells;
  }
}
