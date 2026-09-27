import { Habit } from '../../data/models/habit.model';
import { daysBetween, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek, toDate, toDayKey } from './date-utils';

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

export function getHabitPeriodTarget(habit: Habit, date: Date): number {
  const period = habit.schedule?.frequencyPeriod ?? 'day';
  if (habit.type === 'binary') {
    return 1;
  }

  const baseTarget = Math.max(0, Number(habit.schedule?.dailyTargetValue ?? 0));
  if (period === 'day' || baseTarget <= 0) {
    return baseTarget;
  }

  if (!habit.createdDate) {
    return baseTarget;
  }

  const createdAt = toDate(habit.createdDate);
  if (!Number.isFinite(createdAt.getTime())) {
    return baseTarget;
  }

  const reference = startOfDay(date);
  const periodStart = period === 'week' ? startOfWeek(reference) : startOfMonth(reference);
  const periodEnd = period === 'week' ? endOfWeek(reference) : endOfMonth(reference);
  const createdDay = startOfDay(createdAt);

  // Only prorate during the period in which the habit was created.
  if (createdDay < periodStart || createdDay > periodEnd) {
    return baseTarget;
  }

  const activeStart = createdDay > periodStart ? createdDay : periodStart;
  const totalDays = Math.max(1, daysBetween(periodStart, periodEnd) + 1);
  const activeDays = Math.max(1, daysBetween(activeStart, periodEnd) + 1);
  const prorated = Math.round((baseTarget * activeDays) / totalDays);

  return Math.max(1, prorated);
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

  const target = getHabitPeriodTarget(habit, date);
  if (target <= 0) {
    return true; // no target configured => always due
  }
  return context.completedThisPeriod < target;
}

export function matchesDay(logDayKey: string, date: Date | string): boolean {
  return logDayKey === toDayKey(date);
}
