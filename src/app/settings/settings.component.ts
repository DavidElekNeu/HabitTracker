import { AsyncPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReminderEntry, ReminderService } from '../core/services/reminder.service';
import { DailyMotivationNotificationService } from '../core/services/daily-motivation-notification.service';
import { MotivationalModeService } from '../core/services/motivational-mode.service';
import { ThemeService } from '../shared/services/theme.service';
import { GoalCompassService } from '../shared/services/goal-compass.service';
import { OnboardingService } from '../shared/services/onboarding.service';
import { AppLanguage, LanguageService } from '../shared/services/language.service';

type ThemeMode = 'light' | 'dark' | 'system' | 'high-contrast';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [NgIf, NgFor, AsyncPipe, NgClass, RouterLink, ReactiveFormsModule],
  template: `
    <section class="space-y-8">
      <p class="text-sm text-slate-500 dark:text-slate-300">
        Manage reminders, appearance, onboarding helpers, and data ownership.
      </p>

      <section class="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h2 class="text-lg font-semibold">Language</h2>
          <p class="text-sm text-slate-500 dark:text-slate-300">
            Choose the language used throughout the app, widgets, and notifications.
          </p>
        </div>
        <div class="grid grid-cols-2 gap-3" role="group" aria-label="Language">
          <button
            *ngFor="let option of languageOptions"
            type="button"
            class="rounded-xl border px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            [ngClass]="language() === option.value ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 dark:border-slate-700'"
            [attr.aria-pressed]="language() === option.value"
            (click)="setLanguage(option.value)"
          >
            <span aria-hidden="true">{{ option.flag }}</span> {{ option.label }}
          </button>
        </div>
      </section>

      <section data-tour="settings-onboarding" class="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 class="text-lg font-semibold">Onboarding</h2>
        <p class="text-sm text-slate-500 dark:text-slate-300">
          Replay the full guided walkthrough with arrows and feature descriptions.
        </p>
        <div class="flex justify-end">
          <button
            type="button"
            class="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300"
            (click)="runWalkthrough()"
          >
            Run full tutorial
          </button>
        </div>
      </section>

      <section class="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold">Motivational mode</h2>
            <p class="text-sm text-slate-500 dark:text-slate-300">
              When off, daily motivational notifications are disabled and Goal Compass does not appear on app startup.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            [attr.aria-checked]="motivationalModeEnabled()"
            class="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            [ngClass]="motivationalModeEnabled() ? 'border-primary bg-primary/20' : 'border-slate-300 bg-slate-200 dark:border-slate-700 dark:bg-slate-800'"
            (click)="toggleMotivationalMode()"
            aria-label="Toggle motivational mode"
          >
            <span
              class="inline-block h-5 w-5 rounded-full bg-white shadow-sm transition"
              [ngClass]="motivationalModeEnabled() ? 'translate-x-6' : 'translate-x-1'"
            ></span>
          </button>
        </div>
        <p class="text-xs font-medium" [ngClass]="motivationalModeEnabled() ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-300'">
          {{ motivationalModeEnabled() ? 'Enabled' : 'Disabled' }}
        </p>
      </section>

      <div
        *ngIf="statusMessage()"
        class="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200"
        role="status"
        aria-live="polite"
      >
        {{ statusMessage() }}
      </div>
      <div
        *ngIf="errorMessage()"
        class="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200"
        role="alert"
        aria-live="assertive"
      >
        {{ errorMessage() }}
      </div>

      <section class="space-y-4">
        <h2 class="text-lg font-semibold">Appearance</h2>
        <div class="flex flex-wrap gap-3">
          <button
            *ngFor="let option of themeOptions"
            type="button"
            class="rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            [ngClass]="themeMode === option.value ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200'"
            (click)="setTheme(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
        <div class="mt-3" *ngIf="false">
          <p class="mb-2 text-sm text-slate-500">Accent</p>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="h-8 w-8 rounded-full border" [ngClass]="accent === 'gold' ? 'ring-2 ring-primary/60' : ''" style="background-color:#d4a017" (click)="setAccent('gold')" aria-label="Accent: gold"></button>
            <button type="button" class="h-8 w-8 rounded-full border" [ngClass]="accent === 'blue' ? 'ring-2 ring-primary/60' : ''" style="background-color:#2563eb" (click)="setAccent('blue')" aria-label="Accent: blue"></button>
            <button type="button" class="h-8 w-8 rounded-full border" [ngClass]="accent === 'purple' ? 'ring-2 ring-primary/60' : ''" style="background-color:#7c3aed" (click)="setAccent('purple')" aria-label="Accent: purple"></button>
            <button type="button" class="h-8 w-8 rounded-full border" [ngClass]="accent === 'emerald' ? 'ring-2 ring-primary/60' : ''" style="background-color:#10b981" (click)="setAccent('emerald')" aria-label="Accent: green"></button>
            <button type="button" class="h-8 w-8 rounded-full border" [ngClass]="accent === 'rose' ? 'ring-2 ring-primary/60' : ''" style="background-color:#e11d48" (click)="setAccent('rose')" aria-label="Accent: red"></button>
            <button type="button" class="h-8 w-8 rounded-full border" [ngClass]="accent === 'orange' ? 'ring-2 ring-primary/60' : ''" style="background-color:#f97316" (click)="setAccent('orange')" aria-label="Accent: orange"></button>
          </div>
        </div>
      </section>

      <section class="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h2 class="text-lg font-semibold">Goal Compass</h2>
          <p class="text-sm text-slate-500 dark:text-slate-300">
            Update your direction anytime. The startup spinner appears only when values are saved.
          </p>
        </div>

        <form [formGroup]="goalCompassForm" (ngSubmit)="saveGoalCompass()" class="space-y-3">
          <label class="flex flex-col gap-2 text-sm font-medium">
            Goal name
            <input
              type="text"
              formControlName="goalName"
              placeholder="Build a healthier daily routine"
              class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
            />
          </label>

          <label class="flex flex-col gap-2 text-sm font-medium">
            Core why
            <textarea
              rows="2"
              formControlName="why"
              placeholder="Why does this matter now?"
              class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
            ></textarea>
          </label>

          <label class="flex flex-col gap-2 text-sm font-medium">
            Vision snapshot
            <textarea
              rows="2"
              formControlName="vision"
              placeholder="How does success look?"
              class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
            ></textarea>
          </label>

          <label class="flex flex-col gap-2 text-sm font-medium">
            Next main goal
            <textarea
              rows="2"
              formControlName="nextStep"
              placeholder="What is your next main goal step?"
              class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
            ></textarea>
          </label>

          <p *ngIf="goalCompassSubmitted() && goalCompassForm.invalid" class="text-xs font-semibold text-rose-500">
            Fill in all Goal Compass fields before saving.
          </p>

          <div class="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              class="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-rose-300 hover:text-rose-600 dark:border-slate-700 dark:text-slate-200 dark:hover:border-rose-700 dark:hover:text-rose-300"
              (click)="clearGoalCompass()"
            >
              Clear values
            </button>
            <button
              type="submit"
              class="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
            >
              Save Goal Compass
            </button>
          </div>
        </form>
      </section>

      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Reminders</h2>
          <button
            type="button"
            class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300"
            (click)="requestPermission()"
          >
            Request permission
          </button>
        </div>
        <p class="text-sm text-slate-500 dark:text-slate-300">
          Reminders keep habits top of mind. Adjust them below or create new ones when editing a habit.
        </p>

        <div *ngIf="reminders().length; else emptyReminders" class="space-y-3">
          <article
            *ngFor="let reminder of reminders()"
            class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ reminder.habitTitle }}</h3>
                <p class="text-xs text-slate-500 dark:text-slate-300">
                  {{ formatTime(reminder.schedule.time) }} &middot; {{ formatDays(reminder.schedule.daysOfWeek) }}
                </p>
              </div>
              <button
                type="button"
                class="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/60"
                (click)="disable(reminder)"
              >
                Disable
              </button>
            </div>
            <p class="text-xs text-slate-500" *ngIf="reminder.schedule.persistent">
              Persistent reminders will repeat until the habit is logged each day.
            </p>
          </article>
        </div>

        <ng-template #emptyReminders>
          <div class="space-y-3 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
            <p>No active reminders. Enable them when creating or editing a habit to get notified.</p>
            <a routerLink="/add-habit" class="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">Create reminder</a>
          </div>
        </ng-template>
      </section>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly reminderService = inject(ReminderService);
  private readonly dailyMotivationNotificationService = inject(DailyMotivationNotificationService);
  private readonly motivationalModeService = inject(MotivationalModeService);
  private readonly themeService = inject(ThemeService);
  private readonly goalCompassService = inject(GoalCompassService);
  private readonly onboardingService = inject(OnboardingService);
  private readonly languageService = inject(LanguageService);
  private readonly router = inject(Router);

  readonly reminders = this.reminderService.reminders;
  readonly motivationalModeEnabled = this.motivationalModeService.enabled;
  readonly language = this.languageService.language;
  readonly languageOptions: Array<{ value: AppLanguage; label: string; flag: string }> = [
    { value: 'hu', label: 'Hungarian', flag: '🇭🇺' },
    { value: 'en', label: 'English', flag: '🇬🇧' }
  ];
  readonly themeOptions: Array<{ value: ThemeMode; label: string }> = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' }
  ];

  readonly statusMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly goalCompassSubmitted = signal(false);

  readonly goalCompassForm = this.fb.nonNullable.group({
    goalName: ['', Validators.required],
    why: ['', Validators.required],
    vision: ['', Validators.required],
    nextStep: ['', Validators.required]
  });

  constructor() {
    const profile = this.goalCompassService.profile();
    if (!profile) {
      return;
    }
    this.goalCompassForm.patchValue({
      goalName: profile.goalName,
      why: profile.why,
      vision: profile.vision,
      nextStep: profile.nextStep
    });
  }

  get themeMode(): ThemeMode {
    return this.themeService.mode();
  }

  setTheme(mode: ThemeMode): void {
    this.themeService.setMode(mode);
  }

  setLanguage(language: AppLanguage): void {
    this.languageService.setLanguage(language);
  }

  get accent(): string {
    return this.themeService.accent();
  }

  setAccent(accent: any): void {
    this.themeService.setAccent(accent);
  }

  disable(reminder: ReminderEntry): void {
    this.reminderService.disableReminder(reminder.habitId);
  }

  async requestPermission(): Promise<void> {
    const permission = await this.reminderService.requestPermission();
    if (permission === 'granted') {
      this.errorMessage.set(null);
      this.statusMessage.set('Notification permission granted. Daily motivation and habit reminders can be scheduled.');
      await this.dailyMotivationNotificationService.refreshSchedule();
      return;
    }

    this.statusMessage.set(null);
    this.errorMessage.set('Notification permission is blocked. Enable notifications for StriveUp in browser or app settings.');
  }

  runWalkthrough(): void {
    this.onboardingService.openDashboardIntroNow();
    void this.router.navigate(['/']);
  }

  async toggleMotivationalMode(): Promise<void> {
    const next = !this.motivationalModeEnabled();
    this.motivationalModeService.setEnabled(next);
    this.errorMessage.set(null);

    if (next) {
      const permission = await this.reminderService.requestPermission();
      if (permission === 'granted') {
        this.statusMessage.set(
          'Motivational mode enabled. Daily motivation notifications and startup Goal Compass are active.'
        );
      } else {
        this.statusMessage.set(
          'Motivational mode enabled. Startup Goal Compass is active, but notifications require permission.'
        );
        this.errorMessage.set(
          'Daily motivation notifications are blocked. Tap "Request permission" and allow notifications for StriveUp.'
        );
      }
    } else {
      this.statusMessage.set('Motivational mode disabled. Daily motivation notifications and startup Goal Compass are off.');
    }

    await this.dailyMotivationNotificationService.refreshSchedule();
  }

  saveGoalCompass(): void {
    this.goalCompassSubmitted.set(true);
    this.goalCompassForm.markAllAsTouched();

    if (this.goalCompassForm.invalid) {
      this.statusMessage.set(null);
      this.errorMessage.set('Goal Compass was not saved. Fill in goal name and every field.');
      return;
    }

    const saved = this.goalCompassService.saveProfile(this.goalCompassForm.getRawValue());
    if (!saved) {
      this.statusMessage.set(null);
      this.errorMessage.set('Goal Compass was not saved. Fill in goal name and every field.');
      return;
    }

    this.errorMessage.set(null);
    this.statusMessage.set('Goal Compass updated. Spinner animation now uses your new goal.');
  }

  clearGoalCompass(): void {
    this.goalCompassService.clearProfile({ markSetupSkipped: true });
    this.goalCompassSubmitted.set(false);
    this.goalCompassForm.reset({
      goalName: '',
      why: '',
      vision: '',
      nextStep: ''
    });
    this.errorMessage.set(null);
    this.statusMessage.set('Goal Compass cleared. Startup spinner is hidden until values are saved again.');
  }

  formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(Number(hours), Number(minutes));
    return date.toLocaleTimeString(this.language() === 'hu' ? 'hu-HU' : 'en-US', { hour: 'numeric', minute: '2-digit' });
  }

  formatDays(days: number[]): string {
    if (!days.length || days.length === 7) {
      return this.language() === 'hu' ? 'Minden nap' : 'Every day';
    }
    const labels = this.language() === 'hu'
      ? ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map((day) => labels[day] ?? '').join(', ');
  }
}

