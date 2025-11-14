import { Injectable, computed, signal } from '@angular/core';
import { Habit } from '../../data/models/habit.model';
import { DBService } from './db.service';
import { DBError } from './db-error';

@Injectable({
  providedIn: 'root'
})
export class HabitService {
  private readonly habitsSignal = signal<Habit[]>([]);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);
  private initialized = false;
  private changeVersion = 0;
  private readonly mutationVersions = new Map<number, { version: number; type: 'updated' | 'deleted' }>();
  private readonly recentlyAddedHabitIds = new Set<number>();

  readonly habits = computed(() => this.habitsSignal());
  readonly isLoading = computed(() => this.loadingSignal());
  readonly error = computed(() => this.errorSignal());

  constructor(private readonly db: DBService) {
    // Intentionally empty. Consumers should call init() to start loading.
  }

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    await this.loadHabits();
  }

  async loadHabits(): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    const loadVersion = this.changeVersion;
    try {
      const habits = await this.db.getHabits();
      this.applyLoadedHabits(habits, loadVersion);
    } catch (error) {
      const message = error instanceof DBError ? error.message : 'Unknown error fetching habits';
      this.errorSignal.set(message);
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async addHabit(habit: Habit): Promise<Habit> {
    this.errorSignal.set(null);
    try {
      const id = await this.db.addHabit(habit);
      const timestampedHabit: Habit = { ...habit, id };
      this.habitsSignal.update((current) => [...current, timestampedHabit]);
      this.recordMutation(id, 'updated');
      this.recentlyAddedHabitIds.add(id);
      return timestampedHabit;
    } catch (error) {
      const message = error instanceof DBError ? error.message : 'Unknown error adding habit';
      this.errorSignal.set(message);
      throw error;
    }
  }

  async updateHabit(updated: Habit): Promise<Habit> {
    this.errorSignal.set(null);
    try {
      await this.db.updateHabit(updated);
      let updatedHabit: Habit | undefined;
      this.habitsSignal.update((current) =>
        current.map((habit) => {
          if (habit.id === updated.id) {
            updatedHabit = { ...habit, ...updated };
            return updatedHabit;
          }
          return habit;
        })
      );
      if (updated.id !== undefined) {
        this.recordMutation(updated.id, 'updated');
      }
      return updatedHabit ?? updated;
    } catch (error) {
      const message = error instanceof DBError ? error.message : 'Unknown error updating habit';
      this.errorSignal.set(message);
      throw error;
    }
  }

  async removeHabit(id: number): Promise<void> {
    this.errorSignal.set(null);
    try {
      await this.db.deleteHabit(id);
      this.habitsSignal.update((current) => current.filter((habit) => habit.id !== id));
      this.recordMutation(id, 'deleted');
      this.recentlyAddedHabitIds.delete(id);
    } catch (error) {
      const message = error instanceof DBError ? error.message : 'Unknown error removing habit';
      this.errorSignal.set(message);
      throw error;
    }
  }

  getHabit(id: number): Habit | undefined {
    return this.habitsSignal().find((habit) => habit.id === id);
  }

  isRecentlyAdded(id: number): boolean {
    return this.recentlyAddedHabitIds.has(id);
  }

  acknowledgeHabit(id: number): void {
    this.recentlyAddedHabitIds.delete(id);
  }

  clearError(): void {
    this.errorSignal.set(null);
  }

  private applyLoadedHabits(habits: Habit[], loadVersion: number): void {
    const existing = this.habitsSignal();
    const merged: Habit[] = [];
    const seenIds = new Set<number>();

    for (const habit of habits) {
      if (habit.id === undefined) {
        continue;
      }
      const mutation = this.mutationVersions.get(habit.id);
      if (mutation && mutation.version > loadVersion) {
        if (mutation.type === 'deleted') {
          continue;
        }
        const local = existing.find((item) => item.id === habit.id);
        if (local) {
          merged.push(local);
          seenIds.add(habit.id);
          continue;
        }
      }
      // Migrate deprecated 'frequency' type to binary with schedule
      const normalized = (habit as any).type === 'frequency' ? ({ ...habit, type: 'binary' } as Habit) : habit;
      merged.push(normalized);
      seenIds.add(habit.id);
    }

    for (const habit of existing) {
      if (habit.id === undefined) {
        merged.push(habit);
        continue;
      }
      if (seenIds.has(habit.id)) {
        continue;
      }
      const mutation = this.mutationVersions.get(habit.id);
      if (mutation && mutation.type === 'deleted' && mutation.version > loadVersion) {
        continue;
      }
      const normalizedExisting = (habit as any).type === 'frequency' ? ({ ...habit, type: 'binary' } as Habit) : habit;
      merged.push(normalizedExisting);
      seenIds.add(habit.id);
    }

    this.habitsSignal.set(merged);
    this.pruneMutations(loadVersion);

    const mergedIds = new Set(merged.filter((habit) => habit.id !== undefined).map((habit) => habit.id as number));
    for (const id of Array.from(this.recentlyAddedHabitIds)) {
      if (!mergedIds.has(id)) {
        this.recentlyAddedHabitIds.delete(id);
      }
    }
  }

  private recordMutation(id: number | undefined, type: 'updated' | 'deleted'): void {
    if (id === undefined) {
      return;
    }
    const version = ++this.changeVersion;
    this.mutationVersions.set(id, { version, type });
  }

  private pruneMutations(maxVersion: number): void {
    for (const [id, mutation] of this.mutationVersions) {
      if (mutation.version <= maxVersion) {
        this.mutationVersions.delete(id);
      }
    }
  }
}
