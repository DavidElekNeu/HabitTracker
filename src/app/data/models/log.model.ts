export interface HabitLog {
  id?: number;
  habitId: number;
  date: string;
  dayKey: string;
  habitDayKey: string;
  value: number | boolean;
  notes?: string;
  synced?: boolean;
}
