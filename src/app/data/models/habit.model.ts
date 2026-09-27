export type HabitType = 'binary' | 'quantitative' | 'frequency';

export type StrategyType = 'NONE' | 'SMART' | 'WOOP' | 'TINY' | 'GOAL_COMPASS' | 'OKR';

export interface ReminderConfig {
  reminderTimes: string[];
  daysOfWeek: number[];
  persistent?: boolean;
}

export interface SmartStrategy {
  targetMetric: string;
  targetValue?: number;
  measurementUnit?: string;
  deadline?: string;
  motivation?: string;
}

export interface WoopStrategy {
  wish: string;
  outcome: string;
  obstacle: string;
  plan: string;
}

export interface TinyStrategy {
  anchor: string;
  tinyVersion: string;
  celebration?: string;
}

export interface GoalCompassStrategy {
  why: string;
  vision?: string;
  nextStep?: string;
}

export interface OkrStrategy {
  objective: string;
  keyResult: string;
  targetValue?: number;
  timeframe?: string;
}

export interface HabitStrategy {
  type: StrategyType;
  smart?: SmartStrategy;
  woop?: WoopStrategy;
  tiny?: TinyStrategy;
  goalCompass?: GoalCompassStrategy;
  okr?: OkrStrategy;
  notes?: string;
}

export interface HabitSchedule {
  frequencyCount?: number;
  frequencyPeriod?: 'day' | 'week' | 'month';
  allowedWeekdays?: number[];
  dailyTargetValue?: number;
  allowSkips?: boolean;
}

export type HabitChainRelation = 'before' | 'after';

export type HabitChainTrigger = 'on_open' | 'on_complete';

export interface HabitChainConditions {
  onlyIfDue?: boolean;
  withinMinutes?: number;
  skipIfCompletedWithinHours?: number;
}

export interface HabitChainLink {
  id: string;
  targetHabitId: number;
  relation: HabitChainRelation;
  trigger?: HabitChainTrigger;
  priority?: number;
  note?: string;
  conditions?: HabitChainConditions;
  isActive?: boolean;
}

export interface Habit {
  id?: number;
  title: string;
  description?: string;
  type: HabitType;
  schedule: HabitSchedule;
  units?: string;
  tags?: string[];
  icon?: string;
  strategy?: HabitStrategy;
  reminderConfig?: ReminderConfig;
  chainName?: string;
  chainLinks?: HabitChainLink[];
  createdDate: string;
  archived?: boolean;
}
