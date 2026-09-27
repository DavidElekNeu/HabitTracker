import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MotivationalModeService {
  private readonly storageKey = 'habit-tracker-motivational-mode-enabled';
  private readonly enabledSignal = signal<boolean>(this.readStoredState());

  readonly enabled = this.enabledSignal.asReadonly();

  setEnabled(enabled: boolean): void {
    this.enabledSignal.set(enabled);
    localStorage.setItem(this.storageKey, JSON.stringify(enabled));
  }

  private readStoredState(): boolean {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw === null) {
        return true;
      }

      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed === 'boolean') {
        return parsed;
      }

      if (raw === 'true') {
        return true;
      }
      if (raw === 'false') {
        return false;
      }
    } catch {
      // Fall back to enabled mode if storage is malformed.
    }

    return true;
  }
}
