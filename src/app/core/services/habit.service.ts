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
    try {
      const habits = await this.db.getHabits();
      this.habitsSignal.set(habits);
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
    } catch (error) {
      const message = error instanceof DBError ? error.message : 'Unknown error removing habit';
      this.errorSignal.set(message);
      throw error;
    }
  }

  getHabit(id: number): Habit | undefined {
    return this.habitsSignal().find((habit) => habit.id === id);
  }

  clearError(): void {
    this.errorSignal.set(null);
  }
}
