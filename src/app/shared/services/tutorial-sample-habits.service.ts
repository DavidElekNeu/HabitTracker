import { Injectable } from '@angular/core';
import { Habit } from '../../data/models/habit.model';
import { HabitService } from '../../core/services/habit.service';
import { LogService } from '../../core/services/log.service';

@Injectable({
  providedIn: 'root'
})
export class TutorialSampleHabitsService {
  private readonly storageKey = 'habit-tracker-tutorial-sample-habit-ids';
  private readonly sampleHabits: Array<Omit<Habit, 'createdDate'>> = [
    {
      title: 'Morning Meditation',
      description: 'Spend 10 minutes focusing on breath before starting the day.',
      type: 'binary',
      schedule: { allowSkips: false },
      tags: ['Mind', 'Wellness']
    },
    {
      title: 'Hydration Boost',
      description: 'Drink 8 glasses of water throughout the day.',
      type: 'quantitative',
      schedule: { dailyTargetValue: 8 },
      units: 'glasses',
      tags: ['Health']
    },
    {
      title: 'Deep Work Sessions',
      description: 'Accomplish focused work sessions 3 times a week.',
      type: 'frequency',
      schedule: { frequencyCount: 3, frequencyPeriod: 'week', allowSkips: true },
      tags: ['Career']
    }
  ];

  constructor(
    private readonly habitService: HabitService,
    private readonly logService: LogService
  ) {}

  async ensurePresent(): Promise<void> {
    await this.habitService.init();

    const existingHabits = this.habitService.habits();
    const trackedIds = this.readStoredIds().filter((id) =>
      existingHabits.some((habit) => habit.id === id)
    );

    if (trackedIds.length === this.sampleHabits.length) {
      return;
    }

    // Reset partial sample state so tutorial always starts with the full set.
    if (trackedIds.length > 0) {
      for (const id of trackedIds) {
        await this.logService.deleteLogsForHabit(id);
        await this.habitService.removeHabit(id);
      }
    }

    const createdIds: number[] = [];
    const createdDate = new Date().toISOString();

    for (const sample of this.sampleHabits) {
      const created = await this.habitService.addHabit({
        ...sample,
        createdDate
      });
      if (typeof created.id === 'number') {
        createdIds.push(created.id);
      }
    }

    this.persistIds(createdIds);
  }

  async removeAll(): Promise<void> {
    await this.habitService.init();

    const ids = this.readStoredIds();
    if (!ids.length) {
      return;
    }

    for (const id of ids) {
      await this.logService.deleteLogsForHabit(id);
      await this.habitService.removeHabit(id);
    }

    localStorage.removeItem(this.storageKey);
  }

  private readStoredIds(): number[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0);
    } catch {
      return [];
    }
  }

  private persistIds(ids: number[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(ids));
  }
}
