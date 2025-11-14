export type HabitInstance = {
  habitId: string;
  date: string; // ISO YYYY-MM-DD
  status: 'scheduled' | 'completed' | 'skipped' | 'missed';
};

export type DayStat = {
  date: string;
  scheduled: number;
  completed: number;
  pct: number | null; // null => no schedule
};

