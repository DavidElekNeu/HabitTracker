import { Habit, HabitType } from '../../data/models/habit.model';
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

  switch (habit.type as HabitType) {
    case 'binary':
    case 'quantitative':
      return true;
    case 'frequency':
      return isFrequencyDue(habit, date, context.completedThisPeriod);
    default:
      return true;
  }
}

export function matchesDay(logDayKey: string, date: Date | string): boolean {
  return logDayKey === toDayKey(date);
}
