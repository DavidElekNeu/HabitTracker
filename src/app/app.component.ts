import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HabitService } from './core/services/habit.service';
import { LogService } from './core/services/log.service';
import { DevSeedService } from './core/services/dev-seed.service';
import { ThemeService } from './shared/services/theme.service';

interface NavLink {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgFor, NgIf],
  template: `
    <div class="flex min-h-screen flex-col bg-surface text-on-surface">
      <header class="glass sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800">
        <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <a routerLink="/" class="text-lg font-semibold text-primary hover:opacity-80">Habit Tracker</a>
          <nav class="hidden gap-4 text-sm font-medium sm:flex">
            <a
              *ngFor="let link of navLinks"
              [routerLink]="link.path"
              routerLinkActive="text-primary"
              #rla="routerLinkActive"
              [routerLinkActiveOptions]="{ exact: link.path === '/' }"
              [attr.aria-current]="rla.isActive ? 'page' : null"
              class="transition hover:text-primary"
              >{{ link.label }}</a
            >
          </nav>
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/70 text-base text-slate-600 shadow-sm transition hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300"
            (click)="toggleTheme()"
            [attr.aria-label]="themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            <span *ngIf="themeMode === 'dark'; else sun" aria-hidden="true">🌙</span>
            <ng-template #sun>🌞</ng-template>
          </button>
        </div>
      </header>

      <main class="flex-1 px-4 py-6">
        <div *ngIf="habitError()" class="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/70 dark:text-red-200">
          {{ habitError() }}
        </div>
        <div *ngIf="logError()" class="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/70 dark:text-red-200">
          {{ logError() }}
        </div>
        <div class="mx-auto w-full max-w-5xl">
          <router-outlet />
        </div>
      </main>

      <footer class="glass border-t border-slate-200 py-3 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        Built for consistent, meaningful habits.
      </footer>
    </div>

    <nav class="glass fixed bottom-0 left-0 right-0 border-t border-slate-200 px-4 py-3 shadow-lg shadow-slate-900/5 sm:hidden dark:border-slate-800">
      <div class="flex items-center justify-between text-xs font-medium">
        <a
          *ngFor="let link of navLinks"
          [routerLink]="link.path"
          routerLinkActive="text-primary"
          #rla="routerLinkActive"
          [routerLinkActiveOptions]="{ exact: link.path === '/' }"
          [attr.aria-current]="rla.isActive ? 'page' : null"
          class="flex flex-1 flex-col items-center gap-1 transition hover:text-primary"
        >
          <span class="text-lg">{{ link.icon }}</span>
          <span>{{ link.label }}</span>
        </a>
      </div>
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  private readonly habitService = inject(HabitService);
  private readonly logService = inject(LogService);
  private readonly devSeedService = inject(DevSeedService);
  private readonly themeService = inject(ThemeService);

    readonly navLinks: NavLink[] = [
    { label: 'Today', path: '/', icon: '\u{1F4C5}' },
    { label: 'Habits', path: '/habits', icon: '\u{1F4CB}' },
    { label: 'Add', path: '/add-habit', icon: '\u2795' },
    { label: 'Reports', path: '/reports', icon: '\u{1F4C8}' },
    { label: 'Settings', path: '/settings', icon: '\u2699' }
  ];

  readonly habitError = this.habitService.error;
  readonly logError = this.logService.error;
  get themeMode(): 'dark' | 'light' | 'system' {
    return this.themeService.mode();
  }

  async ngOnInit(): Promise<void> {
    try {
      await this.habitService.init();
    } catch (error) {
      console.error(error);
    }

    try {
      await this.logService.loadAllLogs();
    } catch (error) {
      console.error(error);
    }

    await this.devSeedService.ensureSeedData();
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }
}
