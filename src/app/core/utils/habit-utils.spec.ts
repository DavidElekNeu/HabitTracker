import { getHabitPeriodTarget, isHabitDueToday } from './habit-utils';
import { Habit } from '../../data/models/habit.model';

describe('habit-utils', () => {
  const createHabit = (overrides: Partial<Habit> = {}): Habit => ({
    id: 1,
    title: 'Test habit',
    type: 'quantitative',
    schedule: {
      frequencyPeriod: 'week',
      dailyTargetValue: 7
    },
    createdDate: '2026-03-18T12:00:00.000Z',
    ...overrides
  });

  it('prorates weekly target in creation week', () => {
    const habit = createHabit({
      schedule: { frequencyPeriod: 'week', dailyTargetValue: 7 },
      createdDate: '2026-03-18T12:00:00.000Z' // Wednesday
    });

    const target = getHabitPeriodTarget(habit, new Date('2026-03-18T20:00:00.000Z'));

    // Mon..Sun week => 5 active days (Wed..Sun) => 7 * 5/7 = 5
    expect(target).toBe(5);
  });

  it('uses full weekly target after creation week', () => {
    const habit = createHabit({
      schedule: { frequencyPeriod: 'week', dailyTargetValue: 7 },
      createdDate: '2026-03-18T12:00:00.000Z'
    });

    const nextWeekTarget = getHabitPeriodTarget(habit, new Date('2026-03-24T12:00:00.000Z'));

    expect(nextWeekTarget).toBe(7);
  });

  it('never drops positive prorated target below one', () => {
    const habit = createHabit({
      schedule: { frequencyPeriod: 'week', dailyTargetValue: 3 },
      createdDate: '2026-03-22T08:00:00.000Z' // Sunday
    });

    const target = getHabitPeriodTarget(habit, new Date('2026-03-22T12:00:00.000Z'));

    expect(target).toBe(1);
  });

  it('uses prorated target in due-check logic', () => {
    const habit = createHabit({
      schedule: { frequencyPeriod: 'week', dailyTargetValue: 7 },
      createdDate: '2026-03-18T12:00:00.000Z'
    });
    const wednesday = new Date('2026-03-18T12:00:00.000Z');

    expect(isHabitDueToday(habit, wednesday, { completedThisPeriod: 4 })).toBeTrue();
    expect(isHabitDueToday(habit, wednesday, { completedThisPeriod: 5 })).toBeFalse();
  });
});

