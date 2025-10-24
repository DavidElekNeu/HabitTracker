import { TestBed } from '@angular/core/testing';
import { HabitService } from './habit.service';
import { DBService } from './db.service';
import { Habit } from '../../data/models/habit.model';
import { DBError } from './db-error';

describe('HabitService', () => {
  let service: HabitService;
  let dbServiceSpy: jasmine.SpyObj<DBService>;

  const createHabit = (overrides: Partial<Habit> = {}): Habit => ({
    id: 1,
    title: 'Test Habit',
    type: 'binary',
    schedule: {},
    createdDate: new Date().toISOString(),
    ...overrides
  });

  beforeEach(() => {
    dbServiceSpy = jasmine.createSpyObj<DBService>('DBService', ['getHabits', 'addHabit', 'updateHabit', 'deleteHabit']);

    TestBed.configureTestingModule({
      providers: [
        HabitService,
        { provide: DBService, useValue: dbServiceSpy }
      ]
    });

    service = TestBed.inject(HabitService);
  });

  it('should load habits and update signal', async () => {
    const habits = [createHabit({ id: 1 }), createHabit({ id: 2, title: 'Habit 2' })];
    dbServiceSpy.getHabits.and.resolveTo(habits);

    await service.loadHabits();

    expect(dbServiceSpy.getHabits).toHaveBeenCalledTimes(1);
    expect(service.habits()).toEqual(habits);
    expect(service.isLoading()).toBeFalse();
    expect(service.error()).toBeNull();
  });

  it('should capture errors when loading fails', async () => {
    dbServiceSpy.getHabits.and.callFake(() => Promise.reject(new DBError('Failed to fetch habits')));

    await expectAsync(service.loadHabits()).toBeRejected();

    expect(service.habits()).toEqual([]);
    expect(service.error()).toBe('Failed to fetch habits');
    expect(service.isLoading()).toBeFalse();
  });

  it('should add habit and update cache', async () => {
    const newHabit = createHabit({ id: undefined, title: 'New Habit' });
    dbServiceSpy.addHabit.and.resolveTo(42);
    dbServiceSpy.getHabits.and.resolveTo([]);

    await service.loadHabits();
    const created = await service.addHabit(newHabit);

    expect(dbServiceSpy.addHabit).toHaveBeenCalledWith(newHabit);
    expect(service.habits().length).toBe(1);
    expect(service.habits()[0].id).toBe(42);
    expect(created.id).toBe(42);
  });

  it('should propagate add habit errors', async () => {
    const newHabit = createHabit({ id: undefined });
    dbServiceSpy.addHabit.and.callFake(() => Promise.reject(new DBError('Failed to add habit')));

    await expectAsync(service.addHabit(newHabit)).toBeRejected();
    expect(service.error()).toBe('Failed to add habit');
  });
});
