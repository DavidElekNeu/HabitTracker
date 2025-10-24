import { Injectable } from '@angular/core';
import { Habit } from '../../data/models/habit.model';
import { HabitLog } from '../../data/models/log.model';
import { DBService } from './db.service';
import { HabitService } from './habit.service';
import { LogService } from './log.service';
import { ReminderService } from './reminder.service';

export interface HabitTrackerExport {
  version: number;
  exportedAt: string;
  habits: Habit[];
  logs: HabitLog[];
}

@Injectable({
  providedIn: 'root'
})
export class DataTransferService {
  private readonly exportVersion = 1;

  constructor(
    private readonly db: DBService,
    private readonly habitService: HabitService,
    private readonly logService: LogService,
    private readonly reminderService: ReminderService
  ) {}

  async exportData(): Promise<Blob> {
    const [habits, logs] = await Promise.all([this.db.getHabits(), this.db.getLogs()]);
    const payload: HabitTrackerExport = {
      version: this.exportVersion,
      exportedAt: new Date().toISOString(),
      habits,
      logs
    };
    const json = JSON.stringify(payload, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  async importData(content: string): Promise<void> {
    const parsed = JSON.parse(content) as HabitTrackerExport;

    if (!parsed.habits || !Array.isArray(parsed.habits) || !parsed.logs || !Array.isArray(parsed.logs)) {
      throw new Error('Invalid import file.');
    }

    await this.db.clearAll();

    for (const habit of parsed.habits) {
      await this.db.putHabit(habit);
    }

    for (const log of parsed.logs) {
      await this.db.putLog(log);
    }

    this.reminderService.reset();
    await this.habitService.loadHabits();
    await this.logService.loadAllLogs();
  }

  async clearAllData(): Promise<void> {
    await this.db.clearAll();
    this.reminderService.reset();
    await this.habitService.loadHabits();
    await this.logService.loadAllLogs();
  }
}
