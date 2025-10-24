import { Injectable, signal } from '@angular/core';
import { Habit } from '../../data/models/habit.model';

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
  private readonly remindersSignal = signal<ReminderEntry[]>(this.readReminders());
  private readonly timeoutHandles = new Map<number, number>();

  readonly reminders = this.remindersSignal.asReadonly();

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      void this.applySchedules();
    }
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        if (Notification.permission === 'granted') {
          void this.applySchedules();
        }
      });
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        void this.applySchedules();
      } else {
        this.clearScheduled();
      }
      return result;
    }

    if (Notification.permission === 'granted') {
      void this.applySchedules();
    }

    return Notification.permission;
  }

  async enableReminder(habit: Habit, schedule: ReminderSchedule): Promise<void> {
    if (!habit.id) {
      return;
    }
    await this.requestPermission();
    const filtered = this.remindersSignal().filter((entry) => entry.habitId !== habit.id);
    const updated: ReminderEntry = {
      habitId: habit.id,
      habitTitle: habit.title,
      schedule
    };
    this.persist([...filtered, updated]);
    if ('Notification' in window && Notification.permission === 'granted') {
      this.previewReminder(updated);
    }
    await this.scheduleReminder(updated);
  }

  disableReminder(habitId: number): void {
    const filtered = this.remindersSignal().filter((reminder) => reminder.habitId !== habitId);
    this.persist(filtered);
    this.clearScheduled(habitId);
    void this.cancelScheduledNotification(habitId);
    void this.applySchedules();
  }

  reset(): void {
    this.persist([]);
    this.clearScheduled();
    void this.applySchedules();
  }

  private async applySchedules(): Promise<void> {
    this.clearScheduled();

    if (!('Notification' in window) || Notification.permission !== 'granted') {
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

    const registration = await navigator.serviceWorker.getRegistration();
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
        console.warn('Scheduling via notification trigger failed, falling back to setTimeout.', error);
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
    if (!('Notification' in window) || Notification.permission !== 'granted') {
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
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.showNotification(reminder.habitTitle, options);
          return;
        }
      }
      new Notification(reminder.habitTitle, options);
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
    const TriggerCtor = (window as any).TimestampTrigger ?? (self as { TimestampTrigger?: any })?.TimestampTrigger;
    return TriggerCtor ? new TriggerCtor(timestamp) : null;
  }

  private async cancelScheduledNotification(habitId: number, registration?: ServiceWorkerRegistration): Promise<void> {
    const reg = registration ?? (await navigator.serviceWorker.getRegistration());
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
}
