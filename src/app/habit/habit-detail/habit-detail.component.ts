import { DatePipe, NgFor, NgIf, TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HabitService } from '../../core/services/habit.service';
import { LogService } from '../../core/services/log.service';
import { Habit, StrategyType } from '../../data/models/habit.model';
import { HabitLog } from '../../data/models/log.model';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton/loading-skeleton.component';
// (Removed MetricCardComponent usage)
import { StatsStripComponent, StatItem } from '../../shared/components/stats-strip/stats-strip.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { HabitLogModalComponent } from '../../tracker/log-modal/habit-log-modal.component';
import { TrendBarChartComponent } from '../../shared/components/trend-bar-chart/trend-bar-chart.component';
import { AnalyticsService, CompletionTrendPoint } from '../../core/services/analytics.service';
import { isLogCompleted } from '../../core/utils/log-helpers';

@Component({
  standalone: true,
  selector: 'app-habit-detail',
  imports: [
    NgIf,
    NgFor,
    RouterLink,
    DatePipe,
    TitleCasePipe,
    PageHeaderComponent,
    LoadingSkeletonComponent,
    
    StatsStripComponent,
    ConfirmDialogComponent,
    HabitLogModalComponent,
    TrendBarChartComponent
  ],
  template: `
    <div *ngIf="isLoading(); else detailContent">
      <app-loading-skeleton [rows]="3" [height]="96"></app-loading-skeleton>
    </div>

    <ng-template #detailContent>
      <ng-container *ngIf="habit(); else missing">
        <div class="flex items-start justify-between gap-4">
          <div *ngIf="habit()?.icon" class="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-3xl" aria-hidden="true">
            {{ habit()?.icon }}
          </div>
          <app-page-header
            class="flex-1"
            [title]="habit()?.title ?? ''"
            [subtitle]="habit()?.description"
            eyebrow="Habit Detail"
          />
          <div class="flex items-start gap-2">
            <a
              routerLink="/habits"
              aria-label="Back to habits"
              class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-primary hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              ←
            </a>
          </div>
        </div>

        <div class="mt-6">
          <app-stats-strip [items]="statItems()" [highlightIndex]="0"></app-stats-strip>
        </div>

        <section class="mt-8 grid gap-4 lg:grid-cols-2">
          <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 max-w-full overflow-hidden">
            <div class="mb-2 flex items-center justify-between">
              <h2 class="text-lg font-semibold">Recent Activity</h2>
            </div>
            
            <div class="mt-6">
              <app-trend-bar-chart [points]="activityPoints()" [scrollable]="true" title="Daily progress"></app-trend-bar-chart>
            </div>
          </article>

          <article class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 max-w-full overflow-hidden">
            <header class="flex items-center justify-between">
              <h2 class="text-lg font-semibold">Strategy</h2>
              <a routerLink="/add-habit" class="inline-flex items-center text-sm font-semibold text-primary hover:underline">
                Edit habit
              </a>
            </header>
            <ng-container *ngIf="habit()?.strategy as strategy; else noStrategy">
              <p class="text-xs font-semibold uppercase tracking-wide text-primary">
                {{ strategyTypeLabel(strategy.type) }}
              </p>

              <dl class="space-y-2 text-sm text-slate-500">
                <div *ngFor="let item of strategyDetails()" class="flex justify-between">
                  <dt>{{ item.label }}</dt>
                  <dd>{{ item.value }}</dd>
                </div>
              </dl>

              <div *ngIf="strategy.notes" class="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <span class="font-semibold">Notes:</span> {{ strategy.notes }}
              </div>
            </ng-container>
            <ng-template #noStrategy>
              <p class="text-sm text-slate-500">No strategy attached yet.</p>
            </ng-template>
          </article>
        </section>
      </ng-container>

      <ng-template #missing>
        <div class="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
          <p class="mb-3 text-lg font-medium">Habit not found.</p>
          <a routerLink="/habits" class="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
            Return to habits
          </a>
        </div>
      </ng-template>
    </ng-template>
    <app-confirm-dialog
      [open]="pendingDelete()"
      title="Biztosan törlöd?"
      message="A szokás és az összes kapcsolódó napló törlésre kerül."
      confirmText="Törlés"
      cancelText="Mégse"
      (confirm)="deleteHabit()"
      (cancel)="pendingDelete.set(false)"
    />
    <app-habit-log-modal
      *ngIf="logModalOpen()"
      [habit]="habit() || null"
      [log]="currentLog()"
      (close)="logModalOpen.set(false)"
      (save)="handleLogSubmit($event)"
    ></app-habit-log-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HabitDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly habitService = inject(HabitService);
  private readonly logService = inject(LogService);
  private readonly router = inject(Router);
  private readonly analyticsService = inject(AnalyticsService);

  private readonly habitId = Number(this.route.snapshot.paramMap.get('id'));

  readonly habit = computed<Habit | undefined>(() => this.habitService.getHabit(this.habitId));
  readonly currentStreak = signal(0);
  readonly longestStreak = signal(0);
  readonly recentLogs = signal<HabitLog[]>([]);
  readonly pendingDelete = signal(false);
  readonly isLoading = computed(() => this.habitService.isLoading() || this.logService.isLoading());
  readonly logModalOpen = signal(false);
  readonly currentLog = signal<HabitLog | undefined>(undefined);
  readonly supplementaryMetric = computed(() => {
    const habit = this.habit();
    if (!habit?.id) {
      return null;
    }

    const period = habit.schedule.frequencyPeriod ?? 'day';
    if (habit.type === 'quantitative' && habit.schedule.dailyTargetValue) {
      if (period !== 'day') {
        const periodLabel = period === 'month' ? 'month' : 'week';
        const sum = this.logService.getPeriodQuantitySum(habit.id, period);
        return `${sum}/${habit.schedule.dailyTargetValue} ${habit.units ?? ''} this ${periodLabel}`.trim();
      } else {
        const todayLog = this.logService.getLogForDate(habit.id, new Date());
        const value = typeof todayLog?.value === 'number' ? todayLog.value : 0;
        return `${value}/${habit.schedule.dailyTargetValue} ${habit.units ?? ''}`.trim();
      }
    }

    if (habit.type === 'binary' && period !== 'day') {
      const periodLabel = period === 'month' ? 'month' : 'week';
      const completed = this.logService.getPeriodCompletionCount(habit.id, period === 'month' ? 'month' : 'week');
      return `${Math.min(1, completed)}/1 this ${periodLabel}`;
    }

    return null;
  });

  readonly completionRate = computed(() => {
    const logs = this.logService.getLogsForHabit(this.habitId);
    return this.analyticsService.calculateCompletionRate(logs);
  });

  readonly totalEntries = computed(() => this.logService.getLogsForHabit(this.habitId).length);

  readonly statItems = computed<StatItem[]>(() => {
    const created = this.habit()?.createdDate ? new Date(this.habit()!.createdDate).toLocaleDateString() : '—';
    const progress = this.supplementaryMetric();
    return [
      { label: 'Current streak', value: `${this.currentStreak()} days` },
      { label: 'Avg completion', value: `${this.completionRate()}%`, hint: 'All-time' },
      { label: 'Longest streak', value: `${this.longestStreak()} days` },
      progress ? { label: 'Progress', value: progress } : { label: 'Created', value: created }
    ];
  });

  async ngOnInit(): Promise<void> {
    await this.habitService.init();
    await this.loadLogs();
  }

  private async loadLogs(): Promise<void> {
    try {
      await this.logService.loadLogsForHabit(this.habitId);
    } catch (error) {
      console.error(error);
    }
    const logsAll = this.logService
      .getLogsForHabit(this.habitId)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    this.recentLogs.set(logsAll.slice(0, 7));
    this.currentStreak.set(this.logService.getCurrentStreak(this.habitId));
    this.longestStreak.set(this.computeLongestStreak(logsAll));
  }

  renderLogValue(value: HabitLog['value']): string {
    if (typeof value === 'boolean') {
      return value ? 'Completed' : 'Missed';
    }
    if (typeof value === 'number') {
      const units = this.habit()?.units;
      return units ? `${value} ${units}` : `${value}`;
    }
    return '';
  }

  strategyTypeLabel(type: StrategyType): string {
    switch (type) {
      case 'SMART':
        return 'SMART goal';
      case 'WOOP':
        return 'WOOP plan';
      case 'TINY':
        return 'Tiny habit';
      case 'GOAL_COMPASS':
        return 'Goal compass';
      case 'OKR':
        return 'OKR snapshot';
      default:
        return 'Track only';
    }
  }

  async deleteHabit(): Promise<void> {
    try {
      await this.logService.deleteLogsForHabit(this.habitId);
      await this.habitService.removeHabit(this.habitId);
      void this.router.navigate(['/habits']);
    } catch (error) {
      console.error(error);
    } finally {
      this.pendingDelete.set(false);
    }
  }

  // Range-filtered logs for activity list (by count)
  // Removed list rendering; keep if needed later

  activityPoints(): CompletionTrendPoint[] {
    const logs = this.logService.getLogsForHabit(this.habitId);
    const days = 30;
    const base = this.analyticsService.buildDailyTrend(logs, days);
    const today = new Date();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const start = new Date(end);
    start.setDate(end.getDate() - (days - 1));

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

    return base.map((point, idx) => {
      const d = new Date(start);
      d.setDate(start.getDate() + idx);
      const label = `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
      return { label, value: point.value } as CompletionTrendPoint;
    });
  }

  openLogModal(habitId: number): void {
    const h = this.habit();
    if (!h) return;
    this.currentLog.set(this.logService.getLogForDate(habitId, new Date()));
    this.logModalOpen.set(true);
  }

  async handleLogSubmit(payload: { habitId: number; value: number; notes?: string }): Promise<void> {
    try {
      await this.logService.setHabitLog({ habitId: payload.habitId, value: payload.value, notes: payload.notes });
      await this.loadLogs();
    } finally {
      this.logModalOpen.set(false);
    }
  }

  isTodayCompleted(): boolean {
    const log = this.logService.getLogForDate(this.habitId, new Date());
    return !!(log && isLogCompleted(log));
  }

  async toggleToday(habitId: number): Promise<void> {
    const log = this.logService.getLogForDate(habitId, new Date());
    const next = !(log?.value === true);
    await this.logService.setHabitLog({ habitId, value: next });
    await this.loadLogs();
  }

  private computeLongestStreak(logs: HabitLog[]): number {
    if (!logs.length) return 0;
    const days = new Set<string>();
    for (const log of logs) {
      if (isLogCompleted(log)) days.add(log.dayKey);
    }
    let longest = 0;
    let current = 0;
    // Walk backwards through sorted day keys
    const ordered = Array.from(days.values()).sort((a,b) => (a < b ? 1 : -1));
    if (!ordered.length) return 0;
    // Create a map of Date objects for quick step checks
    const toDate = (key: string) => new Date(key + 'T00:00:00');
    let prev: Date | undefined;
    for (const key of ordered) {
      const d = toDate(key);
      if (!prev) {
        current = 1;
      } else {
        const diff = Math.round((prev.getTime() - d.getTime()) / (24*60*60*1000));
        if (diff === 1) {
          current += 1;
        } else {
          current = 1;
        }
      }
      if (current > longest) longest = current;
      prev = d;
    }
    return longest;
  }

  // Build a flat list of present fields for the current strategy, regardless of structure
  strategyDetails(): Array<{ label: string; value: string }> {
    const h = this.habit();
    const out: Array<{ label: string; value: string }> = [];
    if (!h?.strategy) return out;
    const s: any = h.strategy;

    const pushIf = (label: string, val: any, isDate = false) => {
      const present = val !== undefined && val !== null && (typeof val === 'number' || (typeof val === 'string' ? val.trim().length > 0 : true));
      if (!present) return;
      let v: string;
      if (isDate) {
        const d = new Date(val);
        v = isNaN(d.getTime()) ? String(val) : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      } else {
        v = String(val);
      }
      out.push({ label, value: v });
    };

    switch (s.type) {
      case 'SMART':
        pushIf('Target metric', s.smart?.targetMetric);
        if (s.smart?.targetValue !== undefined) {
          const unit = s.smart?.measurementUnit ? ` ${s.smart?.measurementUnit}` : '';
          pushIf('Target value', `${s.smart?.targetValue}${unit}`);
        } else {
          pushIf('Unit', s.smart?.measurementUnit);
        }
        pushIf('Deadline', s.smart?.deadline, true);
        pushIf('Motivation', s.smart?.motivation);
        break;
      case 'WOOP':
        pushIf('Wish', s.woop?.wish);
        pushIf('Outcome', s.woop?.outcome);
        pushIf('Obstacle', s.woop?.obstacle);
        pushIf('Plan', s.woop?.plan);
        break;
      case 'TINY':
        pushIf('Anchor', s.tiny?.anchor);
        pushIf('Tiny version', s.tiny?.tinyVersion);
        pushIf('Celebrate by', s.tiny?.celebration);
        break;
      case 'GOAL_COMPASS':
        pushIf('Why', s.goalCompass?.why);
        pushIf('Vision', s.goalCompass?.vision);
        pushIf('Next step', s.goalCompass?.nextStep);
        break;
      case 'OKR':
        pushIf('Objective', s.okr?.objective);
        pushIf('Key result', s.okr?.keyResult);
        if (s.okr?.targetValue !== undefined) pushIf('Target', s.okr?.targetValue);
        pushIf('Timeframe', s.okr?.timeframe);
        break;
      default:
        break;
    }

    // Fallback: if nothing collected but strategy has extra fields, show them generically
    if (!out.length) {
      const entries: Array<[string, any]> = Object.entries(s).filter(([k]) => k !== 'type' && k !== 'notes');
      for (const [key, val] of entries) {
        if (val && typeof val === 'object') {
          for (const [subKey, subVal] of Object.entries(val)) {
            pushIf(this.prettify(subKey), subVal, /date|deadline/i.test(subKey));
          }
        } else {
          pushIf(this.prettify(key), val, /date|deadline/i.test(key));
        }
      }
    }

    return out;
  }

  private prettify(key: string): string {
    const spaced = key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
    return spaced
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }
}
