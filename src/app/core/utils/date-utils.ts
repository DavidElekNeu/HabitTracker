export const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function toDayKey(value: Date | string): string {
  const date = toDate(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createHabitDayKey(habitId: number, dayKey: string): string {
  return `${habitId}::${dayKey}`;
}

export function daysBetween(a: Date | string, b: Date | string): number {
  const start = startOfDay(toDate(a));
  const end = startOfDay(toDate(b));
  // Count calendar dates, not 24-hour intervals (DST days can be 23 or 25 hours).
  const startDate = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endDate = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.abs((endDate - startDate) / MILLISECONDS_PER_DAY);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function startOfWeek(date: Date, weekStartsOn: number = 1): Date {
  const start = startOfDay(date);
  const currentDay = start.getDay();
  const diff = (currentDay < weekStartsOn ? 7 : 0) + currentDay - weekStartsOn;
  start.setDate(start.getDate() - diff);
  return start;
}

export function endOfWeek(date: Date, weekStartsOn: number = 1): Date {
  const start = startOfWeek(date, weekStartsOn);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function isWithinRange(target: Date | string, start: Date, end: Date): boolean {
  const value = toDate(target);
  return value >= start && value <= end;
}
