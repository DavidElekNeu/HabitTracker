import { inject, Injectable, signal } from '@angular/core';
import { Habit } from '../../data/models/habit.model';
import { AppNotificationService } from './app-notification.service';
import { DailyMotivationNotificationService } from './daily-motivation-notification.service';

declare const self: unknown;

export interface ReminderSchedule {
  time: string;
  daysOfWeek: number[];
  persistent?: boolean;
}

export interface ReminderEntry {
  habitId: number;
  habitTitle: string;
  schedule: ReminderSchedule;
}

@Injectable({
  providedIn: 'root'
})
export class ReminderService {
  private readonly storageKey = 'habit-tracker-reminders';
  private readonly reminderChannelId = 'habit-reminders';
  private readonly remindersSignal = signal<ReminderEntry[]>(this.readReminders());
  private readonly timeoutHandles = new Map<number, number>();
  private readonly notificationService = inject(AppNotificationService);
  private readonly dailyMotivationNotificationService = inject(DailyMotivationNotificationService);

  readonly reminders = this.remindersSignal.asReadonly();

  constructor() {
    void this.initialize();

    if (
      !this.notificationService.isNativePlatform &&
      this.notificationService.supportsWebServiceWorker()
    ) {
      navigator.serviceWorker.ready.then(() => {
        void this.initialize();
      });
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    const permission = await this.notificationService.requestPermission();
    if (permission === 'granted') {
      void this.applySchedules();
      void this.dailyMotivationNotificationService.refreshSchedule();
      return permission;
    }

    await this.clearAllScheduledNotifications(true);
    return permission;
  }

  async enableReminder(habit: Habit, schedule: ReminderSchedule): Promise<void> {
    if (!habit.id) {
      return;
    }

    const permission = await this.requestPermission();
    const filtered = this.remindersSignal().filter((entry) => entry.habitId !== habit.id);
    const updated: ReminderEntry = {
      habitId: habit.id,
      habitTitle: habit.title,
      schedule
    };
    this.persist([...filtered, updated]);

    if (permission !== 'granted') {
      return;
    }

    if (
      !this.notificationService.isNativePlatform &&
      this.notificationService.hasWebNotificationSupport()
    ) {
      this.previewReminder(updated);
    }

    await this.scheduleReminder(updated);
  }

  disableReminder(habitId: number): void {
    const filtered = this.remindersSignal().filter((reminder) => reminder.habitId !== habitId);
    this.persist(filtered);
    this.clearScheduled(habitId);
    void this.clearNativeReminderNotifications(habitId, true);
    void this.cancelScheduledNotification(habitId);
    void this.applySchedules();
  }

  reset(): void {
    this.persist([]);
    void this.clearAllScheduledNotifications(true);
  }

  private async applySchedules(): Promise<void> {
    await this.clearAllScheduledNotifications();
    const permission = await this.notificationService.getPermission();
    if (permission !== 'granted') {
      return;
    }

    for (const reminder of this.remindersSignal()) {
      await this.scheduleReminder(reminder);
    }
  }

  private async scheduleReminder(reminder: ReminderEntry): Promise<void> {
    const nextTrigger = this.computeNextTrigger(reminder.schedule);
    if (!nextTrigger) {
      return;
    }

    if (this.notificationService.isNativePlatform) {
      await this.clearNativeReminderNotifications(reminder.habitId);
      await this.scheduleNativeReminder(reminder);
      return;
    }

    const registration = await this.notificationService.getServiceWorkerRegistration();
    if (registration && 'showNotification' in registration && this.supportsNotificationTrigger()) {
      try {
        await this.cancelScheduledNotification(reminder.habitId, registration);
        const trigger = this.createTimestampTrigger(nextTrigger.getTime());
        if (trigger) {
          await registration.showNotification(reminder.habitTitle, {
            body: `It's time to log ${reminder.habitTitle}.`,
            tag: `habit-${reminder.habitId}`,
            data: { habitId: reminder.habitId, persistent: reminder.schedule.persistent },
            requireInteraction: reminder.schedule.persistent,
            showTrigger: trigger as unknown
          } as NotificationOptions);
          return;
        }
      } catch (error) {
        console.warn(
          'Scheduling via notification trigger failed, falling back to setTimeout.',
          error
        );
      }
    }

    this.scheduleInPage(reminder, nextTrigger);
  }

  private scheduleInPage(reminder: ReminderEntry, trigger: Date): void {
    const delay = trigger.getTime() - Date.now();
    if (delay <= 0) {
      void this.deliverNotification(reminder);
      return;
    }

    const handle = window.setTimeout(async () => {
      await this.deliverNotification(reminder);
      if (reminder.schedule.persistent) {
        const next = this.computeNextTrigger(reminder.schedule);
        if (next) {
          this.scheduleInPage(reminder, next);
        }
      }
    }, delay);

    this.timeoutHandles.set(reminder.habitId, handle);
  }

  private async deliverNotification(reminder: ReminderEntry): Promise<void> {
    if (this.notificationService.isNativePlatform) {
      await this.scheduleNativeReminder(reminder, true);
      return;
    }

    if (
      !this.notificationService.hasWebNotificationSupport() ||
      Notification.permission !== 'granted'
    ) {
      return;
    }

    const body = `Time to log ${reminder.habitTitle}. Tap to record your progress.`;
    const options: NotificationOptions = {
      body,
      tag: `habit-${reminder.habitId}`,
      renotify: true,
      data: { habitId: reminder.habitId }
    };

    try {
      await this.notificationService.showWebNotification(reminder.habitTitle, options);
    } catch (error) {
      console.warn('Unable to deliver reminder notification', error);
    }
  }

  private previewReminder(reminder: ReminderEntry): void {
    const body = `We'll remind you around ${reminder.schedule.time} on ${this.formatDays(reminder.schedule.daysOfWeek)}.`;
    new Notification(`Reminder scheduled for ${reminder.habitTitle}`, {
      body,
      tag: `habit-${reminder.habitId}-preview`,
      silent: true
    });
  }

  private clearScheduled(habitId?: number): void {
    if (habitId !== undefined) {
      const handle = this.timeoutHandles.get(habitId);
      if (handle !== undefined) {
        window.clearTimeout(handle);
        this.timeoutHandles.delete(habitId);
      }
      return;
    }
    this.timeoutHandles.forEach((handle) => window.clearTimeout(handle));
    this.timeoutHandles.clear();
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

  private async cancelScheduledNotification(
    habitId: number,
    registration?: ServiceWorkerRegistration
  ): Promise<void> {
    if (this.notificationService.isNativePlatform) {
      await this.clearNativeReminderNotifications(habitId, true);
      return;
    }

    const reg = registration ?? (await this.notificationService.getServiceWorkerRegistration());
    if (!reg?.getNotifications) {
      return;
    }
    const notifications = await reg.getNotifications({ tag: `habit-${habitId}` });
    notifications.forEach((notification) => notification.close());
  }

  private computeNextTrigger(schedule: ReminderSchedule): Date | null {
    const [hours, minutes] = schedule.time.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return null;
    }

    const now = new Date();
    const activeDays = schedule.daysOfWeek.length ? schedule.daysOfWeek : [0, 1, 2, 3, 4, 5, 6];

    for (let offset = 0; offset < 14; offset++) {
      const candidate = new Date(now);
      candidate.setHours(0, 0, 0, 0);
      candidate.setDate(candidate.getDate() + offset);
      if (!activeDays.includes(candidate.getDay())) {
        continue;
      }
      candidate.setHours(hours, minutes, 0, 0);
      if (candidate > now) {
        return candidate;
      }
    }
    return null;
  }

  private formatDays(days: number[]): string {
    if (!days.length) {
      return 'all days';
    }
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map((d) => labels[d] ?? '').join(', ');
  }

  private persist(reminders: ReminderEntry[]): void {
    this.remindersSignal.set(reminders);
    localStorage.setItem(this.storageKey, JSON.stringify(reminders));
  }

  private readReminders(): ReminderEntry[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return [];
      }
      return JSON.parse(raw) as ReminderEntry[];
    } catch {
      return [];
    }
  }

  private async initialize(): Promise<void> {
    const permission = await this.notificationService.getPermission();
    if (permission !== 'granted') {
      return;
    }

    await this.applySchedules();
    await this.dailyMotivationNotificationService.refreshSchedule();
  }

  private async clearAllScheduledNotifications(includeDelivered = false): Promise<void> {
    this.clearScheduled();
    await this.clearNativeReminderNotifications(undefined, includeDelivered);
    await this.clearWebReminderNotifications();
  }

  private async clearWebReminderNotifications(): Promise<void> {
    const registration = await this.notificationService.getServiceWorkerRegistration();
    if (!registration?.getNotifications) {
      return;
    }

    const notifications = await registration.getNotifications();
    notifications
      .filter((notification) => {
        const data = (notification.data ?? null) as { habitId?: unknown } | null;
        return (
          (notification.tag?.startsWith('habit-') ?? false) || typeof data?.habitId === 'number'
        );
      })
      .forEach((notification) => notification.close());
  }

  private async clearNativeReminderNotifications(
    habitId?: number,
    includeDelivered = false
  ): Promise<void> {
    if (!this.notificationService.isNativePlatform) {
      return;
    }

    const pending = await this.notificationService.getPendingNativeNotifications();
    const pendingIds = pending
      .filter((notification) => this.matchesNativeReminderNotification(notification.extra, habitId))
      .map((notification) => notification.id);
    await this.notificationService.cancelNativeNotifications(pendingIds);

    if (!includeDelivered) {
      return;
    }

    const delivered = await this.notificationService.getDeliveredNativeNotifications();
    const deliveredIds = delivered
      .filter((notification) =>
        this.matchesNativeReminderNotification(notification.data ?? notification.extra, habitId)
      )
      .map((notification) => notification.id);
    await this.notificationService.removeDeliveredNativeNotifications(deliveredIds);
  }

  private matchesNativeReminderNotification(data: unknown, habitId?: number): boolean {
    const payload = (data ?? null) as { type?: unknown; habitId?: unknown } | null;
    if (payload?.type !== 'habit-reminder') {
      return false;
    }

    return habitId === undefined || payload.habitId === habitId;
  }

  private async scheduleNativeReminder(reminder: ReminderEntry, immediate = false): Promise<void> {
    const [hours, minutes] = reminder.schedule.time.split(':').map(Number);
    if (!immediate && (Number.isNaN(hours) || Number.isNaN(minutes))) {
      return;
    }

    await this.notificationService.ensureChannel({
      id: this.reminderChannelId,
      name: 'Habit reminders',
      description: 'Scheduled reminders for your habits.',
      importance: 4,
      vibration: true
    });

    const activeDays = reminder.schedule.daysOfWeek.length
      ? reminder.schedule.daysOfWeek
      : [0, 1, 2, 3, 4, 5, 6];
    const notifications = immediate
      ? [
          {
            id: this.buildNativeNotificationId(reminder.habitId, 9),
            title: reminder.habitTitle,
            body: `Time to log ${reminder.habitTitle}. Tap to record your progress.`,
            channelId: this.reminderChannelId,
            ongoing: !!reminder.schedule.persistent,
            autoCancel: !reminder.schedule.persistent,
            extra: {
              type: 'habit-reminder',
              habitId: reminder.habitId,
              preview: false
            }
          }
        ]
      : Array.from(new Set(activeDays)).map((dayOfWeek) => ({
          id: this.buildNativeNotificationId(reminder.habitId, dayOfWeek),
          title: reminder.habitTitle,
          body: `Time to log ${reminder.habitTitle}. Tap to record your progress.`,
          channelId: this.reminderChannelId,
          ongoing: !!reminder.schedule.persistent,
          autoCancel: !reminder.schedule.persistent,
          schedule: {
            on: {
              weekday: this.notificationService.toNativeWeekday(dayOfWeek),
              hour: hours,
              minute: minutes
            },
            allowWhileIdle: true
          },
          extra: {
            type: 'habit-reminder',
            habitId: reminder.habitId,
            dayOfWeek,
            persistent: !!reminder.schedule.persistent
          }
        }));

    await this.notificationService.scheduleNativeNotifications(notifications);
  }

  private buildNativeNotificationId(habitId: number, slot: number): number {
    return 100000 + habitId * 10 + slot;
  }
}
