import { DatePipe, DecimalPipe, NgFor, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault, TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Habit } from '../../../data/models/habit.model';
import { HabitLog } from '../../../data/models/log.model';

@Component({
  selector: 'app-habit-today-card',
  standalone: true,
  imports: [NgIf, NgFor, NgSwitch, NgSwitchCase, NgSwitchDefault, DatePipe, DecimalPipe, TitleCasePipe],
  template: `
    <article
      class="relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition dark:border-slate-700 dark:bg-slate-800/80"
      [class.opacity-70]="!isDue"
    >
      <header class="flex items-start justify-between gap-3">
        <div class="flex items-start gap-3">
          <div *ngIf="habit.icon" class="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-xl" aria-hidden="true">
            {{ habit.icon }}
          </div>
          <div>
            <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-50">{{ habit.title }}</h2>
            <p class="text-sm text-slate-500 dark:text-slate-300" *ngIf="habit.description">
              {{ habit.description }}
            </p>
          </div>
        </div>
        <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {{ habit.type | titlecase }}
        </span>
      </header>

      <section class="mt-4 text-xs text-slate-500 dark:text-slate-300">
        <ng-container *ngIf="todayLog; else notLogged">
          Logged {{ todayLog?.date | date: 'shortTime' }} ·
          <span class="font-semibold text-emerald-600 dark:text-emerald-400">
            {{ displayValue(todayLog?.value) }}
          </span>
        </ng-container>
        <ng-template #notLogged>
          Not logged yet today
        </ng-template>
      </section>

      <footer class="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div class="flex items-center gap-2 text-xs font-medium text-slate-400 dark:text-slate-500">
          <span>Streak: {{ streak }} day{{ streak === 1 ? '' : 's' }}</span>
          <span *ngIf="streak >= 7" class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
            🏅 {{ streak >= 30 ? 'Legend' : streak >= 14 ? 'On fire' : 'Great run' }}
          </span>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ng-container [ngSwitch]="habit.type">
            <button
              *ngSwitchCase="'binary'"
              type="button"
              class="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-primary hover:text-white active:scale-95 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-primary-dark"
              (click)="handleToggle()"
              [attr.aria-pressed]="todayLog ? 'true' : 'false'"
              [attr.aria-label]="todayLog ? 'Undo completion for ' + habit.title : 'Mark ' + habit.title + ' as done'"
            >
              <span *ngIf="!todayLog">Mark done</span>
              <span *ngIf="todayLog">Undo</span>
            </button>

            <ng-container *ngSwitchDefault>
              <div *ngIf="quickChips?.length" class="flex items-center gap-2">
                <button
                  *ngFor="let chip of quickChips"
                  type="button"
                  class="inline-flex items-center rounded-full border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary active:scale-95 dark:border-slate-700 dark:text-slate-300"
                  (click)="handleIncrement(chip)"
                  [attr.aria-label]="'Add ' + chip + (habit.units ? ' ' + habit.units : '') + ' to ' + habit.title"
                >
                  +{{ chip }}
                </button>
              </div>

              <button
                type="button"
                class="inline-flex items-center rounded-full bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark active:scale-95"
                (click)="handleIncrement(incrementStep)"
                [attr.aria-label]="'Add ' + incrementStep + (habit.units ? ' ' + habit.units : '') + ' to ' + habit.title"
              >
                +{{ incrementStep | number: '1.0-1' }}
                <span *ngIf="habit.units" class="ml-1 text-xs font-medium">{{ habit.units }}</span>
              </button>

              <button
                type="button"
                class="inline-flex items-center rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold shadow-sm transition hover:bg-slate-100 active:scale-95 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                (click)="logDetail.emit()"
                aria-haspopup="dialog"
                [attr.aria-label]="'Open detailed logging for ' + habit.title"
              >
                More
              </button>

              <button
                type="button"
                class="inline-flex items-center rounded-full border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-500 transition hover:bg-rose-50 active:scale-95 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/60 disabled:pointer-events-none disabled:opacity-50"
                (click)="reset.emit()"
                [disabled]="!todayLog"
                [attr.aria-label]="'Reset today\\'s progress for ' + habit.title"
              >
                Reset
              </button>
            </ng-container>
          </ng-container>
        </div>
      </footer>

      <div *ngIf="progressLabel" class="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        {{ progressLabel }}
      </div>

      <div *ngIf="celebrating" class="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <span
          *ngFor="let piece of confettiPieces"
          class="absolute animate-fade text-lg"
          [style.left.%]="piece.left"
          [style.bottom.%]="piece.bottom"
          [style.animationDelay]="piece.delay"
        >
          {{ piece.icon }}
        </span>
      </div>
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HabitTodayCardComponent {
  @Input({ required: true }) habit!: Habit;
  @Input() todayLog?: HabitLog;
  @Input() streak = 0;
  @Input() incrementStep = 1;
  @Input() progressLabel?: string;
  @Input() isDue = true;
  @Input() celebrating = false;
  @Input() quickChips: number[] = [];

  @Output() toggle = new EventEmitter<void>();
  @Output() increment = new EventEmitter<number>();
  @Output() reset = new EventEmitter<void>();
  @Output() logDetail = new EventEmitter<void>();

  readonly confettiPieces = [
    { left: 15, bottom: 10, icon: '✨', delay: '0s' },
    { left: 40, bottom: 20, icon: '🎉', delay: '0.05s' },
    { left: 65, bottom: 15, icon: '🥳', delay: '0.1s' },
    { left: 85, bottom: 25, icon: '✨', delay: '0.15s' }
  ];

  displayValue(value: HabitLog['value'] | undefined): string {
    if (typeof value === 'boolean') {
      return value ? 'Completed' : 'Missed';
    }
    if (typeof value === 'number') {
      return this.habit.units ? `${value} ${this.habit.units}` : `${value}`;
    }
    return '';
  }

  handleToggle(): void {
    this.vibrate();
    this.toggle.emit();
  }

  handleIncrement(amount: number): void {
    this.vibrate();
    this.increment.emit(amount);
  }

  private vibrate(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate?.(15);
    }
  }
}
