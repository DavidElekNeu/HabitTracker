import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { firstValueFrom } from 'rxjs';
import { Habit } from '../../data/models/habit.model';
import { HabitLog } from '../../data/models/log.model';
import { DBError } from './db-error';

@Injectable({
  providedIn: 'root'
})
export class DBService {
  private readonly habitStore = 'habits';
  private readonly logStore = 'logs';
  private readonly settingsStore = 'settings';

  constructor(private readonly db: NgxIndexedDBService) {}

  async getHabits(): Promise<Habit[]> {
    try {
      const rows = await firstValueFrom(this.db.getAll<Habit>(this.habitStore));
      return rows.map((h: any) => {
        if (h && (typeof h.id === "string" || typeof h.id === "number")) {
          const n = Number(h.id);
          if (Number.isFinite(n)) {
            return { ...h, id: n } as Habit;
          }
        }
        return h as Habit;
      });
    } catch (error) {
      throw new DBError('Failed to fetch habits from IndexedDB', error);
    }
  }

  async addHabit(habit: Habit): Promise<number> {
    try {
      const result = await firstValueFrom(this.db.add(this.habitStore, habit));
      if (typeof result === "number") {
  return result;
}
if (typeof result === "string") {
  const n = Number(result);
  if (Number.isFinite(n)) {
    return n;
  }
}
if (result && typeof result === "object") {
  const anyr: any = result as any;
  if (typeof anyr.key === "number" || typeof anyr.key === "string") {
    const n = Number( anyr.key );
    if (Number.isFinite(n)) {
      return n;
    }
  }
  if (typeof anyr.id === "number" || typeof anyr.id === "string") {
    const n = Number( anyr.id );
    if (Number.isFinite(n)) {
      return n;
    }
  }
}
throw new DBError('IndexedDB add(habits) returned unknown key shape');
    } catch (error) {
      throw new DBError('Failed to add habit to IndexedDB', error);
    }
  }

  async updateHabit(habit: Habit): Promise<Habit> {
    try {
      return await firstValueFrom(this.db.update<Habit>(this.habitStore, habit));
    } catch (error) {
      throw new DBError('Failed to update habit in IndexedDB', error);
    }
  }

  async deleteHabit(id: number): Promise<void> {
    try {
      await firstValueFrom(this.db.delete(this.habitStore, id));
    } catch (error) {
      throw new DBError('Failed to delete habit from IndexedDB', error);
    }
  }

  async getHabit(id: number): Promise<Habit | undefined> {
    try {
      return await firstValueFrom(this.db.getByKey<Habit>(this.habitStore, id));
    } catch (error) {
      throw new DBError('Failed to fetch habit from IndexedDB', error);
    }
  }

  async getLogs(): Promise<HabitLog[]> {
    try {
      return await firstValueFrom(this.db.getAll<HabitLog>(this.logStore));
    } catch (error) {
      throw new DBError('Failed to fetch logs from IndexedDB', error);
    }
  }

  async getLogsByHabit(habitId: number): Promise<HabitLog[]> {
    try {
      return await firstValueFrom(
        this.db.getAllByIndex<HabitLog>(this.logStore, 'habitId', IDBKeyRange.only(habitId))
      );
    } catch (error) {
      throw new DBError('Failed to fetch logs for habit from IndexedDB', error);
    }
  }

  async getLogByHabitDay(habitDayKey: string): Promise<HabitLog | undefined> {
    try {
      return await firstValueFrom(this.db.getByIndex<HabitLog>(this.logStore, 'habitDayKey', habitDayKey));
    } catch (error) {
      throw new DBError('Failed to fetch habit log by day from IndexedDB', error);
    }
  }

  async getLogsByDay(dayKey: string): Promise<HabitLog[]> {
    try {
      return await firstValueFrom(
        this.db.getAllByIndex<HabitLog>(this.logStore, 'dayKey', IDBKeyRange.only(dayKey))
      );
    } catch (error) {
      throw new DBError('Failed to fetch logs by day from IndexedDB', error);
    }
  }

  async addLog(log: HabitLog): Promise<number> {
    try {
      const result = await firstValueFrom(this.db.add(this.logStore, log));
      if (typeof result === "number") {
  return result;
}
if (typeof result === "string") {
  const n = Number(result);
  if (Number.isFinite(n)) {
    return n;
  }
}
if (result && typeof result === "object") {
  const anyr: any = result as any;
  if (typeof anyr.key === "number" || typeof anyr.key === "string") {
    const n = Number( anyr.key );
    if (Number.isFinite(n)) {
      return n;
    }
  }
  if (typeof anyr.id === "number" || typeof anyr.id === "string") {
    const n = Number( anyr.id );
    if (Number.isFinite(n)) {
      return n;
    }
  }
}
throw new DBError('IndexedDB add(habits) returned unknown key shape');
    } catch (error) {
      throw new DBError('Failed to add log entry to IndexedDB', error);
    }
  }

  async updateLog(log: HabitLog): Promise<HabitLog> {
    try {
      return await firstValueFrom(this.db.update<HabitLog>(this.logStore, log));
    } catch (error) {
      throw new DBError('Failed to update log entry in IndexedDB', error);
    }
  }

  async deleteLog(id: number): Promise<void> {
    try {
      await firstValueFrom(this.db.delete(this.logStore, id));
    } catch (error) {
      throw new DBError('Failed to delete log entry from IndexedDB', error);
    }
  }

  async clearStore(store: 'habits' | 'logs' | 'settings'): Promise<void> {
    try {
      await this.db.clear(store);
    } catch (error) {
      throw new DBError(`Failed to clear ${store} store in IndexedDB`, error);
    }
  }

  async putHabit(habit: Habit): Promise<void> {
    try {
      await firstValueFrom(this.db.update<Habit>(this.habitStore, habit));
    } catch (error) {
      throw new DBError('Failed to upsert habit in IndexedDB', error);
    }
  }

  async putLog(log: HabitLog): Promise<void> {
    try {
      await firstValueFrom(this.db.update<HabitLog>(this.logStore, log));
    } catch (error) {
      throw new DBError('Failed to upsert log entry in IndexedDB', error);
    }
  }

  async clearAll(): Promise<void> {
    try {
      await this.db.clear(this.habitStore);
      await this.db.clear(this.logStore);
    } catch (error) {
      throw new DBError('Failed to clear IndexedDB stores', error);
    }
  }
}


