import { HabitLog } from '../../data/models/log.model';
import { toDayKey } from './date-utils';

export interface GroupedByDay {
  [dayKey: string]: HabitLog[];
}

export function groupLogsByDay(logs: HabitLog[]): GroupedByDay {
  return logs.reduce<GroupedByDay>((acc, log) => {
    const key = log.dayKey ?? toDayKey(log.date);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(log);
    return acc;
  }, {});
}

export function isLogCompleted(log: HabitLog): boolean {
  if (typeof log.value === 'boolean') {
    return log.value;
  }
  return Number(log.value) > 0;
}
