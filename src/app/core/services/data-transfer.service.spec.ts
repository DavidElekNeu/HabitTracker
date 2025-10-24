import { DataTransferService } from './data-transfer.service';
import { Habit } from '../../data/models/habit.model';
import { HabitLog } from '../../data/models/log.model';
import { DBService } from './db.service';
import { HabitService } from './habit.service';
import { LogService } from './log.service';
import { ReminderService } from './reminder.service';

describe('DataTransferService', () => {
  let dbService: jasmine.SpyObj<DBService>;
  let habitService: jasmine.SpyObj<HabitService>;
  let logService: jasmine.SpyObj<LogService>;
  let reminderService: jasmine.SpyObj<ReminderService>;
  let service: DataTransferService;

  const habits: Habit[] = [
    {
      id: 1,
      title: 'Meditate',
      type: 'binary',
      schedule: {},
      createdDate: '2024-01-01T00:00:00.000Z'
    }
  ];

  const logs: HabitLog[] = [
    {
      id: 1,
      habitId: 1,
      date: '2024-01-02T00:00:00.000Z',
      dayKey: '2024-01-02',
      habitDayKey: '1::2024-01-02',
      value: true
    }
  ];

  beforeEach(() => {
    dbService = jasmine.createSpyObj<DBService>('DBService', [
      'getHabits',
      'getLogs',
      'clearAll',
      'putHabit',
      'putLog'
    ]);
    habitService = jasmine.createSpyObj<HabitService>('HabitService', ['loadHabits']);
    logService = jasmine.createSpyObj<LogService>('LogService', ['loadAllLogs']);
    reminderService = jasmine.createSpyObj<ReminderService>('ReminderService', ['reset']);

    service = new DataTransferService(dbService, habitService, logService, reminderService);
  });

  it('exports data as a JSON blob', async () => {
    dbService.getHabits.and.resolveTo(habits);
    dbService.getLogs.and.resolveTo(logs);

    const blob = await service.exportData();
    const text = await blob.text();
    const parsed = JSON.parse(text);

    expect(parsed.habits.length).toBe(1);
    expect(parsed.logs.length).toBe(1);
    expect(parsed.version).toBeGreaterThan(0);
  });

  it('imports data and refreshes services', async () => {
    spyOn(JSON, 'parse').and.returnValue({
      version: 1,
      exportedAt: new Date().toISOString(),
      habits,
      logs
    });

    await service.importData('{}');

    expect(dbService.clearAll).toHaveBeenCalled();
    expect(dbService.putHabit).toHaveBeenCalledWith(habits[0]);
    expect(dbService.putLog).toHaveBeenCalledWith(logs[0]);
    expect(reminderService.reset).toHaveBeenCalled();
    expect(habitService.loadHabits).toHaveBeenCalled();
    expect(logService.loadAllLogs).toHaveBeenCalled();
  });

  it('throws for invalid imports', async () => {
    spyOn(JSON, 'parse').and.returnValue({});
    await expectAsync(service.importData('{}')).toBeRejected();
    expect(dbService.clearAll).not.toHaveBeenCalled();
  });
});
