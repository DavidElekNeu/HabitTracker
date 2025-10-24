import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { ReminderEntry, ReminderService } from '../core/services/reminder.service';
import { ThemeService } from '../shared/services/theme.service';
import { OnboardingService } from '../shared/services/onboarding.service';
import { DataTransferService } from '../core/services/data-transfer.service';
import { SyncService } from '../core/services/sync.service';

type ThemeMode = 'light' | 'dark' | 'system';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [NgIf, NgFor, AsyncPipe],
  template: `
    <section class="space-y-8">
      <header>
        <h1 class="text-2xl font-semibold">Settings</h1>
        <p class="text-sm text-slate-500 dark:text-slate-300">
          Manage reminders, appearance, onboarding helpers, and data ownership.
        </p>
      </header>

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
                  {{ formatTime(reminder.schedule.time) }} · {{ formatDays(reminder.schedule.daysOfWeek) }}
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
          <div class="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
            No active reminders. Enable them when creating or editing a habit to get notified.
          </div>
        </ng-template>
      </section>

      <section class="space-y-4">
        <h2 class="text-lg font-semibold">Onboarding</h2>
        <p class="text-sm text-slate-500 dark:text-slate-300">
          Need a refresher? Bring back the dashboard walkthrough any time.
        </p>
        <button
          type="button"
          class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300"
          (click)="showTipsNow()"
        >
          Show dashboard tips now
        </button>
      </section>

      <section class="space-y-4">
        <h2 class="text-lg font-semibold">Data management</h2>
        <p class="text-sm text-slate-500 dark:text-slate-300">
          Export your data for safekeeping or import a previous backup. Clearing data removes all habits and logs from this device.
        </p>
        <div class="flex flex-wrap gap-3">
          <button
            type="button"
            class="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
            (click)="exportData()"
          >
            Export JSON
          </button>
          <button
            type="button"
            class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300"
            (click)="triggerImport()"
          >
            Import JSON
          </button>
          <button
            type="button"
            class="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/60"
            (click)="clearAllData()"
          >
            Clear all data
          </button>
        </div>
        <input
          #importInput
          type="file"
          accept="application/json"
          class="hidden"
          (change)="onFileSelected($event)"
        />
      </section>

      <section class="space-y-4">
        <h2 class="text-lg font-semibold">Privacy & future sync</h2>
        <div class="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <p class="font-semibold text-slate-800 dark:text-slate-100">Your data stays on this device</p>
          <ul class="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-slate-500 dark:text-slate-300">
            <li>Habits and logs live in IndexedDB and never leave the browser unless you export them.</li>
            <li>Reminders rely on device notifications; you can disable them anytime from this page.</li>
            <li>Review the upcoming sync plan in <code>docs/future-roadmap.md</code> before opting into cloud backup when it launches.</li>
          </ul>
        </div>

        <div class="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
          <header class="flex items-center justify-between">
            <div>
              <p class="font-semibold text-slate-800 dark:text-slate-100">Sync (coming soon)</p>
              <p class="text-xs text-slate-500 dark:text-slate-300">
                We're preparing optional encrypted backup to your provider of choice. Opt-in below to preview the workflow.
              </p>
            </div>
            <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800">Preview</span>
          </header>

          <div class="mt-3 flex flex-wrap items-center gap-3 text-xs">
            <button
              type="button"
              class="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-500 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300"
              (click)="previewSync('Drive')"
            >
              Connect Drive
            </button>
            <button
              type="button"
              class="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-500 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300"
              (click)="previewSync('Dropbox')"
            >
              Connect Dropbox
            </button>
            <button
              type="button"
              class="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-500 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300"
              (click)="previewSync('WebDAV')"
            >
              Connect WebDAV
            </button>
            <button
              type="button"
              class="rounded-full border border-rose-200 px-3 py-1 font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/60"
              (click)="disableSync()"
              [disabled]="!syncStatus().enabled"
            >
              Disable
            </button>
          </div>

          <div class="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            <p *ngIf="syncStatus().enabled; else syncDisabled">
              Sync preview enabled via {{ syncStatus().provider }}. Last simulated sync: {{ syncStatus().lastSync | date: 'medium' }}.
            </p>
            <ng-template #syncDisabled>
              <p>Sync preview disabled. Enable one of the providers above to simulate the upcoming workflow.</p>
            </ng-template>
          </div>
        </div>
      </section>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsComponent {
  private readonly reminderService = inject(ReminderService);
  private readonly themeService = inject(ThemeService);
  private readonly onboardingService = inject(OnboardingService);
  private readonly dataTransferService = inject(DataTransferService);
  private readonly syncService = inject(SyncService);

  readonly reminders = this.reminderService.reminders;
  readonly themeOptions: Array<{ value: ThemeMode; label: string }> = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' }
  ];

  readonly statusMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly syncStatus = this.syncService.status;

  @ViewChild('importInput', { static: false }) importInput?: ElementRef<HTMLInputElement>;

  get themeMode(): ThemeMode {
    return this.themeService.mode();
  }

  setTheme(mode: ThemeMode): void {
    this.themeService.setMode(mode);
  }

  disable(reminder: ReminderEntry): void {
    this.reminderService.disableReminder(reminder.habitId);
  }

  async requestPermission(): Promise<void> {
    await this.reminderService.requestPermission();
  }

  showTipsNow(): void {
    this.onboardingService.openDashboardIntroNow();
    this.setStatus('Dashboard tips will appear immediately.');
  }

  async exportData(): Promise<void> {
    try {
      const blob = await this.dataTransferService.exportData();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `habit-tracker-export-${new Date().toISOString()}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      this.setStatus('Export generated successfully.');
    } catch (error) {
      this.setError('Failed to export data.');
      console.error(error);
    }
  }

  triggerImport(): void {
    this.importInput?.nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    try {
      const content = await file.text();
      await this.dataTransferService.importData(content);
      this.setStatus('Import completed.');
    } catch (error) {
      this.setError('Import failed. Please verify the file.');
      console.error(error);
    } finally {
      input.value = '';
    }
  }

  async clearAllData(): Promise<void> {
    if (!confirm('This will erase all habits and logs. Continue?')) {
      return;
    }
    try {
      await this.dataTransferService.clearAllData();
      this.setStatus('All data cleared.');
    } catch (error) {
      this.setError('Failed to clear data.');
      console.error(error);
    }
  }

  async previewSync(provider: string): Promise<void> {
    try {
      await this.syncService.enable(provider);
      this.setStatus(`Sync preview enabled with ${provider}.`);
    } catch (error) {
      this.setError('Unable to enable sync preview.');
      console.error(error);
    }
  }

  async disableSync(): Promise<void> {
    await this.syncService.disable();
    this.setStatus('Sync preview disabled.');
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

  private setStatus(message: string): void {
    this.statusMessage.set(message);
    this.errorMessage.set(null);
    setTimeout(() => this.statusMessage.set(null), 4000);
  }

  private setError(message: string): void {
    this.errorMessage.set(message);
    this.statusMessage.set(null);
    setTimeout(() => this.errorMessage.set(null), 6000);
  }
}
