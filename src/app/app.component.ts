import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  AfterViewInit,
  ElementRef,
  computed,
  inject,
  signal
} from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HabitService } from './core/services/habit.service';
import { LogService } from './core/services/log.service';
import { DevSeedService } from './core/services/dev-seed.service';
import { DailyMotivationNotificationService } from './core/services/daily-motivation-notification.service';
import { MotivationalModeService } from './core/services/motivational-mode.service';
import { AndroidWidgetSyncService } from './core/services/android-widget-sync.service';
import { ThemeService } from './shared/services/theme.service';
import { OnboardingService } from './shared/services/onboarding.service';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { GoalCompassFormComponent } from './strategy/forms/goal-compass-form.component';
import { GoalCompassSpinnerComponent } from './shared/components/goal-compass-spinner/goal-compass-spinner.component';
import { GoalCompassService } from './shared/services/goal-compass.service';
import { TutorialSampleHabitsService } from './shared/services/tutorial-sample-habits.service';
import { GuidedTourOverlayComponent } from './shared/components/guided-tour-overlay/guided-tour-overlay.component';
import { AppLaunchIntroComponent } from './shared/components/app-launch-intro/app-launch-intro.component';
import { LanguageService } from './shared/services/language.service';

interface NavLink {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ReactiveFormsModule,
    GoalCompassFormComponent,
    GoalCompassSpinnerComponent,
    GuidedTourOverlayComponent,
    AppLaunchIntroComponent,
    NgFor,
    NgIf,
    ToastContainerComponent
  ],
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
              [attr.data-tour]="
                link.path === '/'
                  ? 'nav-today'
                  : link.path === '/habits'
                    ? 'nav-habits'
                    : link.path === '/reports'
                      ? 'nav-reports'
                      : link.path === '/settings'
                        ? 'nav-settings'
                        : null
              "
              class="transition hover:text-primary"
              >{{ link.label }}</a
            >
            </ng-container>
          </nav>
        </div>
      </header>

      <main class="mobile-main-safe flex-1 px-4 py-6">
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

    <nav class="mobile-bottom-nav glass fixed bottom-0 left-0 right-0 border-t border-slate-200 px-4 py-3 shadow-lg shadow-slate-900/5 sm:hidden dark:border-slate-800">
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
                [attr.data-tour]="
                  link.path === '/'
                    ? 'nav-today'
                    : link.path === '/habits'
                      ? 'nav-habits'
                      : null
                "
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
                [attr.data-tour]="
                  link.path === '/reports'
                    ? 'nav-reports'
                    : link.path === '/settings'
                      ? 'nav-settings'
                      : null
                "
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
          data-tour="nav-add"
        >
          +
        </a>
      </div>
    </nav>

    <app-toast-container />
    <app-app-launch-intro *ngIf="showLaunchIntro()"></app-app-launch-intro>
    <app-guided-tour-overlay *ngIf="showFullWalkthrough()"></app-guided-tour-overlay>

    <section
      *ngIf="showGoalCompassEditor()"
      class="fixed inset-0 z-[120] flex items-center justify-center bg-[#120c07] px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-label="Goal Compass setup"
    >
      <article class="w-full max-w-3xl rounded-3xl border border-amber-800/60 bg-[#23190f]/95 p-6 shadow-2xl shadow-amber-900/25">
        <header class="mb-4 space-y-2 text-amber-100">
          <h2 class="text-2xl font-semibold text-amber-100">Your better life begins with one clear direction.</h2>
          <p class="text-xs text-amber-200/80">
            Fill in Goal Compass now, or skip and continue. You can update these values later from Settings.
          </p>
        </header>

        <app-goal-compass-form [form]="goalCompassForm"></app-goal-compass-form>

        <p *ngIf="showGoalCompassValidation()" class="mt-3 text-xs font-semibold text-rose-300">
          Fill in Goal name, Core why, Vision snapshot, and Next main goal step to continue.
        </p>

        <div class="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            class="rounded-full border border-amber-300/50 px-5 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/10"
            (click)="skipGoalCompassSetup()"
          >
            Skip for now
          </button>
          <button
            type="button"
            class="rounded-full bg-amber-400 px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-300"
            (click)="saveGoalCompassProfile()"
          >
            Save and continue
          </button>
        </div>
      </article>
    </section>

    <section
      *ngIf="motivationalModeEnabled() && showUnlockSpinner()"
      class="fixed inset-0 z-[130] bg-[#120c07]"
      aria-live="polite"
    >
      <app-goal-compass-spinner mode="intro" [profile]="goalCompassProfile()"></app-goal-compass-spinner>
    </section>

    <section
      *ngIf="motivationalModeEnabled() && showMotivationSpinner() && !showGoalCompassEditor() && !showUnlockSpinner()"
      class="fixed inset-0 z-[125] bg-[#120c07]/95"
      aria-live="polite"
    >
      <app-goal-compass-spinner mode="motivation" [profile]="goalCompassProfile()"></app-goal-compass-spinner>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly habitService = inject(HabitService);
  private readonly logService = inject(LogService);
  private readonly devSeedService = inject(DevSeedService);
  private readonly dailyMotivationNotificationService = inject(DailyMotivationNotificationService);
  private readonly motivationalModeService = inject(MotivationalModeService);
  private readonly androidWidgetSyncService = inject(AndroidWidgetSyncService);
  private readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly onboarding = inject(OnboardingService);
  private readonly goalCompassService = inject(GoalCompassService);
  private readonly tutorialSampleHabits = inject(TutorialSampleHabitsService);
  private readonly languageService = inject(LanguageService);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly goalCompassSpinnerDurationMs = 6700;
  private readonly goalCompassLastBackgroundAtKey = 'habit-tracker-goal-compass-last-background-at';
  private readonly goalCompassReopenWindowMs = 5 * 60 * 1000;
  private readonly appLaunchDurationMs = 2300;
  private unlockTimer: ReturnType<typeof setTimeout> | null = null;
  private motivationTimer: ReturnType<typeof setTimeout> | null = null;
  private launchIntroTimer: ReturnType<typeof setTimeout> | null = null;

  readonly goalCompassProfile = this.goalCompassService.profile;
  readonly goalCompassSetupSkipped = this.goalCompassService.setupSkipped;
  readonly motivationalModeEnabled = this.motivationalModeService.enabled;
  readonly showLaunchIntro = signal(false);
  readonly showUnlockSpinner = signal(false);
  readonly showMotivationSpinner = signal(false);
  readonly goalCompassSubmitted = signal(false);

  readonly goalCompassForm = this.fb.nonNullable.group({
    goalName: ['', Validators.required],
    why: ['', Validators.required],
    vision: ['', Validators.required],
    nextStep: ['', Validators.required]
  });

  readonly showGoalCompassValidation = computed(
    () => this.goalCompassSubmitted() && this.goalCompassForm.invalid
  );

  readonly navLinks: NavLink[] = [
    { label: 'Today', path: '/', icon: '\u{1F4C5}' },
    { label: 'Habits', path: '/habits', icon: '\u{1F4CB}' },
    { label: 'Add', path: '/add-habit', icon: '\u2795' },
    { label: 'Reports', path: '/reports', icon: '\u{1F4C8}' },
    { label: 'Settings', path: '/settings', icon: '\u2699' }
  ];

  readonly habitError = this.habitService.error;
  readonly logError = this.logService.error;

  async ngOnInit(): Promise<void> {
    document.addEventListener('visibilitychange', this.handleGoalCompassVisibilityChange);

    // Ensure system/light/dark class is applied immediately on app startup.
    void this.themeService.mode();
    void this.dailyMotivationNotificationService.refreshSchedule();
    this.bootstrapAppLaunchIntro();
    this.bootstrapGoalCompassFlow();

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

    try {
      await this.cleanupTutorialSamplesIfTutorialInactive();
    } catch (error) {
      console.error(error);
    }

    await this.devSeedService.ensureSeedData();
    await this.androidWidgetSyncService.initialize();
    this.updateTitle();
    this.router.events.subscribe(() => this.updateTitle());
  }

  ngAfterViewInit(): void {
    this.languageService.connect(this.elementRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.languageService.disconnect();
    document.removeEventListener('visibilitychange', this.handleGoalCompassVisibilityChange);

    if (this.launchIntroTimer) {
      clearTimeout(this.launchIntroTimer);
      this.launchIntroTimer = null;
    }
    if (this.unlockTimer) {
      clearTimeout(this.unlockTimer);
      this.unlockTimer = null;
    }
    if (this.motivationTimer) {
      clearTimeout(this.motivationTimer);
      this.motivationTimer = null;
    }
  }

  readonly currentTitle = signal<string>('');
  readonly showGoalCompassEditor = computed(
    () =>
      this.motivationalModeEnabled() &&
      !this.goalCompassProfile() &&
      !this.showLaunchIntro() &&
      !this.showUnlockSpinner() &&
      !this.showMotivationSpinner() &&
      this.onboarding.state().fullWalkthrough &&
      !this.onboarding.dashboardIntroRequested() &&
      !this.goalCompassSetupSkipped()
  );

  readonly showFullWalkthrough = computed(
    () =>
      !this.showLaunchIntro() &&
      !this.showUnlockSpinner() &&
      !this.showMotivationSpinner() &&
      (!this.onboarding.state().fullWalkthrough || this.onboarding.dashboardIntroRequested())
  );

  saveGoalCompassProfile(): void {
    this.goalCompassSubmitted.set(true);
    this.goalCompassForm.markAllAsTouched();

    if (this.goalCompassForm.invalid) {
      return;
    }

    const saved = this.goalCompassService.saveProfile(this.goalCompassForm.getRawValue());
    if (!saved) {
      return;
    }

    this.showUnlockSpinner.set(true);
    this.showMotivationSpinner.set(false);

    if (this.unlockTimer) {
      clearTimeout(this.unlockTimer);
    }

    this.unlockTimer = setTimeout(() => {
      this.showUnlockSpinner.set(false);
      this.unlockTimer = null;
    }, this.goalCompassSpinnerDurationMs);
  }

  skipGoalCompassSetup(): void {
    this.goalCompassService.skipSetup();
    this.goalCompassSubmitted.set(false);
    this.goalCompassForm.markAsPristine();
    this.goalCompassForm.markAsUntouched();
  }

  private bootstrapGoalCompassFlow(): void {
    if (!this.motivationalModeEnabled()) {
      this.showUnlockSpinner.set(false);
      this.showMotivationSpinner.set(false);
      return;
    }

    const profile = this.goalCompassProfile();

    if (profile) {
      this.goalCompassForm.patchValue(
        {
          goalName: profile.goalName,
          why: profile.why,
          vision: profile.vision,
          nextStep: profile.nextStep
        },
        { emitEvent: false }
      );
      const shouldShowMotivationSpinner = this.shouldShowMotivationSpinnerOnLaunch();
      this.showUnlockSpinner.set(false);
      this.showMotivationSpinner.set(shouldShowMotivationSpinner);
      if (!shouldShowMotivationSpinner) {
        return;
      }
      if (this.motivationTimer) {
        clearTimeout(this.motivationTimer);
      }
      this.motivationTimer = setTimeout(() => {
        this.showMotivationSpinner.set(false);
        this.motivationTimer = null;
      }, this.goalCompassSpinnerDurationMs);
      return;
    }

    this.showUnlockSpinner.set(false);
    this.showMotivationSpinner.set(false);
  }

  private bootstrapAppLaunchIntro(): void {
    if (this.onboarding.state().startupAnimationSeen) {
      this.showLaunchIntro.set(false);
      return;
    }

    this.showLaunchIntro.set(true);
    this.onboarding.markStartupAnimationSeen();

    if (this.launchIntroTimer) {
      clearTimeout(this.launchIntroTimer);
    }

    this.launchIntroTimer = setTimeout(() => {
      this.showLaunchIntro.set(false);
      this.launchIntroTimer = null;
    }, this.appLaunchDurationMs);
  }

  private shouldShowMotivationSpinnerOnLaunch(): boolean {
    const lastBackgroundAt = this.consumeLastGoalCompassBackgroundAt();
    if (lastBackgroundAt === null) {
      return true;
    }
    return Date.now() - lastBackgroundAt > this.goalCompassReopenWindowMs;
  }

  private consumeLastGoalCompassBackgroundAt(): number | null {
    try {
      const raw = localStorage.getItem(this.goalCompassLastBackgroundAtKey);
      localStorage.removeItem(this.goalCompassLastBackgroundAtKey);
      if (!raw) {
        return null;
      }
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private readonly handleGoalCompassVisibilityChange = (): void => {
    if (document.visibilityState !== 'hidden') {
      return;
    }

    try {
      localStorage.setItem(this.goalCompassLastBackgroundAtKey, `${Date.now()}`);
    } catch {
      // Ignore storage write failures.
    }
  };

  private async cleanupTutorialSamplesIfTutorialInactive(): Promise<void> {
    const onboardingState = this.onboarding.state();
    const tutorialActive = !onboardingState.fullWalkthrough || this.onboarding.dashboardIntroRequested();
    if (tutorialActive) {
      return;
    }
    await this.tutorialSampleHabits.removeAll();
  }

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






