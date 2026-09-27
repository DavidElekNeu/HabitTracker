import { inject, Injectable } from '@angular/core';
import { DAILY_LESSONS, DAILY_MOTIVATION_MESSAGES } from '../constants/daily-motivation-messages';
import { DailyLessons } from '../plugins/daily-lessons.plugin';
import { toDayKey } from '../utils/date-utils';
import { AppNotificationService } from './app-notification.service';
import { MotivationalModeService } from './motivational-mode.service';

declare const self: unknown;

interface DailyMotivationScheduleState {
  dayKey: string;
  triggerAtIso: string;
  messageIndex: number;
}

interface DailyMotivationRefreshState {
  deliveredToday: boolean;
  pending: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DailyMotivationNotificationService {
  private readonly storageKey = 'habit-tracker-daily-motivation-schedule';
  private readonly lastDeliveredDayKeyStorageKey =
    'habit-tracker-daily-motivation-last-delivered-day';
  private readonly dailyMotivationChannelId = 'daily-motivation';
  private readonly nativeNotificationId = 910001;
  private readonly afternoonStartHour = 13;
  private readonly afternoonEndHour = 18;
  private readonly notificationService = inject(AppNotificationService);
  private readonly motivationalModeService = inject(MotivationalModeService);
  private timeoutHandle: number | null = null;
  private refreshQueue: Promise<void> = Promise.resolve();

  constructor() {
    if (!this.hasNotificationSupport()) {
      return;
    }

    void this.initialize();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void this.initialize();
    });

    if (
      !this.notificationService.isNativePlatform &&
      this.notificationService.supportsWebServiceWorker()
    ) {
      navigator.serviceWorker.ready.then(() => {
        void this.initialize();
      });
    }
  }

  refreshSchedule(): Promise<void> {
    const refresh = this.refreshQueue.then(() => this.refreshScheduleNow());
    this.refreshQueue = refresh.catch(error => console.warn('Unable to refresh daily lessons.', error));
    return refresh;
  }

  private async refreshScheduleNow(): Promise<void> {
    this.clearPendingTimeout();

    if (this.notificationService.isAndroid) {
      // Migrate the old one-shot alarm before enabling the self-renewing native schedule.
      await this.clearNativeDailyMotivationNotifications(true);
      localStorage.removeItem(this.storageKey);
      await DailyLessons.configure({ enabled: this.motivationalModeService.enabled() });
      return;
    }

    if (!this.motivationalModeService.enabled()) {
      await this.clearModeArtifacts();
      return;
    }

    if (!(await this.canNotifyNow())) {
      return;
    }

    const now = new Date();
    const state = await this.reconcileSchedule(now);
    if (state.pending) {
      return;
    }

    const scheduleAnchor = state.deliveredToday ? this.startOfNextDay(now) : now;

    const next = this.readOrCreateSchedule(scheduleAnchor);
    if (!next) {
      return;
    }

    await this.schedule(next);
  }

  private async schedule(schedule: DailyMotivationScheduleState): Promise<void> {
    const triggerAt = new Date(schedule.triggerAtIso);
    if (Number.isNaN(triggerAt.getTime())) {
      localStorage.removeItem(this.storageKey);
      await this.clearNativeDailyMotivationNotifications(true);
      await this.refreshScheduleNow();
      return;
    }

    if (triggerAt.getTime() <= Date.now()) {
      localStorage.removeItem(this.storageKey);
      await this.clearNativeDailyMotivationNotifications(true);
      await this.refreshScheduleNow();
      return;
    }

    if (this.notificationService.isNativePlatform) {
      await this.scheduleNative(schedule, triggerAt);
      return;
    }

    const registration = await this.notificationService.getServiceWorkerRegistration();
    if (registration && 'showNotification' in registration && this.supportsNotificationTrigger()) {
      try {
        const trigger = this.createTimestampTrigger(triggerAt.getTime());
        if (trigger) {
          await registration.showNotification(this.resolveTitle(schedule.messageIndex), {
            body: this.resolveMessage(schedule.messageIndex),
            tag: `daily-motivation-${schedule.dayKey}`,
            data: { type: 'daily-motivation', dayKey: schedule.dayKey },
            showTrigger: trigger as unknown
          } as NotificationOptions);
          return;
        }
      } catch (error) {
        console.warn('Unable to schedule trigger-based daily motivation notification.', error);
      }
    }

    this.scheduleInPage(schedule, triggerAt);
  }

  private scheduleInPage(schedule: DailyMotivationScheduleState, triggerAt: Date): void {
    const delay = triggerAt.getTime() - Date.now();
    if (delay <= 0) {
      void this.deliverNow(schedule);
      return;
    }

    this.timeoutHandle = window.setTimeout(async () => {
      this.timeoutHandle = null;
      await this.deliverNow(schedule);
      localStorage.removeItem(this.storageKey);
      await this.refreshSchedule();
    }, delay);
  }

  private async deliverNow(schedule: DailyMotivationScheduleState): Promise<boolean> {
    if (!this.motivationalModeService.enabled() || !(await this.canNotifyNow())) {
      return false;
    }
    if (this.wasDeliveredForDay(schedule.dayKey)) return true;

    const options: NotificationOptions = {
      body: this.resolveMessage(schedule.messageIndex),
      tag: `daily-motivation-${schedule.dayKey}`,
      renotify: false,
      data: { type: 'daily-motivation', dayKey: schedule.dayKey }
    };

    let delivered = false;

    try {
      if (this.notificationService.isNativePlatform) {
        await this.scheduleNative(schedule);
        delivered = true;
      } else {
        await this.notificationService.showWebNotification(this.resolveTitle(schedule.messageIndex), options);
        delivered = true;
      }
    } catch (error) {
      console.warn('Unable to deliver daily motivation notification', error);
    }

    if (delivered) {
      this.markDeliveredForDay(schedule.dayKey);
    }

    return delivered;
  }

  private readOrCreateSchedule(now: Date): DailyMotivationScheduleState | null {
    const stored = this.readStoredSchedule();
    if (stored) {
      const triggerAt = new Date(stored.triggerAtIso);
      if (
        !Number.isNaN(triggerAt.getTime()) &&
        triggerAt.getTime() > now.getTime() &&
        stored.dayKey === toDayKey(triggerAt)
      ) {
        return stored;
      }
    }

    const next = this.createNextSchedule(now);
    if (!next) {
      return null;
    }

    this.persist(next);
    return next;
  }

  private createNextSchedule(now: Date): DailyMotivationScheduleState | null {
    const start = new Date(now);
    start.setHours(this.afternoonStartHour, 0, 0, 0);
    const end = new Date(now);
    end.setHours(this.afternoonEndHour, 0, 0, 0);

    let day = new Date(now);
    let lowerBound = start;
    let upperBound = end;

    if (now >= end) {
      day = new Date(now);
      day.setDate(day.getDate() + 1);
      lowerBound = new Date(day);
      lowerBound.setHours(this.afternoonStartHour, 0, 0, 0);
      upperBound = new Date(day);
      upperBound.setHours(this.afternoonEndHour, 0, 0, 0);
    } else if (now > start && now < end) {
      lowerBound = new Date(now.getTime() + 60 * 1000);
      upperBound = end;
    }

    const from = lowerBound.getTime();
    const to = upperBound.getTime();
    if (to <= from) {
      return this.createNextSchedule(this.startOfNextDay(now));
    }

    const triggerAt = new Date(from + Math.floor(Math.random() * (to - from)));
    const messageIndex = DAILY_MOTIVATION_MESSAGES.length
      ? Math.floor(Math.random() * DAILY_MOTIVATION_MESSAGES.length)
      : 0;

    return {
      dayKey: toDayKey(triggerAt),
      triggerAtIso: triggerAt.toISOString(),
      messageIndex
    };
  }

  private resolveMessage(index: number): string {
    const fallback = 'Today, you are building your future with another small step.';
    return DAILY_MOTIVATION_MESSAGES[index] ?? DAILY_MOTIVATION_MESSAGES[0] ?? fallback;
  }

  private resolveTitle(index: number): string {
    return DAILY_LESSONS[index]?.title ?? DAILY_LESSONS[0].title;
  }

  private persist(schedule: DailyMotivationScheduleState): void {
    localStorage.setItem(this.storageKey, JSON.stringify(schedule));
  }

  private readStoredSchedule(): DailyMotivationScheduleState | null {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as Partial<DailyMotivationScheduleState>;
      if (
        typeof parsed.dayKey !== 'string' ||
        typeof parsed.triggerAtIso !== 'string' ||
        typeof parsed.messageIndex !== 'number'
      ) {
        return null;
      }
      return {
        dayKey: parsed.dayKey,
        triggerAtIso: parsed.triggerAtIso,
        messageIndex: parsed.messageIndex
      };
    } catch {
      return null;
    }
  }

  private clearPendingTimeout(): void {
    if (this.timeoutHandle !== null) {
      window.clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }

  private async reconcileSchedule(now: Date): Promise<DailyMotivationRefreshState> {
    if (this.notificationService.isNativePlatform) {
      return this.reconcileNativeSchedule(now);
    }

    return {
      pending: false,
      deliveredToday: this.wasDeliveredForDay(toDayKey(now)) || await this.recoverMissedInPageDelivery(now)
    };
  }

  private async reconcileNativeSchedule(now: Date): Promise<DailyMotivationRefreshState> {
    const stored = this.readStoredSchedule();
    if (!stored) {
      return {
        pending: false,
        deliveredToday: this.wasDeliveredForDay(toDayKey(now))
      };
    }

    const triggerAt = new Date(stored.triggerAtIso);
    if (Number.isNaN(triggerAt.getTime())) {
      localStorage.removeItem(this.storageKey);
      await this.clearNativeDailyMotivationNotifications(true);
      return {
        pending: false,
        deliveredToday: this.wasDeliveredForDay(toDayKey(now))
      };
    }

    if (await this.hasPendingNativeNotification()) {
      return {
        pending: true,
        deliveredToday: this.wasDeliveredForDay(stored.dayKey)
      };
    }

    if (triggerAt.getTime() <= now.getTime()) {
      this.markDeliveredForDay(stored.dayKey);
      localStorage.removeItem(this.storageKey);
      return {
        pending: false,
        deliveredToday: stored.dayKey === toDayKey(now)
      };
    }

    return {
      pending: false,
      deliveredToday: this.wasDeliveredForDay(toDayKey(now))
    };
  }

  private async recoverMissedInPageDelivery(now: Date): Promise<boolean> {
    if (this.supportsNotificationTrigger()) {
      return false;
    }

    const stored = this.readStoredSchedule();
    if (!stored) {
      return false;
    }

    const triggerAt = new Date(stored.triggerAtIso);
    if (Number.isNaN(triggerAt.getTime())) {
      localStorage.removeItem(this.storageKey);
      return false;
    }

    if (triggerAt.getTime() > now.getTime()) {
      return false;
    }

    const isPastScheduleForToday = stored.dayKey === toDayKey(now);
    let deliveredToday = false;

    if (isPastScheduleForToday) {
      if (this.wasDeliveredForDay(stored.dayKey)) {
        deliveredToday = true;
      } else {
        deliveredToday = await this.deliverNow(stored);
      }
    }

    localStorage.removeItem(this.storageKey);
    return deliveredToday;
  }

  private markDeliveredForDay(dayKey: string): void {
    localStorage.setItem(this.lastDeliveredDayKeyStorageKey, dayKey);
  }

  private wasDeliveredForDay(dayKey: string): boolean {
    try {
      return localStorage.getItem(this.lastDeliveredDayKeyStorageKey) === dayKey;
    } catch {
      return false;
    }
  }

  private startOfNextDay(date: Date): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
    return next;
  }

  private async clearModeArtifacts(): Promise<void> {
    this.clearPendingTimeout();
    localStorage.removeItem(this.storageKey);

    if (this.notificationService.isNativePlatform) {
      await this.clearNativeDailyMotivationNotifications(true);
      return;
    }

    if (!this.notificationService.supportsWebServiceWorker()) {
      return;
    }

    try {
      const registration = await this.notificationService.getServiceWorkerRegistration();
      if (!registration?.getNotifications) {
        return;
      }
      const notifications = await registration.getNotifications();
      notifications
        .filter((notification) => {
          const data = (notification.data ?? null) as { type?: unknown } | null;
          return (
            (notification.tag?.startsWith('daily-motivation-') ?? false) ||
            data?.type === 'daily-motivation'
          );
        })
        .forEach((notification) => notification.close());
    } catch (error) {
      console.warn('Unable to clear daily motivation notifications.', error);
    }
  }

  private hasNotificationSupport(): boolean {
    return this.notificationService.supportsNotifications();
  }

  private async canNotifyNow(): Promise<boolean> {
    return (
      this.hasNotificationSupport() &&
      (await this.notificationService.getPermission()) === 'granted'
    );
  }

  private supportsNotificationTrigger(): boolean {
    return (
      typeof (window as any).TimestampTrigger !== 'undefined' ||
      typeof (self as { TimestampTrigger?: unknown })?.TimestampTrigger !== 'undefined'
    );
  }

  private createTimestampTrigger(timestamp: number): unknown {
    const TriggerCtor =
      (window as any).TimestampTrigger ?? (self as { TimestampTrigger?: any })?.TimestampTrigger;
    return TriggerCtor ? new TriggerCtor(timestamp) : null;
  }

  private async initialize(): Promise<void> {
    if (this.notificationService.isAndroid) {
      await this.refreshSchedule();
      return;
    }
    const permission = await this.notificationService.getPermission();
    if (permission === 'granted') {
      await this.refreshSchedule();
    }
  }

  private async scheduleNative(
    schedule: DailyMotivationScheduleState,
    triggerAt?: Date
  ): Promise<void> {
    await this.notificationService.ensureChannel({
      id: this.dailyMotivationChannelId,
      name: 'Daily motivation',
      description: 'Afternoon motivation reminders.',
      importance: 4,
      vibration: true
    });

    await this.clearNativeDailyMotivationNotifications();

    await this.notificationService.scheduleNativeNotifications([
      {
        id: this.nativeNotificationId,
        title: this.resolveTitle(schedule.messageIndex),
        body: this.resolveMessage(schedule.messageIndex),
        channelId: this.dailyMotivationChannelId,
        autoCancel: true,
        schedule: triggerAt
          ? {
              at: triggerAt,
              allowWhileIdle: true
            }
          : undefined,
        extra: {
          type: 'daily-motivation',
          dayKey: schedule.dayKey,
          messageIndex: schedule.messageIndex
        }
      }
    ]);
  }

  private async clearNativeDailyMotivationNotifications(includeDelivered = false): Promise<void> {
    if (!this.notificationService.isNativePlatform) {
      return;
    }

    await this.notificationService.cancelNativeNotifications([this.nativeNotificationId]);
    if (includeDelivered) {
      await this.notificationService.removeDeliveredNativeNotifications([
        this.nativeNotificationId
      ]);
    }
  }

  private async hasPendingNativeNotification(): Promise<boolean> {
    if (!this.notificationService.isNativePlatform) {
      return false;
    }

    const pending = await this.notificationService.getPendingNativeNotifications();
    return pending.some((notification) => notification.id === this.nativeNotificationId);
  }
}
