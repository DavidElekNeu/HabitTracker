import { DecimalPipe, NgFor, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault, TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Habit } from '../../../data/models/habit.model';
import { HabitLog } from '../../../data/models/log.model';
import { ProgressBarComponent } from '../../../shared/components/progress-bar/progress-bar.component';
import { LogService } from '../../../core/services/log.service';
import { getHabitPeriodTarget } from '../../../core/utils/habit-utils';
import { LocalizedDatePipe } from '../../../shared/pipes/localized-date.pipe';

@Component({
  selector: 'app-habit-today-card',
  standalone: true,
  imports: [NgIf, NgFor, NgSwitch, NgSwitchCase, NgSwitchDefault, LocalizedDatePipe, DecimalPipe, TitleCasePipe, ProgressBarComponent],
  template: `
    <article
      class="relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition dark:border-slate-700 dark:bg-slate-800/80"
      [class.opacity-70]="!isDue"
    >
      <header class="flex items-start justify-between gap-3">
        <div class="flex items-start gap-3">
          <div *ngIf="habit.icon" class="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-xl" aria-hidden="true">
            {{ habit.icon }}
          </div>
          <div>
            <h2 class="text-base font-semibold text-slate-900 dark:text-slate-50">{{ habit.title }}</h2>
            <p class="text-xs text-slate-500 dark:text-slate-300" *ngIf="habit.description">
              {{ habit.description }}
            </p>
          </div>
        </div>
        <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {{ habit.type | titlecase }}
        </span>
      </header>
      <div *ngIf="chainLinkCount > 0" class="mt-2">
        <span class="inline-flex items-center rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
          Chain · {{ chainLinkCount }} link{{ chainLinkCount === 1 ? '' : 's' }}
        </span>
      </div>

      <section class="mt-2 text-xs text-slate-500 dark:text-slate-300">
        <ng-container *ngIf="todayLog; else notLogged">
          Logged {{ todayLog?.date | localizedDate: 'shortTime' }}
          <span *ngIf="displayValue(todayLog?.value)" class="mx-1">·</span>
          <span class="font-semibold text-emerald-600 dark:text-emerald-400">
            {{ displayValue(todayLog?.value) }}
          </span>
        </ng-container>
        <ng-template #notLogged>
          No entry yet today
        </ng-template>
      </section>

      <footer class="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        <div class="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">
          <span>Streak: {{ streak }} day{{ streak === 1 ? '' : 's' }}</span>
          <span *ngIf="streak >= 7" class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
            🏅 {{ streak >= 30 ? 'Legend' : streak >= 14 ? 'On fire' : 'Great run' }}
          </span>
        </div>

        <div class="flex flex-wrap items-center gap-1.5">
          <ng-container [ngSwitch]="habit.type">
            <button
              *ngSwitchCase="'binary'"
              type="button"
              class="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold shadow-sm transition active:scale-95 active:bg-primary active:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-slate-700 dark:text-slate-200"
              (click)="handleToggle()"
              [attr.aria-pressed]="todayLog ? 'true' : 'false'"
              [attr.aria-label]="todayLog ? 'Undo, habit: ' + habit.title : 'Done, habit: ' + habit.title"
            >
              <span *ngIf="!todayLog">Done</span>
              <span *ngIf="todayLog">Undo</span>
            </button>

            <ng-container *ngSwitchDefault>
              <button
                *ngIf="habit.type === 'quantitative'"
                type="button"
                class="inline-flex items-center rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold shadow-sm transition hover:bg-slate-100 active:scale-95 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                (click)="handleDecrement(incrementStep)"
                [attr.aria-label]="'Decrease ' + incrementStep + (habit.units ? ' ' + habit.units : '') + ' · ' + habit.title"
              >
                −{{ incrementStep | number: '1.0-1' }}
              </button>
              <div *ngIf="quickChips?.length" class="flex items-center gap-2">
                <ng-container *ngFor="let chip of quickChips">
                  <button
                    *ngIf="(habit.schedule?.frequencyPeriod ?? 'day') === 'day'; else freqDec"
                    type="button"
                    class="inline-flex items-center rounded-full border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary active:scale-95 dark:border-slate-700 dark:text-slate-300"
                    (click)="handleIncrement(chip)"
                    [attr.aria-label]="'Add ' + chip + (habit.units ? ' ' + habit.units : '') + ' · ' + habit.title"
                  >
                    +{{ chip }}
                  </button>
                  <ng-template #freqDec>
                    <button
                      type="button"
                      class="inline-flex items-center rounded-full border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary active:scale-95 dark:border-slate-700 dark:text-slate-300"
                      (click)="handleDecrement(chip)"
                      [attr.aria-label]="'Decrease ' + chip + ' · ' + habit.title"
                    >
                      −{{ chip }}
                    </button>
                  </ng-template>
                </ng-container>
              </div>

              <button
                type="button"
                class="inline-flex items-center rounded-full bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark active:scale-95"
                (click)="handleIncrement(incrementStep)"
                [attr.aria-label]="'Add ' + incrementStep + (habit.units ? ' ' + habit.units : '') + ' · ' + habit.title"
              >
                +{{ incrementStep | number: '1.0-1' }}
                <span *ngIf="habit.units" class="ml-1 text-xs font-medium">{{ habit.units }}</span>
              </button>

              <div class="relative inline-block">
                <button
                  type="button"
                  class="inline-flex items-center rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold shadow-sm transition hover:bg-slate-100 active:scale-95 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  (click)="menuOpen = !menuOpen"
                  [attr.aria-expanded]="menuOpen"
                  aria-haspopup="menu"
                  aria-label="More actions"
                >
                  •••
                </button>
                <div *ngIf="menuOpen" class="absolute right-0 z-20 mt-2 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  <button
                    type="button"
                    class="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                    (click)="menuOpen = false; logDetail.emit()"
                  >
                    Details
                  </button>
                  <button
                    type="button"
                    class="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                    (click)="menuOpen = false; reset.emit()"
                    [disabled]="!todayLog"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </ng-container>
          </ng-container>
        </div>
      </footer>

      <app-progress-bar
        class="mt-2"
        [value]="progressCurrent"
        [max]="progressTotal"
        [srLabel]="habit.title + ' progress ' + progressCurrent + ' of ' + progressTotal"
      ></app-progress-bar>

      <div *ngIf="celebrating" class="celebrate-overlay pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <div class="celebrate-ring" aria-hidden="true"></div>
        <div class="celebrate-badge" aria-live="polite">Done!</div>
        <span
          *ngFor="let c of confetti"
          class="celebrate-confetti"
          [style.left.%]="c.left"
          [style.top.%]="c.top"
          [style.--x.px]="c.x"
          [style.--y.px]="c.y"
          [style.--r.deg]="c.r"
          [style.--h]="c.h"
        ></span>
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
  @Input() chainLinkCount = 0;

  @Output() toggle = new EventEmitter<void>();
  @Output() increment = new EventEmitter<number>();
  @Output() reset = new EventEmitter<void>();
  @Output() logDetail = new EventEmitter<void>();

  private readonly logService = inject(LogService);
  menuOpen = false;

  readonly confetti = Array.from({ length: 24 }).map((_, i) => {
    const angle = (i / 24) * Math.PI * 2;
    const distance = 80 + Math.random() * 60; // px
    return {
      left: 50 + Math.cos(angle) * 2 + (Math.random() - 0.5) * 4,
      top: 50 + Math.sin(angle) * 2 + (Math.random() - 0.5) * 4,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      r: Math.random() * 720 - 360,
      h: String(Math.floor(Math.random() * 360))
    };
  });

  displayValue(value: HabitLog['value'] | undefined): string {
    // Only two outputs are allowed: '' or 'completed'
    const period = this.habit.schedule?.frequencyPeriod ?? 'day';
    if (period !== 'day' && this.habit.id) {
      if (this.habit.type === 'binary') {
        try {
          const completed = this.logService.getPeriodCompletionCount(
            this.habit.id,
            period === 'month' ? 'month' : 'week'
          );
          return completed >= 1 ? 'completed' : '';
        } catch {
          return '';
        }
      }
      if (this.habit.type === 'quantitative') {
        const target = getHabitPeriodTarget(this.habit, new Date());
        if (target <= 0) return '';
        try {
          const sum = this.logService.getPeriodQuantitySum(this.habit.id, period);
          return sum >= target ? 'completed' : '';
        } catch {
          return '';
        }
      }
    }

    if (typeof value === 'boolean') {
      return value ? 'completed' : '';
    }
    if (typeof value === 'number') {
      if (this.habit.type === 'quantitative') {
        const target = this.habit.schedule?.dailyTargetValue ?? 0;
        const done = target > 0 ? value >= target : value > 0;
        return done ? 'completed' : '';
      }
      return value > 0 ? 'completed' : '';
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

  handleDecrement(step: number): void {
    if (typeof this.todayLog?.value === 'number') {
      const next = Math.max(0, Number(this.todayLog.value) - step);
      const delta = next - Number(this.todayLog.value);
      if (delta !== 0) {
        this.increment.emit(delta);
      }
      return;
    }
    // No value yet -> nothing to decrement
  }

  private vibrate(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate?.(15);
    }
  }

  // Progress metrics for the animated bar
  get progressCurrent(): number {
    const h = this.habit;
    const log = this.todayLog;
    if (!h) {
      return 0;
    }
    const period = h.schedule?.frequencyPeriod ?? 'day';
    if (period !== 'day' && h.id) {
      try {
        if (h.type === 'binary') {
          const count = this.logService.getPeriodCompletionCount(h.id, period === 'month' ? 'month' : 'week');
          return Math.max(0, Number(count) || 0);
        }
        if (h.type === 'quantitative') {
          const sum = this.logService.getPeriodQuantitySum(h.id, period);
          return Math.max(0, Number(sum) || 0);
        }
      } catch {
        return 0;
      }
    }
    if (h.type === 'binary') {
      return log?.value === true ? 1 : 0;
    }
    if (h.type === 'quantitative') {
      const value = typeof log?.value === 'number' ? log!.value : 0;
      return Math.max(0, Number(value) || 0);
    }
    return 0;
  }

  get progressTotal(): number {
    const h = this.habit;
    if (!h) {
      return 1;
    }
    const period = h.schedule?.frequencyPeriod ?? 'day';
    if (period !== 'day') {
      if (h.type === 'binary') {
        return 1;
      }
      if (h.type === 'quantitative') {
        const max = getHabitPeriodTarget(h, new Date());
        return Math.max(1, Number(max) || 1);
      }
    }
    if (h.type === 'binary') {
      return 1;
    }
    if (h.type === 'quantitative') {
      const max = h.schedule.dailyTargetValue ?? 1;
      return Math.max(1, Number(max) || 1);
    }
    return 1;
  }
}
 
