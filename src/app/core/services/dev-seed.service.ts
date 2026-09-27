import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HabitService } from './habit.service';
import { LogService } from './log.service';
import { Habit } from '../../data/models/habit.model';

@Injectable({
  providedIn: 'root'
})
export class DevSeedService {
  private readonly seedKey = 'habit-tracker-seeded';
  private readonly seedIdsKey = 'habit-tracker-seeded-habit-ids';
  private readonly autoSeedEnabledKey = 'habit-tracker-dev-seed-enabled';
  private readonly tutorialSampleIdsKey = 'habit-tracker-tutorial-sample-habit-ids';
  private readonly demoHabitBlueprints: Array<Omit<Habit, 'createdDate'>> = [
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

  constructor(private readonly habitService: HabitService, private readonly logService: LogService) {}

  async ensureSeedData(): Promise<void> {
    if (environment.production) {
      return;
    }

    await this.habitService.init();
    await this.cleanupLegacyDemoHabits();

    // Keep development seed data opt-in only. This prevents tutorial/demo habits
    // from becoming real user habits by default.
    if (localStorage.getItem(this.autoSeedEnabledKey) !== 'true') {
      return;
    }
    if (localStorage.getItem(this.seedKey) === 'true') {
      return;
    }

    if (this.habitService.habits().length > 0) {
      localStorage.setItem(this.seedKey, 'true');
      return;
    }

    const createdIds: number[] = [];
    for (const habit of this.createDemoHabits()) {
      const created = await this.habitService.addHabit(habit);
      if (typeof created.id === 'number') {
        createdIds.push(created.id);
      }
      await this.seedLogs(created);
    }

    localStorage.setItem(this.seedKey, 'true');
    localStorage.setItem(this.seedIdsKey, JSON.stringify(createdIds));
  }

  private async seedLogs(habit: Habit): Promise<void> {
    const today = new Date();
    for (let i = 0; i < 4; i++) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      await this.logService.setHabitLog({
        habitId: habit.id!,
        date,
        value: this.seedValueForHabit(habit)
      });
    }
  }

  private seedValueForHabit(habit: Habit): number | boolean {
    if (habit.type === 'binary') {
      return true;
    }
    if (habit.type === 'quantitative') {
      const target = habit.schedule.dailyTargetValue ?? 4;
      return Math.round(target * 0.75);
    }
    return 1;
  }

  private createDemoHabits(): Habit[] {
    const createdDate = new Date().toISOString();
    return this.demoHabitBlueprints.map((habit) => ({
      ...habit,
      createdDate
    }));
  }

  private async cleanupLegacyDemoHabits(): Promise<void> {
    const ids = this.resolveDemoHabitIdsForCleanup();
    if (!ids.length) {
      return;
    }

    for (const habitId of ids) {
      await this.logService.deleteLogsForHabit(habitId);
      await this.habitService.removeHabit(habitId);
    }

    localStorage.removeItem(this.seedKey);
    localStorage.removeItem(this.seedIdsKey);
  }

  private resolveDemoHabitIdsForCleanup(): number[] {
    const habits = this.habitService.habits();
    const tutorialSampleIds = new Set(this.readStoredIds(this.tutorialSampleIdsKey));
    const indexedIds = this.readStoredSeedIds().filter((id) =>
      habits.some((habit) => habit.id === id) && !tutorialSampleIds.has(id)
    );
    if (indexedIds.length) {
      return indexedIds;
    }

    if (localStorage.getItem(this.seedKey) !== 'true') {
      return [];
    }

    const matchedIds = habits
      .filter(
        (habit) =>
          typeof habit.id === 'number' &&
          this.matchesDemoTemplate(habit) &&
          !tutorialSampleIds.has(habit.id as number)
      )
      .map((habit) => habit.id as number);
    if (matchedIds.length < this.demoHabitBlueprints.length) {
      return [];
    }
    return matchedIds;
  }

  private readStoredSeedIds(): number[] {
    return this.readStoredIds(this.seedIdsKey);
  }

  private readStoredIds(storageKey: string): number[] {
    try {
      const raw = localStorage.getItem(storageKey);
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

  private matchesDemoTemplate(habit: Habit): boolean {
    return this.demoHabitBlueprints.some(
      (template) =>
        habit.title === template.title && (habit.description ?? '') === (template.description ?? '')
    );
  }
}
