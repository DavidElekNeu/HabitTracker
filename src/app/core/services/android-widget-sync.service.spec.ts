import { TestBed } from '@angular/core/testing';
import { AndroidWidgetSyncService } from './android-widget-sync.service';
import { HabitService } from './habit.service';
import { LogService } from './log.service';
import { HabitChainService } from './habit-chain.service';
import { HabitWidgetAction } from '../plugins/habit-widgets.plugin';
import { toDayKey } from '../utils/date-utils';

describe('Android widget action import', () => {
  let service: AndroidWidgetSyncService;
  let logs: jasmine.SpyObj<LogService>;

  beforeEach(() => {
    logs = jasmine.createSpyObj<LogService>('LogService', ['setHabitLog', 'clearHabitLogForDate']);
    logs.setHabitLog.and.resolveTo({ habitId: 1, value: 3, date: '', dayKey: '', habitDayKey: '' });
    logs.clearHabitLogForDate.and.resolveTo();
    TestBed.configureTestingModule({ providers: [
      AndroidWidgetSyncService,
      { provide: HabitService, useValue: { getHabit: () => ({ id: 1, type: 'quantitative', schedule: { dailyTargetValue: 5 } }) } },
      { provide: LogService, useValue: logs },
      { provide: HabitChainService, useValue: {} }
    ] });
    service = TestBed.inject(AndroidWidgetSyncService);
  });

  function apply(action: HabitWidgetAction): Promise<void> {
    return (service as unknown as { applyAction(action: HabitWidgetAction): Promise<void> }).applyAction(action);
  }

  it('imports a background tap on its original local day', async () => {
    await apply({ type: 'set_value', habitId: 1, dayKey: '2026-03-29', value: 3 });
    const saved = logs.setHabitLog.calls.mostRecent().args[0];
    expect(toDayKey(saved.date!)).toBe('2026-03-29');
    expect(saved.value).toBe(3);
  });

  it('replays a failed acknowledgement as the same value rather than another increment', async () => {
    const action: HabitWidgetAction = { type: 'set_value', habitId: 1, dayKey: '2026-09-25', value: 3 };
    await apply(action);
    await apply(action);
    expect(logs.setHabitLog.calls.allArgs().map(args => args[0].value)).toEqual([3, 3]);
  });

  it('preserves the actual tap time for time-sensitive habit chains', async () => {
    const timestamp = new Date('2026-09-25T18:43:00').getTime();
    await apply({ type: 'set_value', habitId: 1, dayKey: '2026-09-25', timestamp, value: 3 });
    expect(new Date(logs.setHabitLog.calls.mostRecent().args[0].date!).getTime()).toBe(timestamp);
  });

  it('keeps the original day when the time zone has changed since the tap', async () => {
    await apply({ type: 'set_value', habitId: 1, dayKey: '2026-09-25', timestamp: new Date('2026-09-26T01:00:00').getTime(), value: 3 });
    expect(toDayKey(logs.setHabitLog.calls.mostRecent().args[0].date!)).toBe('2026-09-25');
  });

  it('undoes only the dated entry and propagates write failures for retry', async () => {
    await apply({ type: 'set_value', habitId: 1, dayKey: '2026-09-25', value: 0 });
    expect(toDayKey(logs.clearHabitLogForDate.calls.mostRecent().args[1])).toBe('2026-09-25');
    logs.setHabitLog.and.rejectWith(new Error('storage unavailable'));
    await expectAsync(apply({ type: 'set_value', habitId: 1, dayKey: '2026-09-25', value: 2 }))
      .toBeRejectedWithError('storage unavailable');
  });
});
