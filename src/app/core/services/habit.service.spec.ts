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

  const createDeferred = <T>() => {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };

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

  it('should retain locally added habits when load completes later', async () => {
    const deferred = createDeferred<Habit[]>();
    dbServiceSpy.getHabits.and.returnValue(deferred.promise);

    const loadPromise = service.loadHabits();
    dbServiceSpy.addHabit.and.resolveTo(5);

    const newHabit = createHabit({ id: undefined, title: 'Async Habit', createdDate: new Date().toISOString() });
    await service.addHabit(newHabit);
    expect(service.habits().some((habit) => habit.id === 5)).toBeTrue();

    deferred.resolve([]);
    await loadPromise;

    expect(service.habits().some((habit) => habit.id === 5)).toBeTrue();
  });

  it('tracks recently added habits and supports acknowledgement', async () => {
    const newHabit = createHabit({ id: undefined, title: 'Track Me' });
    dbServiceSpy.addHabit.and.resolveTo(7);

    await service.addHabit(newHabit);
    expect(service.isRecentlyAdded(7)).toBeTrue();

    service.acknowledgeHabit(7);
    expect(service.isRecentlyAdded(7)).toBeFalse();
  });
});
