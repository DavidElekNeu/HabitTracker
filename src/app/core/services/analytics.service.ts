import { Injectable } from '@angular/core';
import { Habit } from '../../data/models/habit.model';
import { HabitLog } from '../../data/models/log.model';
import { daysBetween, startOfMonth, startOfWeek, toDayKey } from '../utils/date-utils';
import { groupLogsByDay, isLogCompleted } from '../utils/log-helpers';

export interface CompletionTrendPoint {
  label: string;
  value: number;
  average?: number;
}

export interface HeatmapCell {
  dayKey: string;
  value: number;
  intensity: number;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  calculateCompletionRate(logs: HabitLog[]): number {
    if (!logs.length) {
      return 0;
    }

    const completed = logs.filter(isLogCompleted);
    return Math.round((completed.length / logs.length) * 100);
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

    const frequencyWeight =
      habit.type === 'frequency'
        ? Math.min(
            completed / Math.max(1, (habit.schedule.frequencyCount ?? 1) * 4),
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

  buildHeatmap(logs: HabitLog[], rangeInDays = 42): HeatmapCell[] {
    if (!logs.length) {
      return [];
    }

    const sorted = logs
      .slice()
      .sort((a, b) => (a.dayKey > b.dayKey ? 1 : -1));

    const start = sorted[0]?.dayKey ?? toDayKey(new Date());
    const end = toDayKey(new Date());

    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = daysBetween(startDate, endDate);
    const totalDays = Math.min(diff + 1, rangeInDays);

    const grouped = groupLogsByDay(sorted);

    const cells: HeatmapCell[] = [];
    for (let i = totalDays - 1; i >= 0; i--) {
      const day = new Date(endDate);
      day.setDate(day.getDate() - i);
      const key = toDayKey(day);
      const dayLogs = grouped[key] ?? [];
      const completedCount = dayLogs.filter(isLogCompleted).length;
      const intensity = Math.min(completedCount / Math.max(dayLogs.length, 1), 1);

      cells.push({
        dayKey: key,
        value: completedCount,
        intensity
      });
    }

    return cells;
  }
}
