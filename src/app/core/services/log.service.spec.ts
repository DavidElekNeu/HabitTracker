import { TestBed } from '@angular/core/testing';
import { LogService } from './log.service';
import { DBService } from './db.service';
import { HabitLog } from '../../data/models/log.model';
import { DBError } from './db-error';

describe('LogService', () => {
  let service: LogService;
  let dbServiceSpy: jasmine.SpyObj<DBService>;

  const createLog = (overrides: Partial<HabitLog> = {}): HabitLog => ({
    id: overrides.id ?? 1,
    habitId: overrides.habitId ?? 10,
    date: overrides.date ?? new Date().toISOString(),
    dayKey: overrides.dayKey ?? '2024-01-01',
    habitDayKey: overrides.habitDayKey ?? '10::2024-01-01',
    value: overrides.value ?? true,
    notes: overrides.notes,
    synced: overrides.synced ?? false
  });

  beforeEach(() => {
    dbServiceSpy = jasmine.createSpyObj<DBService>('DBService', [
      'getLogs',
      'getLogsByHabit',
      'getLogByHabitDay',
      'getLogsByDay',
      'addLog',
      'updateLog',
      'deleteLog'
    ]);

    TestBed.configureTestingModule({
      providers: [
        LogService,
        { provide: DBService, useValue: dbServiceSpy }
      ]
    });

    service = TestBed.inject(LogService);
  });

  it('loads all logs into signal', async () => {
    const logs = [createLog(), createLog({ id: 2, habitDayKey: '11::2024-01-02', habitId: 11 })];
    dbServiceSpy.getLogs.and.resolveTo(logs);

    await service.loadAllLogs();

    expect(dbServiceSpy.getLogs).toHaveBeenCalled();
    expect(service.logs()).toEqual(logs);
    expect(service.error()).toBeNull();
  });

  it('handles load all logs errors', async () => {
    dbServiceSpy.getLogs.and.callFake(() => Promise.reject(new DBError('load failure')));

    await expectAsync(service.loadAllLogs()).toBeRejected();
    expect(service.error()).toBe('load failure');
  });

  it('creates new habit log with generated keys', async () => {
    const now = new Date('2024-02-01T08:00:00Z');
    dbServiceSpy.getLogByHabitDay.and.resolveTo(undefined);
    dbServiceSpy.addLog.and.resolveTo(5);

    const result = await service.setHabitLog({
      habitId: 42,
      date: now,
      value: true
    });

    expect(dbServiceSpy.addLog).toHaveBeenCalled();
    expect(result.id).toBe(5);
    expect(result.habitDayKey).toBe('42::2024-02-01');
    expect(result.dayKey).toBe('2024-02-01');
    expect(service.getLogForDate(42, now)?.id).toBe(5);
  });

  it('updates existing habit log if already present', async () => {
    const existing = createLog({ id: 7, habitId: 50, dayKey: '2024-03-01', habitDayKey: '50::2024-03-01', value: false });
    service['logsSignal'].set([existing]);
    dbServiceSpy.getLogByHabitDay.and.resolveTo(existing);
    dbServiceSpy.updateLog.and.callFake(async (log: HabitLog) => log);

    const updated = await service.setHabitLog({
      habitId: 50,
      date: '2024-03-01',
      value: true
    });

    expect(dbServiceSpy.updateLog).toHaveBeenCalled();
    expect(updated.value).toBeTrue();
    expect(service.getLogForDate(50, '2024-03-01')?.value).toBeTrue();
  });

  it('increments numeric logs', async () => {
    const log = createLog({ id: 9, habitId: 60, dayKey: '2024-04-01', habitDayKey: '60::2024-04-01', value: 2 });
    service['logsSignal'].set([log]);
    dbServiceSpy.getLogByHabitDay.and.resolveTo(log);
    dbServiceSpy.updateLog.and.callFake(async (updated: HabitLog) => updated);

    const result = await service.incrementHabitLog(60, 3, { date: '2024-04-01' });
    expect(result.value).toBe(5);
    expect(service.getLogForDate(60, '2024-04-01')?.value).toBe(5);
  });

  it('deletes logs and updates signal', async () => {
    const log = createLog({ id: 4 });
    service['logsSignal'].set([log]);
    dbServiceSpy.deleteLog.and.resolveTo();

    await service.deleteLog(4);

    expect(dbServiceSpy.deleteLog).toHaveBeenCalledWith(4);
    expect(service.logs()).toEqual([]);
  });

  it('returns correct streak counts', () => {
    const logs = [
      createLog({ dayKey: '2024-05-04', habitId: 1, habitDayKey: '1::2024-05-04', value: true }),
      createLog({ dayKey: '2024-05-03', habitId: 1, habitDayKey: '1::2024-05-03', value: true }),
      createLog({ dayKey: '2024-05-01', habitId: 1, habitDayKey: '1::2024-05-01', value: true })
    ];
    service['logsSignal'].set(logs);

    expect(service.getCurrentStreak(1)).toBe(2);
  });

  it('computes completed counts for week', () => {
    const logs = [
      createLog({ habitId: 2, dayKey: '2024-06-03', habitDayKey: '2::2024-06-03', date: '2024-06-03T08:00:00Z', value: true }),
      createLog({ habitId: 2, dayKey: '2024-06-05', habitDayKey: '2::2024-06-05', date: '2024-06-05T08:00:00Z', value: true }),
      createLog({ habitId: 2, dayKey: '2024-06-12', habitDayKey: '2::2024-06-12', date: '2024-06-12T08:00:00Z', value: true })
    ];
    service['logsSignal'].set(logs);

    const count = service.getCompletedCount(2, 'week', new Date('2024-06-05T12:00:00Z'));
    expect(count).toBe(2);
  });

  it('sums numeric contributions when counting completions', () => {
    const logs = [
      createLog({ habitId: 3, dayKey: '2024-07-01', habitDayKey: '3::2024-07-01', date: '2024-07-01T08:00:00Z', value: 2 }),
      createLog({ habitId: 3, dayKey: '2024-07-02', habitDayKey: '3::2024-07-02', date: '2024-07-02T08:00:00Z', value: 1 })
    ];
    service['logsSignal'].set(logs);

    const count = service.getCompletedCount(3, 'week', new Date('2024-07-02T12:00:00Z'));
    expect(count).toBe(3);
  });
});
