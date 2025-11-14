import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';

type ThemeMode = 'light' | 'dark' | 'system' | 'high-contrast';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storageKey = 'habit-tracker-theme';
  private readonly accentKey = 'habit-tracker-accent';

  private readonly modeSignal = signal<ThemeMode>('system');
  private readonly accentSignal = signal<string>(this.readStoredAccent());
  readonly mode = this.modeSignal.asReadonly();
  readonly accent = this.accentSignal.asReadonly();

  constructor() {
    this.bootstrap();
  }

  setMode(mode: ThemeMode): void {
    this.modeSignal.set(mode);
    localStorage.setItem(this.storageKey, mode);
    this.applyMode();
  }

  setAccent(_accent?: 'gold'): void {
    // Lock to GOLD tokens only
    this.accentSignal.set('gold');
    localStorage.setItem(this.accentKey, 'gold');

    const root = this.document.documentElement;
    const isDark = root.classList.contains('dark');
    const tokens = isDark
      ? { accent: '#f1c232', contrast: '#1a1205', soft: '#3a2d12' }
      : { accent: '#d4a017', contrast: '#1d1406', soft: '#fff3cf' };

    root.style.setProperty('--accent', tokens.accent);
    root.style.setProperty('--accent-dark', tokens.accent);
    root.style.setProperty('--accent-contrast', tokens.contrast);
    root.style.setProperty('--accent-soft', tokens.soft);

    // Brand surfaces for GOLD
    const surfaces = {
      light: { bg1: '#f8f2df', bg2: '#efe0c0', paper: '#f8f2df', text1: '#2f2410', text2: '#7d5b2b', muted400: '#b18a52', muted300: '#c8b17a', border1: '#e4d4ad', border2: '#d7c49a' },
      dark:  { bg: '#1d140a', text: '#f5e8c7' }
    } as const;
    root.style.setProperty('--bg-1', surfaces.light.bg1);
    root.style.setProperty('--bg-2', surfaces.light.bg2);
    root.style.setProperty('--surface-light', surfaces.light.bg1);
    root.style.setProperty('--paper', surfaces.light.paper);
    root.style.setProperty('--text-1', surfaces.light.text1);
    root.style.setProperty('--text-2', surfaces.light.text2);
    root.style.setProperty('--text-muted-light', surfaces.light.text2);
    root.style.setProperty('--text-subtle-light', surfaces.light.text2);
    root.style.setProperty('--muted-400', surfaces.light.muted400);
    root.style.setProperty('--muted-300', surfaces.light.muted300);
    root.style.setProperty('--border-1', surfaces.light.border1);
    root.style.setProperty('--border-2', surfaces.light.border2);
    root.style.setProperty('--surface-dark', surfaces.dark.bg);
    root.style.setProperty('--on-surface-dark', surfaces.dark.text);
  }

  toggle(): void {
    const current = this.modeSignal();
    if (current === 'system') {
      // If system is currently dark, switch to explicit light; otherwise to dark
      const next: ThemeMode = this.prefersDark() ? 'light' : 'dark';
      this.setMode(next);
      return;
    }
    const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
    this.setMode(next);
  }

  private bootstrap(): void {
    const stored = localStorage.getItem(this.storageKey) as ThemeMode | null;
    if (stored) {
      this.modeSignal.set(stored);
    }
    this.applyMode();
    this.attachSystemListener();
    // apply accent
    this.setAccent((this.accentSignal() as any) || 'gold');
  }

  private applyMode(): void {
    const root = this.document.documentElement;
    const mode = this.modeSignal();

    if (mode === 'system') {
      const dark = this.prefersDark();
      root.classList.toggle('dark', dark);
      root.classList.toggle('light', !dark);
      root.classList.remove('hc');
      // Refresh accent tokens to match the effective class
      this.setAccent((this.accentSignal() as any) || 'gold');
      return;
    }

    root.classList.toggle('dark', mode === 'dark');
    root.classList.toggle('light', mode === 'light');
    root.classList.toggle('hc', mode === 'high-contrast');

    // Re-apply accent tokens for the current mode
    this.setAccent((this.accentSignal() as any) || 'gold');
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
  isDark(): boolean {
    const mode = this.modeSignal();
    if (mode === 'system') {
      return this.prefersDark();
    }
    return mode === 'dark';
  }

  private readStoredAccent(): string {
    // Force gold as the only accent option
    return 'gold';
  }
}
