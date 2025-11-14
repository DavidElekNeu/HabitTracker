import { AsyncPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReminderEntry, ReminderService } from '../core/services/reminder.service';
import { ThemeService } from '../shared/services/theme.service';

type ThemeMode = 'light' | 'dark' | 'system' | 'high-contrast';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [NgIf, NgFor, AsyncPipe, NgClass, RouterLink],
  template: `
    <section class="space-y-8">
      <p class="text-sm text-slate-500 dark:text-slate-300">
        Manage reminders, appearance, onboarding helpers, and data ownership.
      </p>

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
            <button type="button" class="h-8 w-8 rounded-full border" [ngClass]="accent === 'gold' ? 'ring-2 ring-primary/60' : ''" style="background-color:#d4a017" (click)="setAccent('gold')" aria-label="Accent: arany"></button>
            <button type="button" class="h-8 w-8 rounded-full border" [ngClass]="accent === 'blue' ? 'ring-2 ring-primary/60' : ''" style="background-color:#2563eb" (click)="setAccent('blue')" aria-label="Accent: kék"></button>
            <button type="button" class="h-8 w-8 rounded-full border" [ngClass]="accent === 'purple' ? 'ring-2 ring-primary/60' : ''" style="background-color:#7c3aed" (click)="setAccent('purple')" aria-label="Accent: lila"></button>
            <button type="button" class="h-8 w-8 rounded-full border" [ngClass]="accent === 'emerald' ? 'ring-2 ring-primary/60' : ''" style="background-color:#10b981" (click)="setAccent('emerald')" aria-label="Accent: zöld"></button>
            <button type="button" class="h-8 w-8 rounded-full border" [ngClass]="accent === 'rose' ? 'ring-2 ring-primary/60' : ''" style="background-color:#e11d48" (click)="setAccent('rose')" aria-label="Accent: piros"></button>
            <button type="button" class="h-8 w-8 rounded-full border" [ngClass]="accent === 'orange' ? 'ring-2 ring-primary/60' : ''" style="background-color:#f97316" (click)="setAccent('orange')" aria-label="Accent: narancs"></button>
          </div>
        </div>
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
  private readonly reminderService = inject(ReminderService);
  private readonly themeService = inject(ThemeService);

  readonly reminders = this.reminderService.reminders;
  readonly themeOptions: Array<{ value: ThemeMode; label: string }> = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' }
  ];

  readonly statusMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  get themeMode(): ThemeMode {
    return this.themeService.mode();
  }

  setTheme(mode: ThemeMode): void {
    this.themeService.setMode(mode);
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
    await this.reminderService.requestPermission();
  }

  formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(Number(hours), Number(minutes));
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  formatDays(days: number[]): string {
    if (!days.length || days.length === 7) {
      return 'Every day';
    }
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map((day) => labels[day] ?? '').join(', ');
  }
}

