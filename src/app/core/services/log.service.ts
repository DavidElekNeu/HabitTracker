import { Injectable, computed, signal } from '@angular/core';
import { HabitLog } from '../../data/models/log.model';
import { DBService } from './db.service';
import { DBError } from './db-error';
import {
  createHabitDayKey,
  daysBetween,
  endOfMonth,
  endOfWeek,
  isWithinRange,
  startOfMonth,
  startOfWeek,
  toDayKey
} from '../utils/date-utils';

type StoredHabitLog = Omit<HabitLog, 'dayKey' | 'habitDayKey'> & {
  dayKey?: string;
  habitDayKey?: string;
};

@Injectable({
  providedIn: 'root'
})
export class LogService {
  private readonly logsSignal = signal<HabitLog[]>([]);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly logs = computed(() => this.logsSignal());
  readonly isLoading = computed(() => this.loadingSignal());
  readonly error = computed(() => this.errorSignal());

  constructor(private readonly db: DBService) {
    // Consumers call load methods explicitly.
  }

  async loadAllLogs(): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    try {
      const logs = await this.db.getLogs();
      this.logsSignal.set(logs.map((log) => this.normalizeLog(log)));
    } catch (error) {
      const message = error instanceof DBError ? error.message : 'Unknown error fetching logs';
      this.errorSignal.set(message);
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async loadLogsForHabit(habitId: number): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    try {
      const logs = await this.db.getLogsByHabit(habitId);
      this.replaceHabitLogs(habitId, logs);
    } catch (error) {
      if (error instanceof DBError) {
        try {
          const allLogs = await this.db.getLogs();
          const filtered = allLogs.filter((log) => log.habitId === habitId);
          this.replaceHabitLogs(habitId, filtered);
          console.warn('Falling back to full log scan for habit logs due to missing index.', error);
          return;
        } catch (fallbackError) {
          const message =
            fallbackError instanceof DBError ? fallbackError.message : 'Unknown error fetching habit logs';
          this.errorSignal.set(message);
          throw fallbackError;
        }
      }
      const message = error instanceof DBError ? error.message : 'Unknown error fetching habit logs';
      this.errorSignal.set(message);
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  getLogsForHabit(habitId: number): HabitLog[] {
    return this.logsSignal().filter((log) => log.habitId === habitId);
  }

  getLogForDate(habitId: number, date: Date | string): HabitLog | undefined {
    const dayKey = toDayKey(date);
    return this.logsSignal().find(
      (log) => log.habitId === habitId && log.dayKey === dayKey
    );
  }

  async setHabitLog(params: {
    habitId: number;
    date?: Date | string;
    value: number | boolean;
    notes?: string;
  }): Promise<HabitLog> {
    const date = params.date ?? new Date();
    const dayKey = toDayKey(date);
    const habitDayKey = createHabitDayKey(params.habitId, dayKey);

    this.errorSignal.set(null);
    let existing = this.getLogForDate(params.habitId, dayKey);

    if (!existing) {
      try {
        existing = await this.db.getLogByHabitDay(habitDayKey);
        if (existing) {
          existing = this.normalizeLog(existing);
          this.mergeLog(existing);
        }
      } catch (error) {
        const message =
          error instanceof DBError ? error.message : 'Unknown error fetching habit log';
        this.errorSignal.set(message);
        throw error;
      }
    }

    const nextLog: HabitLog = {
      id: existing?.id,
      habitId: params.habitId,
      date: new Date(date).toISOString(),
      dayKey,
      habitDayKey,
      value: params.value,
      notes: params.notes ?? existing?.notes,
      synced: existing?.synced ?? false
    };

    if (nextLog.id === undefined) {
      delete (nextLog as { id?: number }).id;
    }

    try {
      let persisted: HabitLog;
      if (existing?.id) {
        persisted = this.normalizeLog(await this.db.updateLog({ ...existing, ...nextLog }));
        this.logsSignal.update((current) =>
          current.map((log) => (log.id === persisted.id ? { ...log, ...persisted } : log))
        );
        return persisted;
      }

      const id = await this.db.addLog(nextLog);
      persisted = this.normalizeLog({ ...nextLog, id });
      this.logsSignal.update((current) => [...current, persisted]);
      return persisted;
    } catch (error) {
      const message = error instanceof DBError ? error.message : 'Unknown error setting habit log';
      this.errorSignal.set(message);
      throw error;
    }
  }

  async incrementHabitLog(habitId: number, amount = 1, options?: { date?: Date | string }): Promise<HabitLog> {
    const date = options?.date ?? new Date();
    const existing = this.getLogForDate(habitId, date);
    const currentValue =
      typeof existing?.value === 'number' ? (existing.value as number) : 0;
    return this.setHabitLog({
      habitId,
      date,
      value: currentValue + amount,
      notes: existing?.notes
    });
  }

  async clearHabitLogForDate(habitId: number, date: Date | string): Promise<void> {
    const dayKey = toDayKey(date);
    const existing = this.getLogForDate(habitId, dayKey);
    if (!existing?.id) {
      return;
    }
    await this.deleteLog(existing.id);
  }

  async deleteLog(id: number): Promise<void> {
    this.errorSignal.set(null);
    try {
      await this.db.deleteLog(id);
      this.logsSignal.update((current) => current.filter((log) => log.id !== id));
    } catch (error) {
      const message = error instanceof DBError ? error.message : 'Unknown error removing log';
      this.errorSignal.set(message);
      throw error;
    }
  }

  async deleteLogsForHabit(habitId: number): Promise<void> {
    this.errorSignal.set(null);
    try {
      let logs = this.logsSignal().filter((log) => log.habitId === habitId);
      if (!logs.length) {
        try {
          logs = await this.db.getLogsByHabit(habitId);
        } catch (error) {
          if (error instanceof DBError) {
            const allLogs = await this.db.getLogs();
            logs = allLogs.filter((log) => log.habitId === habitId);
          } else {
            throw error;
          }
        }
      }

      for (const log of logs) {
        if (log.id !== undefined) {
          await this.db.deleteLog(log.id);
        }
      }

      if (logs.length) {
        this.logsSignal.update((current) => current.filter((log) => log.habitId !== habitId));
      }
    } catch (error) {
      const message =
        error instanceof DBError ? error.message : 'Unknown error removing habit logs';
      this.errorSignal.set(message);
      throw error;
    }
  }

  getCurrentStreak(habitId: number): number {
    const logs = this.getLogsForHabit(habitId)
      .filter((log) => (typeof log.value === 'boolean' ? log.value : Number(log.value) > 0))
      .sort((a, b) => (a.dayKey < b.dayKey ? 1 : -1));

    let streak = 0;
    let previousDayKey: string | null = null;

    for (const log of logs) {
      if (!previousDayKey) {
        streak = 1;
        previousDayKey = log.dayKey;
        continue;
      }

      const diff = daysBetween(previousDayKey, log.dayKey);
      if (diff === 1) {
        streak += 1;
        previousDayKey = log.dayKey;
        continue;
      }

      if (diff === 0) {
        continue;
      }

      break;
    }

    return streak;
  }

  getCompletedCount(
    habitId: number,
    period: 'day' | 'week' | 'month',
    referenceDate: Date = new Date()
  ): number {
    const logs = this.getLogsForHabit(habitId);
    if (!logs.length) {
      return 0;
    }

    if (period === 'day') {
      const key = toDayKey(referenceDate);
      return logs
        .filter((log) => log.dayKey === key)
        .reduce((total, log) => total + this.logContribution(log), 0);
    }

    if (period === 'week') {
      const start = startOfWeek(referenceDate);
      const end = endOfWeek(referenceDate);
      return logs
        .filter((log) => isWithinRange(log.date, start, end))
        .reduce((total, log) => total + this.logContribution(log), 0);
    }

    const start = startOfMonth(referenceDate);
    const end = endOfMonth(referenceDate);
    return logs
      .filter((log) => isWithinRange(log.date, start, end))
      .reduce((total, log) => total + this.logContribution(log), 0);
  }

  clearError(): void {
    this.errorSignal.set(null);
  }

  private replaceHabitLogs(habitId: number, logs: StoredHabitLog[]): void {
    const normalized = logs.map((log) => this.normalizeLog(log));
    const remainingLogs = this.logsSignal().filter((log) => log.habitId !== habitId);
    this.logsSignal.set([...remainingLogs, ...normalized]);
  }

  private mergeLog(log: StoredHabitLog): void {
    if (!log.id) {
      return;
    }
    const normalized = this.normalizeLog(log);
    const exists = this.logsSignal().some((existing) => existing.id === normalized.id);
    if (!exists) {
      this.logsSignal.update((current) => [...current, normalized]);
    }
  }

  private normalizeLog(log: StoredHabitLog): HabitLog {
    const dayKey = log.dayKey ?? toDayKey(log.date);
    const habitDayKey = log.habitDayKey ?? createHabitDayKey(log.habitId, dayKey);
    return {
      ...log,
      dayKey,
      habitDayKey
    };
  }

  private logContribution(log: HabitLog): number {
    if (typeof log.value === 'boolean') {
      return log.value ? 1 : 0;
    }
    return Math.max(0, Number(log.value) || 0);
  }
}
