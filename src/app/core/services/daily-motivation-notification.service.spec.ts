import { TestBed } from '@angular/core/testing';
import { DailyMotivationNotificationService } from './daily-motivation-notification.service';
import { AppNotificationService } from './app-notification.service';
import { MotivationalModeService } from './motivational-mode.service';
import { toDayKey } from '../utils/date-utils';

describe('Daily lesson delivery edge cases', () => {
  let service: any;
  let enabled: boolean;
  let notifications: any;
  const deliveredKey = 'habit-tracker-daily-motivation-last-delivered-day';
  beforeEach(() => {
    enabled = true;
    notifications = {
      isNativePlatform: false, isAndroid: false,
      supportsNotifications: jasmine.createSpy().and.returnValue(false),
      supportsWebServiceWorker: () => false,
      getPermission: async () => 'granted',
      showWebNotification: jasmine.createSpy().and.resolveTo()
    };
    TestBed.configureTestingModule({ providers: [
      DailyMotivationNotificationService,
      { provide: AppNotificationService, useValue: notifications },
      { provide: MotivationalModeService, useValue: { enabled: () => enabled } }
    ] });
    service = TestBed.inject(DailyMotivationNotificationService);
    notifications.supportsNotifications.and.returnValue(true);
    localStorage.removeItem(deliveredKey);
    localStorage.removeItem('habit-tracker-daily-motivation-schedule');
  });
  afterEach(() => localStorage.removeItem(deliveredKey));

  it('does not schedule another lesson after a timer has already delivered today', async () => {
    const today = toDayKey(new Date());
    const schedule = { dayKey: today, triggerAtIso: new Date().toISOString(), messageIndex: 0 };
    await service.deliverNow(schedule);
    expect((await service.reconcileSchedule(new Date())).deliveredToday).toBeTrue();
    await service.deliverNow(schedule);
    expect(notifications.showWebNotification).toHaveBeenCalledTimes(1);
  });

  it('rolls the schedule forward when less than a minute remains in the delivery window', () => {
    const result = service.createNextSchedule(new Date('2026-09-25T17:59:40'));
    expect(result.dayKey).toBe('2026-09-26');
  });

  it('does not deliver a queued callback after the mode has been disabled', async () => {
    enabled = false;
    await service.deliverNow({ dayKey: toDayKey(new Date()), messageIndex: 0 });
    expect(notifications.showWebNotification).not.toHaveBeenCalled();
  });

  it('retains the daily guard when disabling and re-enabling the mode', async () => {
    localStorage.setItem(deliveredKey, toDayKey(new Date()));
    await service.clearModeArtifacts();
    expect((await service.reconcileSchedule(new Date())).deliveredToday).toBeTrue();
  });
});
