import { Habit } from '../../data/models/habit.model';
import { toDayKey } from './date-utils';

function isAllowedWeekday(habit: Habit, date: Date): boolean {
  const scheduleDays = habit.schedule.allowedWeekdays;
  if (!scheduleDays || scheduleDays.length === 0) {
    return true;
  }
  return scheduleDays.includes(date.getDay());
}

function isFrequencyDue(habit: Habit, date: Date, completedThisPeriod: number): boolean {
  const period = habit.schedule.frequencyPeriod ?? 'week';
  const target = habit.schedule.frequencyCount ?? 1;
  if (target <= 0) {
    return true;
  }
  return completedThisPeriod < target;
}

export interface HabitDueContext {
  dayKey?: string;
  completedThisPeriod: number;
}

export function isHabitDueToday(
  habit: Habit,
  date: Date,
  context: HabitDueContext = { completedThisPeriod: 0 }
): boolean {
  if (habit.archived) {
    return false;
  }

  if (!isAllowedWeekday(habit, date)) {
    return false;
  }

  // Period-based due: default 'day'. For non-daily periods, due until the period target is reached.
  const period = habit.schedule?.frequencyPeriod ?? 'day';
  if (period === 'day') {
    return true;
  }
  // Determine target for the period: binary -> 1, quantitative -> dailyTargetValue (interpreted as per-period target)
  const target = habit.type === 'binary' ? 1 : Math.max(0, Number(habit.schedule?.dailyTargetValue ?? 0));
  if (target <= 0) {
    return true; // no target configured => always due
  }
  return context.completedThisPeriod < target;
}

export function matchesDay(logDayKey: string, date: Date | string): boolean {
  return logDayKey === toDayKey(date);
}
