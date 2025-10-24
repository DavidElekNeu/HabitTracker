import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';

type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storageKey = 'habit-tracker-theme';

  private readonly modeSignal = signal<ThemeMode>('system');
  readonly mode = this.modeSignal.asReadonly();

  constructor() {
    this.bootstrap();
  }

  setMode(mode: ThemeMode): void {
    this.modeSignal.set(mode);
    localStorage.setItem(this.storageKey, mode);
    this.applyMode();
  }

  toggle(): void {
    const next = this.modeSignal() === 'dark' ? 'light' : 'dark';
    this.setMode(next);
  }

  private bootstrap(): void {
    const stored = localStorage.getItem(this.storageKey) as ThemeMode | null;
    if (stored) {
      this.modeSignal.set(stored);
    }
    this.applyMode();
    this.attachSystemListener();
  }

  private applyMode(): void {
    const root = this.document.documentElement;
    const mode = this.modeSignal();

    if (mode === 'system') {
      root.classList.toggle('dark', this.prefersDark());
      root.classList.toggle('light', !this.prefersDark());
      return;
    }

    root.classList.toggle('dark', mode === 'dark');
    root.classList.toggle('light', mode === 'light');
  }

  private prefersDark(): boolean {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private attachSystemListener(): void {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', () => {
      if (this.modeSignal() === 'system') {
        this.applyMode();
      }
    });
  }
}
