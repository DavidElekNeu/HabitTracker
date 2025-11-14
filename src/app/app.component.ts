import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HabitService } from './core/services/habit.service';
import { LogService } from './core/services/log.service';
import { DevSeedService } from './core/services/dev-seed.service';
import { ThemeService } from './shared/services/theme.service';
import { OnboardingService } from './shared/services/onboarding.service';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';

interface NavLink {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgFor, NgIf, ToastContainerComponent],
  template: `
    <div class="flex min-h-screen flex-col bg-surface text-on-surface">
      <header class="glass sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800">
        <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div class="text-lg font-semibold text-primary" [attr.aria-live]="'polite'">{{ currentTitle() }}</div>
          <nav class="hidden gap-4 text-sm font-medium sm:flex">
            <ng-container *ngFor="let link of navLinks">
            <a
              *ngIf="link.label !== 'Add'"
              [routerLink]="link.path"
              routerLinkActive="text-primary"
              #rla="routerLinkActive"
              [routerLinkActiveOptions]="{ exact: link.path === '/' }"
              [attr.aria-current]="rla.isActive ? 'page' : null"
              class="transition hover:text-primary"
              >{{ link.label }}</a
            >
            </ng-container>
          </nav>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="info-btn inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/70 text-primary shadow-sm transition hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900/80"
              (click)="openTips()"
              aria-label="Tips & tour"
              [class.info-btn--pulse]="needsTipsAttention()"
            >
              <span aria-hidden="true" class="text-2xl leading-none font-serif">𝒊</span>
            </button>
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/70 text-base text-slate-600 shadow-sm transition hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300"
            (click)="toggleTheme()"
            [attr.aria-label]="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            <span *ngIf="isDark; else sun" aria-hidden="true">🌙</span>
            <ng-template #sun>🌞</ng-template>
          </button>
          </div>
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
      <div class="relative mx-auto max-w-5xl text-xs font-medium">
        <div class="flex items-center justify-between">
          <div class="flex w-1/2 justify-around pr-8">
            <ng-container *ngFor="let link of navLinks; let i = index">
              <a
                *ngIf="i < 2"
                [routerLink]="link.path"
                routerLinkActive="text-primary"
                #rla="routerLinkActive"
                [routerLinkActiveOptions]="{ exact: link.path === '/' }"
                [attr.aria-current]="rla.isActive ? 'page' : null"
                class="px-2 py-1 text-center transition hover:text-primary"
              >
                <span>{{ link.label }}</span>
              </a>
            </ng-container>
          </div>
          <div class="flex w-1/2 justify-around pl-8">
            <ng-container *ngFor="let link of navLinks; let i = index">
              <a
                *ngIf="i > 2"
                [routerLink]="link.path"
                routerLinkActive="text-primary"
                #rla="routerLinkActive"
                [routerLinkActiveOptions]="{ exact: link.path === '/' }"
                [attr.aria-current]="rla.isActive ? 'page' : null"
                class="px-2 py-1 text-center transition hover:text-primary"
              >
                <span>{{ link.label }}</span>
              </a>
            </ng-container>
          </div>
        </div>

        <a
          routerLink="/add-habit"
          class="absolute left-1/2 top-0 inline-flex h-14 w-14 -translate-y-6 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-2xl text-white shadow-lg transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          aria-label="Add new habit"
        >
          +
        </a>
      </div>
    </nav>

    <app-toast-container />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  private readonly habitService = inject(HabitService);
  private readonly logService = inject(LogService);
  private readonly devSeedService = inject(DevSeedService);
  private readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly onboarding = inject(OnboardingService);

    readonly navLinks: NavLink[] = [
    { label: 'Today', path: '/', icon: '\u{1F4C5}' },
    { label: 'Habits', path: '/habits', icon: '\u{1F4CB}' },
    { label: 'Add', path: '/add-habit', icon: '\u2795' },
    { label: 'Reports', path: '/reports', icon: '\u{1F4C8}' },
    { label: 'Settings', path: '/settings', icon: '\u2699' }
  ];

  readonly habitError = this.habitService.error;
  readonly logError = this.logService.error;
  get themeMode(): 'dark' | 'light' | 'system' | 'high-contrast' {
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
    this.updateTitle();
    this.router.events.subscribe(() => this.updateTitle());
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  openTips(): void {
    this.onboarding.openDashboardIntroNow();
    if (this.router.url !== '/') {
      void this.router.navigate(['/']);
    }
  }

  get isDark(): boolean {
    return this.themeService.isDark();
  }

  readonly currentTitle = signal<string>('');

  readonly needsTipsAttention = computed(() =>
    !this.onboarding.state().dashboardIntro || this.onboarding.dashboardIntroRequested()
  );

  private updateTitle(): void {
    const url = this.router.url || '/';
    if (url.startsWith('/habits/')) {
      this.currentTitle.set('Habit');
      return;
    }
    if (url.startsWith('/habits')) {
      this.currentTitle.set('Habits');
      return;
    }
    if (url.startsWith('/reports')) {
      this.currentTitle.set('Reports');
      return;
    }
    if (url.startsWith('/settings')) {
      this.currentTitle.set('Settings');
      return;
    }
    if (url.startsWith('/add-habit')) {
      this.currentTitle.set('Add');
      return;
    }
    this.currentTitle.set('Today');
  }

}





