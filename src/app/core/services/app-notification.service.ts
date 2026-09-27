import { Injectable } from '@angular/core';
import { Capacitor, type PermissionState } from '@capacitor/core';
import {
  type Channel,
  type DeliveredNotificationSchema,
  LocalNotifications,
  type LocalNotificationSchema,
  type PendingLocalNotificationSchema,
  Weekday
} from '@capacitor/local-notifications';

@Injectable({
  providedIn: 'root'
})
export class AppNotificationService {
  readonly isNativePlatform = Capacitor.isNativePlatform();
  readonly isAndroid = Capacitor.getPlatform() === 'android';

  private readonly ensuredChannelIds = new Set<string>();

  hasWebNotificationSupport(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  supportsNotifications(): boolean {
    return this.isNativePlatform || this.hasWebNotificationSupport();
  }

  supportsWebServiceWorker(): boolean {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator;
  }

  async getPermission(): Promise<NotificationPermission> {
    if (this.isNativePlatform) {
      const permissions = await LocalNotifications.checkPermissions();
      return this.mapPermissionState(permissions.display);
    }

    if (!this.hasWebNotificationSupport()) {
      return 'denied';
    }

    return this.normalizeWebPermission(Notification.permission);
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (this.isNativePlatform) {
      const current = await this.getPermission();
      if (current === 'granted') {
        return current;
      }

      const permissions = await LocalNotifications.requestPermissions();
      return this.mapPermissionState(permissions.display);
    }

    if (!this.hasWebNotificationSupport()) {
      return 'denied';
    }

    if (Notification.permission === 'default') {
      return this.normalizeWebPermission(await Notification.requestPermission());
    }

    return this.normalizeWebPermission(Notification.permission);
  }

  async ensureChannel(channel: Channel): Promise<void> {
    if (!this.isNativePlatform || !this.isAndroid || this.ensuredChannelIds.has(channel.id)) {
      return;
    }

    await LocalNotifications.createChannel(channel);
    this.ensuredChannelIds.add(channel.id);
  }

  async scheduleNativeNotifications(notifications: LocalNotificationSchema[]): Promise<void> {
    if (!this.isNativePlatform || notifications.length === 0) {
      return;
    }

    await LocalNotifications.schedule({ notifications });
  }

  async cancelNativeNotifications(ids: number[]): Promise<void> {
    if (!this.isNativePlatform || ids.length === 0) {
      return;
    }

    await LocalNotifications.cancel({
      notifications: ids.map((id) => ({ id }))
    });
  }

  async getPendingNativeNotifications(): Promise<PendingLocalNotificationSchema[]> {
    if (!this.isNativePlatform) {
      return [];
    }

    const result = await LocalNotifications.getPending();
    return result.notifications;
  }

  async getDeliveredNativeNotifications(): Promise<DeliveredNotificationSchema[]> {
    if (!this.isNativePlatform) {
      return [];
    }

    const result = await LocalNotifications.getDeliveredNotifications();
    return result.notifications;
  }

  async removeDeliveredNativeNotifications(ids: number[]): Promise<void> {
    if (!this.isNativePlatform || ids.length === 0) {
      return;
    }

    const delivered = await this.getDeliveredNativeNotifications();
    const notifications = delivered.filter((notification) => ids.includes(notification.id));
    if (notifications.length === 0) {
      return;
    }

    await LocalNotifications.removeDeliveredNotifications({ notifications });
  }

  async getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | undefined> {
    if (!this.supportsWebServiceWorker()) {
      return undefined;
    }

    try {
      return await navigator.serviceWorker.getRegistration();
    } catch {
      return undefined;
    }
  }

  async showWebNotification(title: string, options: NotificationOptions): Promise<void> {
    const registration = await this.getServiceWorkerRegistration();
    if (registration) {
      await registration.showNotification(title, options);
      return;
    }

    new Notification(title, options);
  }

  toNativeWeekday(dayOfWeek: number): Weekday {
    switch (dayOfWeek) {
      case 0:
        return Weekday.Sunday;
      case 1:
        return Weekday.Monday;
      case 2:
        return Weekday.Tuesday;
      case 3:
        return Weekday.Wednesday;
      case 4:
        return Weekday.Thursday;
      case 5:
        return Weekday.Friday;
      case 6:
      default:
        return Weekday.Saturday;
    }
  }

  private mapPermissionState(permission: PermissionState): NotificationPermission {
    if (permission === 'granted') {
      return 'granted';
    }

    if (permission === 'prompt' || permission === 'prompt-with-rationale') {
      return 'default';
    }

    return 'denied';
  }

  private normalizeWebPermission(permission: NotificationPermission): NotificationPermission {
    return permission === 'default' ? 'default' : permission;
  }
}
