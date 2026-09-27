import { TestBed } from '@angular/core/testing';
import { toDayKey } from '../utils/date-utils';
import { Habit, HabitChainLink } from '../../data/models/habit.model';
import { HabitLog } from '../../data/models/log.model';
import { HabitChainService } from './habit-chain.service';
import { HabitService } from './habit.service';
import { LogService } from './log.service';

describe('HabitChainService', () => {
  let service: HabitChainService;
  let habitServiceSpy: jasmine.SpyObj<HabitService>;
  let logServiceSpy: jasmine.SpyObj<LogService>;

  const createHabit = (overrides: Partial<Habit> = {}): Habit => ({
    id: overrides.id ?? 1,
    title: overrides.title ?? 'Habit',
    type: overrides.type ?? 'binary',
    schedule: overrides.schedule ?? {},
    createdDate: overrides.createdDate ?? new Date().toISOString(),
    ...overrides
  });

  const createLog = (overrides: Partial<HabitLog> = {}): HabitLog => ({
    id: overrides.id ?? 1,
    habitId: overrides.habitId ?? 2,
    date: overrides.date ?? new Date().toISOString(),
    dayKey: overrides.dayKey ?? toDayKey(overrides.date ?? new Date()),
    habitDayKey: overrides.habitDayKey ?? `${overrides.habitId ?? 2}::${toDayKey(overrides.date ?? new Date())}`,
    value: overrides.value ?? true,
    notes: overrides.notes,
    synced: overrides.synced ?? false
  });

  const createLink = (overrides: Partial<HabitChainLink> = {}): HabitChainLink => ({
    id: overrides.id ?? 'link-1',
    targetHabitId: overrides.targetHabitId ?? 2,
    relation: overrides.relation ?? 'after',
    priority: overrides.priority ?? 0,
    trigger: overrides.trigger,
    note: overrides.note,
    conditions: overrides.conditions,
    isActive: overrides.isActive ?? true
  });

  beforeEach(() => {
    habitServiceSpy = jasmine.createSpyObj<HabitService>('HabitService', [
      'getHabit',
      'getOutgoingChainLinks',
      'getIncomingChainLinks',
      'getChainLinkCount'
    ]);
    logServiceSpy = jasmine.createSpyObj<LogService>('LogService', ['getCompletedCount', 'getLogsForHabit']);

    TestBed.configureTestingModule({
      providers: [
        HabitChainService,
        { provide: HabitService, useValue: habitServiceSpy },
        { provide: LogService, useValue: logServiceSpy }
      ]
    });

    service = TestBed.inject(HabitChainService);
    logServiceSpy.getCompletedCount.and.returnValue(0);
    logServiceSpy.getLogsForHabit.and.returnValue([]);
  });

  it('returns after-links for completion trigger', () => {
    const source = createHabit({ id: 1, title: 'Start laundry' });
    const target = createHabit({ id: 2, title: 'Put away dry clothes' });
    const link = createLink({ relation: 'after', targetHabitId: 2 });

    habitServiceSpy.getHabit.and.callFake((id: number) => (id === 1 ? source : target));
    habitServiceSpy.getOutgoingChainLinks.and.returnValue([{ sourceHabit: source, link, targetHabit: target }]);

    const suggestions = service.getSuggestionsFromHabit(1, 'on_complete');

    expect(suggestions.length).toBe(1);
    expect(suggestions[0].targetHabit.id).toBe(2);
    expect(suggestions[0].trigger).toBe('on_complete');
  });

  it('returns before-links only for open trigger', () => {
    const source = createHabit({ id: 1, title: 'Wash dishes' });
    const target = createHabit({ id: 2, title: 'Put away clean dishes' });
    const link = createLink({ relation: 'before', targetHabitId: 2 });

    habitServiceSpy.getHabit.and.callFake((id: number) => (id === 1 ? source : target));
    habitServiceSpy.getOutgoingChainLinks.and.returnValue([{ sourceHabit: source, link, targetHabit: target }]);

    expect(service.getSuggestionsFromHabit(1, 'on_complete').length).toBe(0);
    expect(service.getSuggestionsFromHabit(1, 'on_open').length).toBe(1);
  });

  it('skips suggestions when target was recently completed', () => {
    const now = new Date(2026, 2, 15, 10, 0, 0);
    const source = createHabit({ id: 1, title: 'Anchor' });
    const target = createHabit({ id: 2, title: 'Follow-up' });
    const link = createLink({
      relation: 'after',
      targetHabitId: 2,
      conditions: { skipIfCompletedWithinHours: 6 }
    });
    const recentLog = createLog({
      habitId: 2,
      date: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
      value: true
    });

    habitServiceSpy.getHabit.and.callFake((id: number) => (id === 1 ? source : target));
    habitServiceSpy.getOutgoingChainLinks.and.returnValue([{ sourceHabit: source, link, targetHabit: target }]);
    logServiceSpy.getLogsForHabit.and.returnValue([recentLog]);

    const suggestions = service.getSuggestionsFromHabit(1, 'on_complete', { now });

    expect(suggestions.length).toBe(0);
  });

  it('respects only-if-due condition', () => {
    const monday = new Date(2026, 2, 16, 9, 0, 0);
    const source = createHabit({ id: 1, title: 'Anchor' });
    const target = createHabit({
      id: 2,
      title: 'Weekend-only task',
      schedule: { allowedWeekdays: [0] }
    });
    const link = createLink({
      relation: 'after',
      targetHabitId: 2,
      conditions: { onlyIfDue: true }
    });

    habitServiceSpy.getHabit.and.callFake((id: number) => (id === 1 ? source : target));
    habitServiceSpy.getOutgoingChainLinks.and.returnValue([{ sourceHabit: source, link, targetHabit: target }]);

    const suggestions = service.getSuggestionsFromHabit(1, 'on_complete', { now: monday });

    expect(suggestions.length).toBe(0);
  });

  it('orders suggestions by priority and applies limit', () => {
    const source = createHabit({ id: 1, title: 'Gym return' });
    const targetA = createHabit({ id: 2, title: 'Unpack bag' });
    const targetB = createHabit({ id: 3, title: 'Pack tomorrow bag' });

    const lowPriority = createLink({ id: 'a', targetHabitId: 2, relation: 'after', priority: 1 });
    const highPriority = createLink({
      id: 'b',
      targetHabitId: 3,
      relation: 'after',
      priority: 5,
      conditions: { withinMinutes: 30 }
    });

    habitServiceSpy.getHabit.and.callFake((id: number) => (id === 1 ? source : id === 2 ? targetA : targetB));
    habitServiceSpy.getOutgoingChainLinks.and.returnValue([
      { sourceHabit: source, link: lowPriority, targetHabit: targetA },
      { sourceHabit: source, link: highPriority, targetHabit: targetB }
    ]);

    const suggestions = service.getSuggestionsFromHabit(1, 'on_complete', { limit: 1 });

    expect(suggestions.length).toBe(1);
    expect(suggestions[0].targetHabit.id).toBe(3);
    expect(suggestions[0].expiresAt).toBeDefined();
  });
});

