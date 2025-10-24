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

  constructor(private readonly habitService: HabitService, private readonly logService: LogService) {}

  async ensureSeedData(): Promise<void> {
    if (environment.production) {
      return;
    }
    if (localStorage.getItem(this.seedKey) === 'true') {
      return;
    }

    await this.habitService.init();

    if (this.habitService.habits().length > 0) {
      localStorage.setItem(this.seedKey, 'true');
      return;
    }

    const baseHabits: Habit[] = [
      {
        title: 'Morning Meditation',
        description: 'Spend 10 minutes focusing on breath before starting the day.',
        type: 'binary',
        schedule: { allowSkips: false },
        tags: ['Mind', 'Wellness'],
        createdDate: new Date().toISOString()
      },
      {
        title: 'Hydration Boost',
        description: 'Drink 8 glasses of water throughout the day.',
        type: 'quantitative',
        schedule: { dailyTargetValue: 8 },
        units: 'glasses',
        tags: ['Health'],
        createdDate: new Date().toISOString()
      },
      {
        title: 'Deep Work Sessions',
        description: 'Accomplish focused work sessions 3 times a week.',
        type: 'frequency',
        schedule: { frequencyCount: 3, frequencyPeriod: 'week', allowSkips: true },
        tags: ['Career'],
        createdDate: new Date().toISOString()
      }
    ];

    for (const habit of baseHabits) {
      const created = await this.habitService.addHabit(habit);
      await this.seedLogs(created);
    }

    localStorage.setItem(this.seedKey, 'true');
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
}
