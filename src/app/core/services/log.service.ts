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
  startOfDay,
  startOfMonth,
  startOfWeek,
  toDate,
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
  private readonly logLocks = new Map<string, Promise<void>>();
  private changeVersion = 0;
  private readonly mutationVersions = new Map<string, { version: number; type: 'updated' | 'deleted' }>();

  readonly logs = computed(() => this.logsSignal());
  readonly isLoading = computed(() => this.loadingSignal());
  readonly error = computed(() => this.errorSignal());

  constructor(private readonly db: DBService) {
    // Consumers call load methods explicitly.
  }

  async loadAllLogs(): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    const loadVersion = this.changeVersion;
    try {
      const logs = await this.db.getLogs();
      const normalized = logs.map((log) => this.normalizeLog(log));
      this.applyLoadedLogs(normalized, loadVersion, 'all');
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
    const loadVersion = this.changeVersion;
    try {
      const logs = await this.db.getLogsByHabit(habitId);
      const normalized = logs.map((log) => this.normalizeLog(log));
      this.applyLoadedLogs(normalized, loadVersion, { habitId });
    } catch (error) {
      if (error instanceof DBError) {
        try {
          const allLogs = await this.db.getLogs();
          const filtered = allLogs.filter((log) => log.habitId === habitId);
          const normalized = filtered.map((log) => this.normalizeLog(log));
          this.applyLoadedLogs(normalized, loadVersion, { habitId });
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
    const latestByDay = this.buildLatestLogMap(
      this.logsSignal().filter((log) => log.habitId === habitId)
    );
    return Array.from(latestByDay.values()).sort((a, b) => {
      if (a.dayKey === b.dayKey) {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        const delta = timeA - timeB;
        if (Number.isFinite(delta) && delta !== 0) {
          return delta;
        }
        return (a.id ?? Number.MIN_SAFE_INTEGER) - (b.id ?? Number.MIN_SAFE_INTEGER);
      }
      return a.dayKey < b.dayKey ? -1 : 1;
    });
  }

  getLogForDate(habitId: number, date: Date | string): HabitLog | undefined {
    const dayKey = toDayKey(date);
    const logs = this.logsSignal();
    let latest: HabitLog | undefined;
    for (let index = logs.length - 1; index >= 0; index -= 1) {
      const log = logs[index];
      if (log.habitId === habitId && log.dayKey === dayKey) {
        latest = this.selectLatestLog(latest, log);
      }
    }
    return latest;
  }

  async setHabitLog(params: {
    habitId: number;
    date?: Date | string;
    value: number | boolean;
    notes?: string;
  }): Promise<HabitLog> {
    const date = params.date ?? new Date();
    return this.runExclusive(params.habitId, date, async () => {
      const existing = this.getLogForDate(params.habitId, date);
      return this.persistHabitLog(
        {
          habitId: params.habitId,
          date,
          value: params.value,
          notes: params.notes
        },
        existing
      );
    });
  }

  async incrementHabitLog(habitId: number, amount = 1, options?: { date?: Date | string }): Promise<HabitLog> {
    const date = options?.date ?? new Date();
    return this.runExclusive(habitId, date, async () => {
      const existing = this.getLogForDate(habitId, date);
      const currentValue = typeof existing?.value === 'number' ? existing.value : 0;
      return this.persistHabitLog(
        {
          habitId,
          date,
          value: currentValue + amount,
          notes: existing?.notes
        },
        existing
      );
    });
  }

  async clearHabitLogForDate(habitId: number, date: Date | string): Promise<void> {
    await this.runExclusive(habitId, date, async () => {
      const existing = this.getLogForDate(habitId, date);
      if (!existing?.id) {
        return;
      }
      await this.deleteLog(existing.id, existing.habitDayKey);
    });
  }

  async deleteLog(id: number, habitDayKey?: string): Promise<void> {
    this.errorSignal.set(null);
    const cached = habitDayKey ? undefined : this.logsSignal().find((log) => log.id === id);
    const resolvedKey =
      habitDayKey ??
      cached?.habitDayKey ??
      (cached ? createHabitDayKey(cached.habitId, cached.dayKey) : undefined);
    try {
      await this.db.deleteLog(id);
      this.logsSignal.update((current) => current.filter((log) => log.id !== id));
      if (resolvedKey) {
        this.recordMutation(resolvedKey, 'deleted');
      }
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
          const fetched = await this.db.getLogsByHabit(habitId);
          logs = fetched.map((log) => this.normalizeLog(log));
        } catch (error) {
          if (error instanceof DBError) {
            const allLogs = await this.db.getLogs();
            logs = allLogs
              .filter((log) => log.habitId === habitId)
              .map((log) => this.normalizeLog(log));
          } else {
            throw error;
          }
        }
      }

      for (const log of logs) {
        if (log.id !== undefined) {
          await this.db.deleteLog(log.id);
          if (log.habitDayKey) {
            this.recordMutation(log.habitDayKey, 'deleted');
          }
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

  private applyLoadedLogs(
    normalized: HabitLog[],
    loadVersion: number,
    scope: 'all' | { habitId: number }
  ): void {
    const existing = this.logsSignal();
    const existingMap = this.buildLatestLogMap(existing);
    const resultMap = new Map<string, HabitLog>();

    if (scope === 'all') {
      for (const log of normalized) {
        const key = log.habitDayKey ?? createHabitDayKey(log.habitId, log.dayKey);
        const normalizedLog = log.habitDayKey === key ? log : { ...log, habitDayKey: key };
        const current = resultMap.get(key);
        resultMap.set(key, this.selectLatestLog(current, normalizedLog));
      }
    } else {
      for (const log of existing) {
        if (log.habitId !== scope.habitId) {
          const key = log.habitDayKey ?? createHabitDayKey(log.habitId, log.dayKey);
          const normalizedLog = log.habitDayKey === key ? log : { ...log, habitDayKey: key };
          const current = resultMap.get(key);
          resultMap.set(key, this.selectLatestLog(current, normalizedLog));
        }
      }
      for (const log of normalized) {
        const key = log.habitDayKey ?? createHabitDayKey(log.habitId, log.dayKey);
        const normalizedLog = log.habitDayKey === key ? log : { ...log, habitDayKey: key };
        const current = resultMap.get(key);
        resultMap.set(key, this.selectLatestLog(current, normalizedLog));
      }
    }

    for (const [key, mutation] of this.mutationVersions) {
      if (mutation.version > loadVersion) {
        if (mutation.type === 'deleted') {
          resultMap.delete(key);
          continue;
        }
        const local = existingMap.get(key);
        if (local) {
          resultMap.set(key, local);
        }
      }
    }

    const ordered = Array.from(resultMap.values()).sort((a, b) => {
      if (a.dayKey === b.dayKey) {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        const delta = timeA - timeB;
        if (Number.isFinite(delta) && delta !== 0) {
          return delta;
        }
        return (a.id ?? Number.MIN_SAFE_INTEGER) - (b.id ?? Number.MIN_SAFE_INTEGER);
      }
      return a.dayKey < b.dayKey ? -1 : 1;
    });

    this.logsSignal.set(ordered);
    this.pruneMutations(loadVersion);
  }

  private recordMutation(habitDayKey: string | undefined, type: 'updated' | 'deleted'): void {
    if (!habitDayKey) {
      return;
    }
    const version = ++this.changeVersion;
    this.mutationVersions.set(habitDayKey, { version, type });
  }

  private pruneMutations(maxVersion: number): void {
    for (const [key, mutation] of this.mutationVersions) {
      if (mutation.version <= maxVersion) {
        this.mutationVersions.delete(key);
      }
    }
  }

  private buildLatestLogMap(logs: Iterable<HabitLog>): Map<string, HabitLog> {
    const map = new Map<string, HabitLog>();
    for (const log of logs) {
      const key = log.habitDayKey ?? createHabitDayKey(log.habitId, log.dayKey);
      const normalized = log.habitDayKey === key ? log : { ...log, habitDayKey: key };
      const existing = map.get(key);
      map.set(key, this.selectLatestLog(existing, normalized));
    }
    return map;
  }

  private selectLatestLog(current: HabitLog | undefined, candidate: HabitLog): HabitLog {
    if (!current) {
      return candidate;
    }

    const candidateTime = new Date(candidate.date).getTime();
    const currentTime = new Date(current.date).getTime();
    const candidateValid = Number.isFinite(candidateTime);
    const currentValid = Number.isFinite(currentTime);

    if (candidateValid && currentValid) {
      if (candidateTime > currentTime) {
        return candidate;
      }
      if (candidateTime < currentTime) {
        return current;
      }
    } else if (candidateValid) {
      return candidate;
    } else if (currentValid) {
      return current;
    }

    const candidateId = candidate.id ?? Number.MIN_SAFE_INTEGER;
    const currentId = current.id ?? Number.MIN_SAFE_INTEGER;
    if (candidateId > currentId) {
      return candidate;
    }
    if (candidateId < currentId) {
      return current;
    }
    return candidate;
  }

  private upsertLogIntoSignal(log: HabitLog): void {
    const key = log.habitDayKey ?? createHabitDayKey(log.habitId, log.dayKey);
    const normalized = log.habitDayKey === key ? log : { ...log, habitDayKey: key };
    this.logsSignal.update((current) => {
      let replaced = false;
      const next = current.map((existing) => {
        if (existing.id === normalized.id || existing.habitDayKey === key) {
          replaced = true;
          return normalized;
        }
        return existing;
      });
      if (!replaced) {
        next.push(normalized);
      }
      return next;
    });
  }

  private async runExclusive<T>(
    habitId: number,
    date: Date | string,
    operation: () => Promise<T>
  ): Promise<T> {
    const dayKey = toDayKey(date);
    const lockKey = createHabitDayKey(habitId, dayKey);
    const previous = this.logLocks.get(lockKey) ?? Promise.resolve();

    let release: (() => void) | undefined;
    let rejectRelease: ((reason?: unknown) => void) | undefined;
    const gate = new Promise<void>((resolve, reject) => {
      release = resolve;
      rejectRelease = reject;
    });

    this.logLocks.set(lockKey, gate);

    try {
      await previous.catch(() => undefined);
      const result = await operation();
      release?.();
      return result;
    } catch (error) {
      rejectRelease?.(error);
      throw error;
    } finally {
      if (this.logLocks.get(lockKey) === gate) {
        this.logLocks.delete(lockKey);
      }
    }
  }

  private async persistHabitLog(
    params: { habitId: number; date: Date | string; value: number | boolean; notes?: string },
    existing?: HabitLog
  ): Promise<HabitLog> {
    const normalizedDate = toDate(params.date);
    const dayKey = toDayKey(normalizedDate);
    const habitDayKey = createHabitDayKey(params.habitId, dayKey);

    this.errorSignal.set(null);
    let current = existing ?? this.getLogForDate(params.habitId, dayKey);

    if (!current) {
      try {
        current = await this.db.getLogByHabitDay(habitDayKey);
        if (current) {
          current = this.normalizeLog(current);
          this.mergeLog(current);
        }
      } catch (error) {
        const message =
          error instanceof DBError ? error.message : 'Unknown error fetching habit log';
        this.errorSignal.set(message);
        throw error;
      }
    }

    const nextLog: HabitLog = {
      id: current?.id,
      habitId: params.habitId,
      date: normalizedDate.toISOString(),
      dayKey,
      habitDayKey,
      value: params.value,
      notes: params.notes ?? current?.notes,
      synced: current?.synced ?? false
    };

    if (nextLog.id === undefined) {
      delete (nextLog as { id?: number }).id;
    }

    try {
      let persisted: HabitLog;
      if (current?.id) {
        persisted = this.normalizeLog(await this.db.updateLog({ ...current, ...nextLog }));
      } else {
        const id = await this.db.addLog(nextLog);
        persisted = this.normalizeLog({ ...nextLog, id });
      }
      this.upsertLogIntoSignal(persisted);
      this.recordMutation(habitDayKey, 'updated');
      return persisted;
    } catch (error) {
      if (error instanceof DBError && !current?.id) {
        try {
          const conflict = await this.db.getLogByHabitDay(habitDayKey);
          if (conflict?.id !== undefined) {
            const mergedUpdate = await this.db.updateLog({
              ...conflict,
              ...nextLog,
              id: conflict.id
            });
            const merged = this.normalizeLog(mergedUpdate);
            this.upsertLogIntoSignal(merged);
            this.recordMutation(habitDayKey, 'updated');
            return merged;
          }
        } catch (conflictError) {
          console.warn('Encountered log write conflict that could not be resolved automatically.', conflictError);
        }
      }
      const message = error instanceof DBError ? error.message : 'Unknown error setting habit log';
      this.errorSignal.set(message);
      throw error;
    }
  }

  private mergeLog(log: StoredHabitLog): void {
    const normalized = this.normalizeLog(log);
    this.upsertLogIntoSignal(normalized);
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

  /**
   * Sum numeric progress for a habit over a period ending on referenceDate (defaults to today).
   * For period 'day', this returns the numeric value for the day (or 0 if none).
   */
  getPeriodQuantitySum(
    habitId: number,
    period: 'day' | 'week' | 'month',
    referenceDate: Date = new Date()
  ): number {
    const { start, end } = this.resolvePeriodRange(period, referenceDate);
    const logs = this.logsSignal();
    let sum = 0;
    for (const log of logs) {
      if (log.habitId !== habitId) continue;
      const d = toDate(log.date);
      if (d >= start && d <= end && typeof log.value === 'number') {
        sum += Math.max(0, Number(log.value) || 0);
      }
    }
    return sum;
  }

  /**
   * Count completed occurrences (boolean true or numeric > 0) for a habit over a period.
   * For binary semantics in a non-daily period, treat target as 1 completion in that period.
   */
  getPeriodCompletionCount(
    habitId: number,
    period: 'week' | 'month',
    referenceDate: Date = new Date()
  ): number {
    const { start, end } = this.resolvePeriodRange(period, referenceDate);
    const logs = this.logsSignal();
    let count = 0;
    for (const log of logs) {
      if (log.habitId !== habitId) continue;
      const d = toDate(log.date);
      if (d >= start && d <= end) {
        const contrib = this.logContribution(log);
        if (contrib > 0) {
          count += 1;
        }
      }
    }
    return count;
  }

  private resolvePeriodRange(
    period: 'day' | 'week' | 'month',
    referenceDate: Date
  ): { start: Date; end: Date } {
    const ref = toDate(referenceDate);
    if (period === 'day') {
      const start = startOfDay(ref);
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59, 999);
      return { start, end };
    }
    if (period === 'week') {
      const start = startOfWeek(ref);
      const end = endOfWeek(ref);
      return { start, end };
    }
    const start = startOfMonth(ref);
    const end = endOfMonth(ref);
    return { start, end };
  }
}
