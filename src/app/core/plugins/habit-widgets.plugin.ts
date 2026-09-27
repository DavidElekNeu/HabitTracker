import { registerPlugin } from '@capacitor/core';

export type HabitWidgetActionType = 'toggle_habit' | 'increment_habit' | 'set_value';

export interface HabitWidgetAction {
  id?: string;
  dayKey?: string;
  value?: number | boolean;
  type: HabitWidgetActionType;
  habitId: number;
  amount?: number;
  origin?: string;
  timestamp?: number | string;
}

export interface DailyProgressSnapshot {
  completed: number;
  total: number;
  remaining: number;
  percent: number;
  hint: string;
}

export interface TodayHabitSnapshot {
  habitId: number;
  title: string;
  done: boolean;
  icon?: string;
  category?: string;
}

export interface StreakSnapshot {
  current: number;
  longest: number;
  message: string;
}

export interface SingleHabitFocusSnapshot {
  habitId?: number;
  title: string;
  done: boolean;
  streak: number;
  progressText: string;
}

export interface FocusHabitSnapshot {
  habitId: number;
  title: string;
  icon?: string;
  done: boolean;
  streak: number;
  progressText: string;
}

export interface WeeklyConsistencySnapshot {
  percent: number;
  dayLabels: string[];
  dayRates: number[];
}

export interface QuickAddSnapshotEntry {
  habitId: number;
  title: string;
  icon?: string;
  current: number;
  target: number;
  unit?: string;
}

export interface HabitWidgetSnapshot {
  language?: 'hu' | 'en';
  source?: {
    habits: Array<import('../../data/models/habit.model').Habit & { createdDayKey: string }>;
    logs: Array<{ habitId: number; dayKey: string; value: number | boolean }>;
  };
  dayKey: string;
  updatedAtIso: string;
  todayHabits: TodayHabitSnapshot[];
  dailyProgress: DailyProgressSnapshot;
  streak: StreakSnapshot;
  singleHabitFocus: SingleHabitFocusSnapshot;
  focusHabits: FocusHabitSnapshot[];
  weeklyConsistency: WeeklyConsistencySnapshot;
  quickAdd: QuickAddSnapshotEntry[];
  lockedHabitIds?: number[];
  lockDependencies?: Record<string, number[]>;
}

export interface HabitWidgetsPlugin {
  setWidgetSnapshot(options: { snapshot: HabitWidgetSnapshot; acknowledgedActionIds?: string[] }): Promise<void>;
  consumePendingActions(): Promise<{ actions: HabitWidgetAction[] }>;
}

export const HabitWidgets = registerPlugin<HabitWidgetsPlugin>('HabitWidgets');
