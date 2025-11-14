export type HabitId = string;
export type InstanceId = string;

export type Habit = {
  id: HabitId;
  name: string;
  tags: string[];
  isActive: boolean;
};

export type HabitInstance = {
  id: InstanceId;
  habitId: HabitId;
  date: string; // ISO (YYYY-MM-DD), local day
  status: 'scheduled' | 'completed' | 'skipped' | 'missed';
};

export type Filters = {
  dateFrom: string; // inclusive
  dateTo: string; // inclusive, must not exceed today
  tags: string[]; // multi-select
  agg: 'micro' | 'macro'; // weighting mode
};

export type DateRange = { from: string; to: string };

