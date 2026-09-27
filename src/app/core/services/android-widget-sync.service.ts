import { Injectable, effect, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Habit } from '../../data/models/habit.model';
import { HabitLog } from '../../data/models/log.model';
import { toDayKey } from '../utils/date-utils';
import { isHabitDueToday } from '../utils/habit-utils';
import { isLogCompleted } from '../utils/log-helpers';
import {
  FocusHabitSnapshot,
  HabitWidgetAction,
  HabitWidgetSnapshot,
  HabitWidgets,
  QuickAddSnapshotEntry,
  TodayHabitSnapshot
} from '../plugins/habit-widgets.plugin';
import { HabitService } from './habit.service';
import { LogService } from './log.service';
import { HabitChainService } from './habit-chain.service';
import { LanguageService } from '../../shared/services/language.service';

interface TodayHabitViewModel {
  habit: Habit;
  done: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AndroidWidgetSyncService {
  private readonly habitService = inject(HabitService);
  private readonly logService = inject(LogService);
  private readonly chainService = inject(HabitChainService);
  private readonly languageService = inject(LanguageService);
  private readonly isAndroid = Capacitor.getPlatform() === 'android';
  private initialized = false;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private processingActions = false;
  private syncRequested = false;
  private readonly acknowledgedActionIds = new Set<string>();

  constructor() {
    if (!this.isAndroid) {
      return;
    }

    effect(() => {
      void this.habitService.habits();
      void this.logService.logs();
      void this.languageService.language();
      this.queueSnapshotSync();
    });
  }

  async initialize(): Promise<void> {
    if (!this.isAndroid || this.initialized) {
      return;
    }

    this.initialized = true;
    window.addEventListener('focus', this.handleWindowFocus);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    await this.consumeAndApplyPendingActions();
  }

  private readonly handleWindowFocus = (): void => {
    void this.consumeAndApplyPendingActions();
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      void this.consumeAndApplyPendingActions();
    }
  };

  private queueSnapshotSync(): void {
    if (!this.isAndroid || !this.initialized) {
      return;
    }

    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }

    this.syncTimer = setTimeout(() => {
      this.syncTimer = null;
      void this.consumeAndApplyPendingActions();
    }, 180);
  }

  private async pushSnapshot(): Promise<void> {
    if (!this.isAndroid || !this.initialized || this.habitService.error() || this.logService.error()) {
      return;
    }

    const snapshot = this.buildSnapshot();
    try {
      const acknowledgedActionIds = [...this.acknowledgedActionIds];
      await HabitWidgets.setWidgetSnapshot({ snapshot, acknowledgedActionIds });
      acknowledgedActionIds.forEach(id => this.acknowledgedActionIds.delete(id));
    } catch (error) {
      console.warn('Unable to sync Android widget snapshot.', error);
    }
  }

  private async consumeAndApplyPendingActions(): Promise<void> {
    if (!this.isAndroid || !this.initialized || this.habitService.error() || this.logService.error()) {
      return;
    }
    if (this.processingActions) {
      this.syncRequested = true;
      return;
    }

    this.processingActions = true;
    try {
      const result = await HabitWidgets.consumePendingActions();
      const actions = Array.isArray(result?.actions) ? result.actions : [];
      for (const action of actions) {
        if (action.id && this.acknowledgedActionIds.has(action.id)) continue;
        await this.applyAction(action);
        if (action.id) this.acknowledgedActionIds.add(action.id);
      }
      await this.pushSnapshot();
    } catch (error) {
      console.warn('Unable to consume Android widget actions.', error);
    } finally {
      this.processingActions = false;
      if (this.syncRequested) {
        this.syncRequested = false;
        this.queueSnapshotSync();
      }
    }
  }

  private async applyAction(action: HabitWidgetAction): Promise<void> {
    const habitId = Number(action?.habitId);
    if (!Number.isFinite(habitId) || habitId <= 0) {
      return;
    }

    const habit = this.habitService.getHabit(habitId);
    if (!habit?.id) {
      return;
    }

    const tappedAt = action.timestamp !== undefined ? new Date(action.timestamp) : null;
    const today = tappedAt && Number.isFinite(tappedAt.getTime()) &&
      (!action.dayKey || toDayKey(tappedAt) === action.dayKey)
      ? tappedAt
      : action.dayKey
      ? new Date(`${action.dayKey}T12:00:00`)
      : new Date();
    if (!Number.isFinite(today.getTime())) return;

    // Native taps carry the final value and original day, making retries idempotent.
    if (action.type === 'set_value') {
      if (typeof action.value !== 'boolean' && typeof action.value !== 'number') return;
      if (action.value === false || action.value === 0) {
        await this.logService.clearHabitLogForDate(habit.id, today);
      } else {
        await this.logService.setHabitLog({ habitId: habit.id, date: today, value: action.value });
      }
      return;
    }

    if (action.type === 'increment_habit') {
      const amount = Math.max(1, Number(action.amount ?? 1) || 1);
      const wasCompleted = this.isCompleted(habit, today);
      if (
        amount > 0 &&
        !wasCompleted &&
        this.chainService.isCompletionLocked(habit.id, { now: today })
      ) {
        return;
      }
      if (habit.type === 'binary') {
        await this.logService.setHabitLog({ habitId: habit.id, date: today, value: true });
      } else {
        await this.logService.incrementHabitLog(habit.id, amount, { date: today });
      }
      return;
    }

    if (action.type !== 'toggle_habit') {
      return;
    }

    const existing = this.logService.getLogForDate(habit.id, today);

    if (habit.type === 'binary') {
      if (existing?.value === true) {
        await this.logService.clearHabitLogForDate(habit.id, today);
      } else {
        if (this.chainService.isCompletionLocked(habit.id, { now: today })) {
          return;
        }
        await this.logService.setHabitLog({ habitId: habit.id, date: today, value: true });
      }
      return;
    }

    const target = Math.max(
      1,
      Number(
        habit.type === 'quantitative'
          ? habit.schedule.dailyTargetValue ?? 1
          : habit.schedule.frequencyCount ?? 1
      ) || 1
    );
    const current = typeof existing?.value === 'number' ? Number(existing.value) : 0;

    if (current >= target) {
      await this.logService.clearHabitLogForDate(habit.id, today);
      return;
    }

    if (this.chainService.isCompletionLocked(habit.id, { now: today })) {
      return;
    }

    await this.logService.setHabitLog({
      habitId: habit.id,
      date: today,
      value: target
    });
  }

  private buildSnapshot(): HabitWidgetSnapshot {
    const habits = this.habitService
      .habits()
      .filter((habit) => habit.id !== undefined && !habit.archived);
    const now = new Date();
    const dayKey = toDayKey(now);
    const todayHabits = this.buildTodayHabitViewModels(habits, now);
    const todaySnapshots: TodayHabitSnapshot[] = todayHabits.slice(0, 6).map((item) => ({
      habitId: item.habit.id as number,
      title: item.habit.title,
      done: item.done,
      icon: item.habit.icon,
      category: item.habit.tags?.[0]
    }));

    const total = todayHabits.length;
    const completed = todayHabits.filter((item) => item.done).length;
    const remaining = Math.max(0, total - completed);
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    const streakStats = this.buildStreakSnapshot(habits);
    const weekly = this.buildWeeklyConsistency(habits, now);
    const focusHabits = this.buildFocusHabits(habits, now);
    const focus = this.buildSingleHabitFocus(focusHabits);
    const quickAdd = this.buildQuickAddEntries(habits, now);
    const lockDependencies = this.buildLockDependencies(habits);
    const lockedHabitIds = habits
      .filter((habit): habit is Habit & { id: number } => typeof habit.id === 'number')
      .filter((habit) => this.chainService.isCompletionLocked(habit.id, { now }))
      .map((habit) => habit.id);

    return {
      language: this.languageService.language(),
      source: {
        habits: habits.map(habit => ({ ...habit, createdDayKey: toDayKey(habit.createdDate) })),
        logs: habits.flatMap(habit => this.logService.getLogsForHabit(habit.id as number)
          .map(({ habitId, dayKey, value }) => ({ habitId, dayKey, value })))
      },
      dayKey,
      updatedAtIso: now.toISOString(),
      todayHabits: todaySnapshots,
      dailyProgress: {
        completed,
        total,
        remaining,
        percent,
        hint:
          this.languageService.language() === 'hu'
            ? total === 0
              ? 'Mára nincs ütemezett szokás'
              : remaining === 0
                ? 'Mára minden kész'
                : `${remaining} van hátra mára`
            : total === 0
              ? 'No habits scheduled today'
              : remaining === 0
                ? 'Everything is done today'
                : `${remaining} left today`
      },
      streak: streakStats,
      singleHabitFocus: focus,
      focusHabits,
      weeklyConsistency: weekly,
      quickAdd,
      lockedHabitIds,
      lockDependencies: Object.keys(lockDependencies).length ? lockDependencies : undefined
    };
  }

  private buildLockDependencies(habits: Habit[]): Record<string, number[]> {
    const dependencies: Record<string, number[]> = {};

    for (const habit of habits) {
      if (!habit.id) {
        continue;
      }

      const blockerIds = new Set<number>();
      for (const item of this.chainService.getOutgoingLinks(habit.id, 'before')) {
        if (item.targetHabit.id) {
          blockerIds.add(item.targetHabit.id);
        }
      }
      for (const item of this.chainService.getIncomingLinks(habit.id, 'after')) {
        if (item.sourceHabit.id) {
          blockerIds.add(item.sourceHabit.id);
        }
      }

      if (!blockerIds.size) {
        continue;
      }

      dependencies[String(habit.id)] = Array.from(blockerIds).sort((a, b) => a - b);
    }

    return dependencies;
  }

  private buildTodayHabitViewModels(habits: Habit[], date: Date): TodayHabitViewModel[] {
    const todayKey = toDayKey(date);
    const items: TodayHabitViewModel[] = [];

    for (const habit of habits) {
      if (habit.id === undefined) {
        continue;
      }

      const completedThisPeriod =
        habit.type === 'frequency'
          ? this.logService.getCompletedCount(
              habit.id,
              habit.schedule.frequencyPeriod === 'month' ? 'month' : 'week',
              date
            )
          : this.logService.getCompletedCount(habit.id, 'day', date);

      const isDue = isHabitDueToday(habit, date, { completedThisPeriod });
      const todayLog = this.logService.getLogForDate(habit.id, date);
      const createdToday = this.wasCreatedOnDay(habit, todayKey);
      const hasAnyLogs = this.logService.getLogsForHabit(habit.id).length > 0;

      if (!isDue && !todayLog && !createdToday && hasAnyLogs) {
        continue;
      }

      items.push({
        habit,
        done: this.isCompleted(habit, date)
      });
    }

    items.sort((a, b) => {
      if (a.done !== b.done) {
        return a.done ? 1 : -1;
      }
      return a.habit.title.localeCompare(b.habit.title);
    });

    return items;
  }

  private buildStreakSnapshot(habits: Habit[]): {
    current: number;
    longest: number;
    message: string;
  } {
    let current = 0;
    let longest = 0;

    for (const habit of habits) {
      if (!habit.id) {
        continue;
      }
      current = Math.max(current, this.logService.getCurrentStreak(habit.id));
      longest = Math.max(longest, this.computeLongestStreak(this.logService.getLogsForHabit(habit.id)));
    }

    const hu = this.languageService.language() === 'hu';
    const message = current <= 0
      ? (hu ? 'Kezdd el ma a sorozatot.' : 'Start your streak today.')
      : current < 7
        ? (hu ? 'Tartsd életben a láncot.' : 'Keep the chain alive.')
        : (hu ? 'Ne szakítsd meg a láncot.' : "Don't break the chain.");

    return { current, longest, message };
  }

  private buildFocusHabits(habits: Habit[], date: Date): FocusHabitSnapshot[] {
    const focusHabits: FocusHabitSnapshot[] = [];

    for (const habit of habits) {
      if (!habit.id) {
        continue;
      }

      const done = this.isCompleted(habit, date);
      focusHabits.push({
        habitId: habit.id,
        title: habit.title,
        icon: habit.icon,
        done,
        streak: this.logService.getCurrentStreak(habit.id),
        progressText: this.getFocusProgressText(habit, date, done)
      });
    }

    focusHabits.sort((a, b) => {
      if (a.done !== b.done) {
        return a.done ? 1 : -1;
      }
      return a.title.localeCompare(b.title);
    });

    return focusHabits;
  }

  private buildSingleHabitFocus(focusHabits: FocusHabitSnapshot[]): {
    habitId?: number;
    title: string;
    done: boolean;
    streak: number;
    progressText: string;
  } {
    const focus = focusHabits.find((item) => !item.done) ?? focusHabits[0];
    if (!focus) {
      return {
        title: this.languageService.language() === 'hu' ? 'Nincs kiválasztott szokás' : 'No habit selected',
        done: false,
        streak: 0,
        progressText: this.languageService.language() === 'hu' ? 'A kezdéshez hozz létre egy szokást.' : 'Create a habit to start.'
      };
    }

    return {
      habitId: focus.habitId,
      title: focus.title,
      done: focus.done,
      streak: focus.streak,
      progressText: focus.progressText
    };
  }

  private buildWeeklyConsistency(
    habits: Habit[],
    today: Date
  ): {
    percent: number;
    dayLabels: string[];
    dayRates: number[];
  } {
    const dayLabels: string[] = [];
    const dayRates: number[] = [];
    const trackedHabits = habits.filter(
      (habit): habit is Habit & { id: number } =>
        typeof habit.id === 'number' && !habit.archived
    );
    let weeklyCompleted = 0;
    let weeklyScheduled = 0;

    for (let offset = 6; offset >= 0; offset -= 1) {
      const day = new Date(today);
      day.setHours(12, 0, 0, 0);
      day.setDate(today.getDate() - offset);
      const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
      const label = day.toLocaleDateString(this.languageService.language() === 'hu' ? 'hu-HU' : 'en-US', { weekday: 'short' }).slice(0, 1);
      dayLabels.push(label);

      const eligibleHabits = trackedHabits.filter((habit) =>
        this.wasCreatedOnOrBeforeDayEnd(habit, dayEnd)
      );
      const scheduledForDay = eligibleHabits.length;
      let completedForDay = 0;

      for (const habit of eligibleHabits) {
        const log = this.logService.getLogForDate(habit.id, day);
        if (log && isLogCompleted(log)) {
          completedForDay += 1;
        }
      }

      weeklyScheduled += scheduledForDay;
      weeklyCompleted += completedForDay;
      dayRates.push(scheduledForDay > 0 ? Math.round((completedForDay / scheduledForDay) * 100) : 0);
    }

    const percent = weeklyScheduled > 0 ? Math.round((weeklyCompleted / weeklyScheduled) * 100) : 0;
    return { percent, dayLabels, dayRates };
  }

  private buildQuickAddEntries(habits: Habit[], date: Date): QuickAddSnapshotEntry[] {
    const entries: QuickAddSnapshotEntry[] = [];

    for (const habit of habits) {
      if (!habit.id) {
        continue;
      }
      if (habit.type !== 'quantitative' && habit.type !== 'frequency') {
        continue;
      }

      const log = this.logService.getLogForDate(habit.id, date);
      const current =
        typeof log?.value === 'number'
          ? Math.max(0, Number(log.value) || 0)
          : log?.value === true
            ? 1
            : 0;
      const target = Math.max(
        1,
        Number(
          habit.type === 'quantitative'
            ? habit.schedule.dailyTargetValue ?? 1
            : habit.schedule.frequencyCount ?? 1
        ) || 1
      );

      entries.push({
        habitId: habit.id,
        title: habit.title,
        icon: habit.icon,
        current,
        target,
        unit: habit.units
      });
    }

    entries.sort((a, b) => {
      const aDone = a.current >= a.target;
      const bDone = b.current >= b.target;
      if (aDone !== bDone) {
        return aDone ? 1 : -1;
      }
      return a.title.localeCompare(b.title);
    });

    return entries.slice(0, 2);
  }

  private getFocusProgressText(habit: Habit, date: Date, done: boolean): string {
    if (!habit.id) {
      return done
        ? (this.languageService.language() === 'hu' ? 'Mára kész' : 'Done for today')
        : (this.languageService.language() === 'hu' ? 'Még nincs kész' : 'Not done yet');
    }

    const log = this.logService.getLogForDate(habit.id, date);
    if (habit.type === 'quantitative') {
      const target = Math.max(1, Number(habit.schedule.dailyTargetValue ?? 1));
      const value = typeof log?.value === 'number' ? Number(log.value) : 0;
      return `${value}/${target} ${(habit.units ?? '').trim()}`.trim();
    }

    if (habit.type === 'frequency') {
      const value = typeof log?.value === 'number' ? Number(log.value) : 0;
      const target = Math.max(1, Number(habit.schedule.frequencyCount ?? 1));
      return `${value}/${target} ${this.languageService.language() === 'hu' ? 'alkalom' : 'check-ins'}`;
    }

    return done
      ? (this.languageService.language() === 'hu' ? 'Mára kész' : 'Done for today')
      : (this.languageService.language() === 'hu' ? 'Még nincs kész' : 'Not done yet');
  }

  private isCompleted(habit: Habit, referenceDate: Date): boolean {
    if (!habit.id) {
      return false;
    }

    const period = habit.schedule?.frequencyPeriod ?? 'day';
    if (period !== 'day') {
      if (habit.type === 'binary') {
        return this.logService.getPeriodCompletionCount(
          habit.id,
          period === 'month' ? 'month' : 'week',
          referenceDate
        ) >= 1;
      }
      if (habit.type === 'quantitative') {
        const target = Math.max(1, Number(habit.schedule.dailyTargetValue ?? 1));
        return this.logService.getPeriodQuantitySum(habit.id, period, referenceDate) >= target;
      }
    }

    const log = this.logService.getLogForDate(habit.id, referenceDate);
    if (!log) {
      return false;
    }
    if (habit.type === 'binary') {
      return log.value === true;
    }
    if (habit.type === 'quantitative') {
      const target = Math.max(1, Number(habit.schedule.dailyTargetValue ?? 1));
      return typeof log.value === 'number' && Number(log.value) >= target;
    }
    return isLogCompleted(log);
  }

  private wasCreatedOnDay(habit: Habit, dayKey: string): boolean {
    if (!habit.createdDate) {
      return false;
    }
    try {
      return toDayKey(habit.createdDate) === dayKey;
    } catch {
      return false;
    }
  }

  private wasCreatedOnOrBeforeDayEnd(habit: Habit, dayEnd: Date): boolean {
    if (!habit.createdDate) {
      return true;
    }
    const createdAt = new Date(habit.createdDate);
    if (Number.isNaN(createdAt.getTime())) {
      return true;
    }
    return createdAt <= dayEnd;
  }

  private computeLongestStreak(logs: HabitLog[]): number {
    if (!logs.length) {
      return 0;
    }
    const days = new Set<string>();
    for (const log of logs) {
      if (isLogCompleted(log)) {
        days.add(log.dayKey);
      }
    }

    const ordered = Array.from(days).sort((a, b) => (a < b ? 1 : -1));
    if (!ordered.length) {
      return 0;
    }

    let longest = 0;
    let current = 0;
    let previous: Date | undefined;

    for (const key of ordered) {
      const day = new Date(`${key}T00:00:00`);
      if (!previous) {
        current = 1;
      } else {
        const delta = Math.round((previous.getTime() - day.getTime()) / (24 * 60 * 60 * 1000));
        current = delta === 1 ? current + 1 : 1;
      }
      longest = Math.max(longest, current);
      previous = day;
    }

    return longest;
  }
}
