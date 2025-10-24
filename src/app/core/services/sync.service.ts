import { Injectable, signal } from '@angular/core';

export interface SyncStatus {
  enabled: boolean;
  lastSync?: string;
  provider?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private readonly statusSignal = signal<SyncStatus>({ enabled: false });

  readonly status = this.statusSignal.asReadonly();

  /**
   * Placeholder enabling logic.
   * In the future this will configure the user's chosen provider and start background sync.
   */
  async enable(provider: string): Promise<void> {
    // TODO: Integrate with real sync layer (Drive, Dropbox, custom API...).
    this.statusSignal.set({
      enabled: true,
      provider,
      lastSync: new Date().toISOString()
    });
  }

  async disable(): Promise<void> {
    this.statusSignal.set({ enabled: false });
  }

  markSynced(): void {
    if (!this.statusSignal().enabled) {
      return;
    }
    this.statusSignal.update((state) => ({
      ...state,
      lastSync: new Date().toISOString()
    }));
  }
}
