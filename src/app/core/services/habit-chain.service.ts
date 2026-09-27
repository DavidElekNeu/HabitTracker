import { Injectable, inject } from '@angular/core';
import {
  Habit,
  HabitChainLink,
  HabitChainRelation,
  HabitChainTrigger
} from '../../data/models/habit.model';
import { getHabitPeriodTarget, isHabitDueToday } from '../utils/habit-utils';
import { isLogCompleted } from '../utils/log-helpers';
import { HabitService } from './habit.service';
import { LogService } from './log.service';

export interface HabitChainLinkView {
  sourceHabit: Habit;
  link: HabitChainLink;
  targetHabit: Habit;
}

export interface HabitChainSuggestion extends HabitChainLinkView {
  trigger: HabitChainTrigger;
  reason: string;
  expiresAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class HabitChainService {
  private readonly habitService = inject(HabitService);
  private readonly logService = inject(LogService);

  getCompletionBlockers(
    habitId: number,
    options?: {
      now?: Date;
    }
  ): Habit[] {
    const habit = this.habitService.getHabit(habitId);
    if (!habit?.id || habit.archived) {
      return [];
    }

    const now = options?.now ?? new Date();
    const blockers = new Map<number, Habit>();

    const outgoingBefore = this.getOutgoingLinks(habit.id, 'before');
    for (const item of outgoingBefore) {
      this.addBlockerIfIncomplete(blockers, item.targetHabit, habit.id, now);
    }

    const incomingAfter = this.getIncomingLinks(habit.id, 'after');
    for (const item of incomingAfter) {
      this.addBlockerIfIncomplete(blockers, item.sourceHabit, habit.id, now);
    }

    return Array.from(blockers.values()).sort((a, b) => a.title.localeCompare(b.title));
  }

  isCompletionLocked(
    habitId: number,
    options?: {
      now?: Date;
    }
  ): boolean {
    return this.getCompletionBlockers(habitId, options).length > 0;
  }

  getOutgoingLinks(sourceHabitId: number, relation?: HabitChainRelation): HabitChainLinkView[] {
    return this.habitService.getOutgoingChainLinks(sourceHabitId, relation);
  }

  getIncomingLinks(targetHabitId: number, relation?: HabitChainRelation): HabitChainLinkView[] {
    return this.habitService.getIncomingChainLinks(targetHabitId, relation);
  }

  getLinkCount(habitId: number): number {
    return this.habitService.getChainLinkCount(habitId);
  }

  getSuggestionsFromHabit(
    sourceHabitId: number,
    trigger: HabitChainTrigger,
    options?: {
      now?: Date;
      limit?: number;
      excludeHabitIds?: number[];
    }
  ): HabitChainSuggestion[] {
    const now = options?.now ?? new Date();
    const sourceHabit = this.habitService.getHabit(sourceHabitId);
    if (!sourceHabit?.id) {
      return [];
    }

    const excludeSet = new Set(options?.excludeHabitIds ?? []);
    const candidates: Array<{ suggestion: HabitChainSuggestion; dueNow: boolean; priority: number }> = [];
    const outgoing = this.getOutgoingLinks(sourceHabit.id);

    for (const item of outgoing) {
      const resolvedTrigger = this.resolveTrigger(item.link);
      if (resolvedTrigger !== trigger) {
        continue;
      }
      if (excludeSet.has(item.targetHabit.id!)) {
        continue;
      }
      if (item.targetHabit.archived) {
        continue;
      }
      if (item.targetHabit.id === sourceHabit.id) {
        continue;
      }

      const dueNow = this.isHabitDueNow(item.targetHabit, now);
      if (item.link.conditions?.onlyIfDue && !dueNow) {
        continue;
      }

      const cooldownHours = item.link.conditions?.skipIfCompletedWithinHours;
      if (
        typeof cooldownHours === 'number' &&
        cooldownHours > 0 &&
        this.wasCompletedRecently(item.targetHabit.id!, cooldownHours, now)
      ) {
        continue;
      }

      const suggestion: HabitChainSuggestion = {
        ...item,
        trigger: resolvedTrigger,
        reason: this.describeSuggestion(item, dueNow),
        expiresAt: this.resolveExpiry(item.link, now)
      };

      candidates.push({
        suggestion,
        dueNow,
        priority: item.link.priority ?? 0
      });
    }

    candidates.sort((a, b) => {
      if (a.dueNow !== b.dueNow) {
        return a.dueNow ? -1 : 1;
      }
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.suggestion.targetHabit.title.localeCompare(b.suggestion.targetHabit.title);
    });

    const limit = options?.limit ?? 3;
    return candidates.slice(0, Math.max(1, limit)).map((item) => item.suggestion);
  }

  private resolveTrigger(link: HabitChainLink): HabitChainTrigger {
    if (link.trigger) {
      return link.trigger;
    }
    return link.relation === 'before' ? 'on_open' : 'on_complete';
  }

  private addBlockerIfIncomplete(
    blockers: Map<number, Habit>,
    dependency: Habit,
    habitId: number,
    now: Date
  ): void {
    if (!dependency?.id || dependency.archived || dependency.id === habitId) {
      return;
    }
    if (this.isHabitCompletedForLock(dependency, now)) {
      return;
    }
    blockers.set(dependency.id, dependency);
  }

  private isHabitCompletedForLock(habit: Habit, referenceDate: Date): boolean {
    if (!habit.id || habit.archived) {
      return false;
    }

    const period = habit.schedule?.frequencyPeriod ?? 'day';
    if (period !== 'day') {
      if (habit.type === 'binary') {
        const completed = this.logService.getPeriodCompletionCount(
          habit.id,
          period === 'month' ? 'month' : 'week',
          referenceDate
        );
        return completed >= 1;
      }

      if (habit.type === 'quantitative') {
        const target = getHabitPeriodTarget(habit, referenceDate);
        if (target <= 0) {
          return false;
        }
        const sum = this.logService.getPeriodQuantitySum(habit.id, period, referenceDate);
        return sum >= target;
      }

      if (habit.type === 'frequency') {
        const target = Math.max(1, Number(habit.schedule.frequencyCount ?? 1));
        const completed = this.logService.getCompletedCount(
          habit.id,
          period === 'month' ? 'month' : 'week',
          referenceDate
        );
        return completed >= target;
      }

      return false;
    }

    const log = this.logService.getLogForDate(habit.id, referenceDate);
    if (habit.type === 'binary') {
      return log?.value === true;
    }
    if (habit.type === 'quantitative') {
      const target = Math.max(0, Number(habit.schedule.dailyTargetValue ?? 0));
      if (target <= 0) {
        return false;
      }
      const value = typeof log?.value === 'number' ? Number(log.value) : 0;
      return value >= target;
    }
    if (habit.type === 'frequency') {
      const target = Math.max(1, Number(habit.schedule.frequencyCount ?? 1));
      const value =
        typeof log?.value === 'number' ? Number(log.value) : log?.value === true ? 1 : 0;
      return value >= target;
    }
    return false;
  }

  private isHabitDueNow(habit: Habit, now: Date): boolean {
    if (!habit.id || habit.archived) {
      return false;
    }

    const period = habit.schedule.frequencyPeriod ?? 'day';
    const completedThisPeriod =
      period === 'day'
        ? this.logService.getCompletedCount(habit.id, 'day', now)
        : this.logService.getCompletedCount(habit.id, period === 'month' ? 'month' : 'week', now);

    return isHabitDueToday(habit, now, { completedThisPeriod });
  }

  private wasCompletedRecently(habitId: number, withinHours: number, now: Date): boolean {
    const logs = this.logService.getLogsForHabit(habitId);
    if (!logs.length) {
      return false;
    }

    const thresholdMs = withinHours * 60 * 60 * 1000;
    const nowMs = now.getTime();
    for (let index = logs.length - 1; index >= 0; index -= 1) {
      const log = logs[index];
      if (!isLogCompleted(log)) {
        continue;
      }
      const loggedAt = new Date(log.date).getTime();
      if (!Number.isFinite(loggedAt)) {
        continue;
      }
      if (nowMs - loggedAt <= thresholdMs) {
        return true;
      }
      // Logs are day-sorted ascending; once older than threshold, remaining are older.
      if (nowMs - loggedAt > thresholdMs) {
        return false;
      }
    }
    return false;
  }

  private resolveExpiry(link: HabitChainLink, now: Date): string | undefined {
    const withinMinutes = link.conditions?.withinMinutes;
    if (typeof withinMinutes !== 'number' || withinMinutes <= 0) {
      return undefined;
    }
    return new Date(now.getTime() + withinMinutes * 60 * 1000).toISOString();
  }

  private describeSuggestion(item: HabitChainLinkView, dueNow: boolean): string {
    const relationText =
      item.link.relation === 'before'
        ? `Before "${item.sourceHabit.title}"`
        : `After "${item.sourceHabit.title}"`;
    return dueNow ? `${relationText} · due now` : relationText;
  }
}
