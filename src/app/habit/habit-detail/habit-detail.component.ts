import { DatePipe, NgFor, NgIf, TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HabitService } from '../../core/services/habit.service';
import { LogService } from '../../core/services/log.service';
import { Habit, HabitChainRelation, StrategyType } from '../../data/models/habit.model';
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
import { HabitChainService } from '../../core/services/habit-chain.service';
import { ToastService } from '../../shared/services/toast.service';
import { getHabitPeriodTarget } from '../../core/utils/habit-utils';
import { LanguageService } from '../../shared/services/language.service';

@Component({
  standalone: true,
  selector: 'app-habit-detail',
  imports: [
    NgIf,
    NgFor,
    RouterLink,
    DatePipe,
    TitleCasePipe,
    FormsModule,
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
              <app-trend-bar-chart
                [points]="activityPoints()"
                [scrollable]="true"
                initialScrollPosition="end"
                [scrollPaddingEnd]="44"
                title="Daily progress"
              ></app-trend-bar-chart>
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

        <section class="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <header class="mb-4">
            <h2 class="text-lg font-semibold">Habit Chain</h2>
            <p class="text-sm text-slate-500 dark:text-slate-300">
              Link this habit to natural before/after actions so you can complete small routines with less friction.
            </p>
          </header>

          <div
            *ngIf="chainOpenSuggestions().length"
            class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
          >
            <p class="font-semibold">Before you start this habit:</p>
            <ul class="mt-1 space-y-1">
              <li *ngFor="let suggestion of chainOpenSuggestions()">- {{ suggestion.targetHabit.title }}</li>
            </ul>
          </div>

          <div class="grid gap-4 lg:grid-cols-3">
            <article class="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <h3 class="text-sm font-semibold">Before this habit</h3>
              <div *ngIf="beforeChainLinks().length; else noBeforeLinks" class="mt-2 space-y-2 text-xs">
                <div *ngFor="let item of beforeChainLinks()" class="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                  <div class="flex items-center justify-between gap-2">
                    <a [routerLink]="['/habits', item.targetHabit.id]" class="font-semibold text-primary hover:underline">
                      {{ item.targetHabit.title }}
                    </a>
                    <button
                      type="button"
                      class="rounded-full border border-slate-300 px-2 py-1 text-[11px] font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                      (click)="removeChainLink(item.link.id)"
                    >
                      Remove
                    </button>
                  </div>
                  <p class="mt-1 text-slate-500 dark:text-slate-300" *ngIf="item.link.note">{{ item.link.note }}</p>
                </div>
              </div>
              <ng-template #noBeforeLinks>
                <p class="mt-2 text-xs text-slate-500 dark:text-slate-300">No before-links yet.</p>
              </ng-template>
            </article>

            <article class="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <h3 class="text-sm font-semibold">After this habit</h3>
              <div *ngIf="afterChainLinks().length; else noAfterLinks" class="mt-2 space-y-2 text-xs">
                <div *ngFor="let item of afterChainLinks()" class="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                  <div class="flex items-center justify-between gap-2">
                    <a [routerLink]="['/habits', item.targetHabit.id]" class="font-semibold text-primary hover:underline">
                      {{ item.targetHabit.title }}
                    </a>
                    <button
                      type="button"
                      class="rounded-full border border-slate-300 px-2 py-1 text-[11px] font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                      (click)="removeChainLink(item.link.id)"
                    >
                      Remove
                    </button>
                  </div>
                  <p class="mt-1 text-slate-500 dark:text-slate-300" *ngIf="item.link.note">{{ item.link.note }}</p>
                </div>
              </div>
              <ng-template #noAfterLinks>
                <p class="mt-2 text-xs text-slate-500 dark:text-slate-300">No after-links yet.</p>
              </ng-template>
            </article>

            <article class="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <h3 class="text-sm font-semibold">Triggered by</h3>
              <div *ngIf="incomingChainLinks().length; else noIncomingLinks" class="mt-2 space-y-2 text-xs">
                <div *ngFor="let item of incomingChainLinks()" class="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                  <div class="flex items-center justify-between gap-2">
                    <a [routerLink]="['/habits', item.sourceHabit.id]" class="font-semibold text-primary hover:underline">
                      {{ item.sourceHabit.title }}
                    </a>
                    <span class="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {{ relationLabel(item.link.relation) }}
                    </span>
                  </div>
                </div>
              </div>
              <ng-template #noIncomingLinks>
                <p class="mt-2 text-xs text-slate-500 dark:text-slate-300">This habit is not linked from others yet.</p>
              </ng-template>
            </article>
          </div>

          <div class="mt-5 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <h3 class="text-sm font-semibold">Add linked habit</h3>
            <div class="mt-3 grid gap-3 md:grid-cols-2">
              <label class="flex flex-col gap-1 text-xs font-medium">
                Relation
                <select
                  class="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  [ngModel]="newChainRelation()"
                  (ngModelChange)="newChainRelation.set($event)"
                >
                  <option value="before">Before this habit</option>
                  <option value="after">After this habit</option>
                </select>
              </label>

              <label class="flex flex-col gap-1 text-xs font-medium">
                Linked habit
                <select
                  class="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  [ngModel]="newChainTargetId()"
                  (ngModelChange)="updateNewChainTarget($event)"
                >
                  <option [ngValue]="null">Select a habit</option>
                  <option *ngFor="let target of availableChainTargets()" [ngValue]="target.id">
                    {{ target.title }}
                  </option>
                </select>
              </label>

              <label class="flex flex-col gap-1 text-xs font-medium">
                Priority
                <input
                  type="number"
                  class="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  [ngModel]="newChainPriority()"
                  (ngModelChange)="updateNewChainPriority($event)"
                />
              </label>

              <label class="flex flex-col gap-1 text-xs font-medium">
                Skip if completed in last hours
                <input
                  type="number"
                  min="0"
                  class="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  [ngModel]="newChainSkipHours()"
                  (ngModelChange)="updateNewChainSkipHours($event)"
                />
              </label>

              <label class="md:col-span-2 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  [ngModel]="newChainOnlyIfDue()"
                  (ngModelChange)="newChainOnlyIfDue.set(!!$event)"
                />
                Only suggest when the linked habit is due
              </label>

              <label class="md:col-span-2 flex flex-col gap-1 text-xs font-medium">
                Note (optional)
                <input
                  type="text"
                  class="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  placeholder="Why this link helps"
                  [ngModel]="newChainNote()"
                  (ngModelChange)="newChainNote.set($event ?? '')"
                />
              </label>
            </div>

            <div class="mt-3 flex justify-end">
              <button
                type="button"
                class="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                [disabled]="!newChainTargetId()"
                (click)="addChainLink()"
              >
                Add link
              </button>
            </div>
          </div>
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
      title="Are you sure you want to delete?"
      message="This habit and all related logs will be deleted."
      confirmText="Delete"
      cancelText="Cancel"
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
  private readonly chainService = inject(HabitChainService);
  private readonly toastService = inject(ToastService);
  private readonly languageService = inject(LanguageService);

  private readonly habitId = Number(this.route.snapshot.paramMap.get('id'));

  readonly habit = computed<Habit | undefined>(() => this.habitService.getHabit(this.habitId));
  readonly availableChainTargets = computed(() =>
    this.habitService
      .habits()
      .filter((item) => item.id !== undefined && item.id !== this.habitId && !item.archived)
      .sort((a, b) => a.title.localeCompare(b.title))
  );
  readonly beforeChainLinks = computed(() => this.chainService.getOutgoingLinks(this.habitId, 'before'));
  readonly afterChainLinks = computed(() => this.chainService.getOutgoingLinks(this.habitId, 'after'));
  readonly incomingChainLinks = computed(() => this.chainService.getIncomingLinks(this.habitId));
  readonly chainOpenSuggestions = computed(() =>
    this.chainService.getSuggestionsFromHabit(this.habitId, 'on_open', { limit: 3, now: new Date() })
  );
  readonly newChainRelation = signal<HabitChainRelation>('after');
  readonly newChainTargetId = signal<number | null>(null);
  readonly newChainOnlyIfDue = signal<boolean>(true);
  readonly newChainSkipHours = signal<number | null>(null);
  readonly newChainPriority = signal<number>(0);
  readonly newChainNote = signal<string>('');
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
        const target = getHabitPeriodTarget(habit, new Date());
        return `${sum}/${target} ${habit.units ?? ''} this ${periodLabel}`.trim();
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
    const created = this.habit()?.createdDate ? new Date(this.habit()!.createdDate).toLocaleDateString(this.languageService.language() === 'hu' ? 'hu-HU' : 'en-US') : '—';
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
    this.ensureChainTargetSelected();
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
      const habit = this.habit();
      const now = new Date();
      if (
        habit?.id === payload.habitId &&
        payload.value > 0 &&
        !this.isHabitCompletedForLock(habit, now) &&
        this.isCompletionBlocked(habit, now)
      ) {
        return;
      }
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
    const habit = this.habit();
    const now = new Date();
    if (next && habit?.id === habitId && !this.isHabitCompletedForLock(habit, now) && this.isCompletionBlocked(habit, now)) {
      return;
    }
    await this.logService.setHabitLog({ habitId, value: next });
    await this.loadLogs();
  }

  async addChainLink(): Promise<void> {
    const source = this.habit();
    if (!source?.id) {
      return;
    }
    const targetId = this.newChainTargetId();
    if (!targetId) {
      this.toastService.show('Select a habit to link.');
      return;
    }
    try {
      await this.habitService.addChainLink(source.id, {
        targetHabitId: targetId,
        relation: this.newChainRelation(),
        priority: this.newChainPriority(),
        note: this.newChainNote().trim() || undefined,
        conditions: {
          onlyIfDue: this.newChainOnlyIfDue(),
          skipIfCompletedWithinHours:
            this.newChainSkipHours() !== null && this.newChainSkipHours()! > 0
              ? this.newChainSkipHours()!
              : undefined
        },
        isActive: true
      });
      this.toastService.show('Chain link added.');
      this.newChainNote.set('');
      this.newChainSkipHours.set(null);
      this.newChainPriority.set(0);
      this.ensureChainTargetSelected();
    } catch (error) {
      console.error(error);
    }
  }

  async removeChainLink(linkId: string): Promise<void> {
    const source = this.habit();
    if (!source?.id) {
      return;
    }
    try {
      await this.habitService.removeChainLink(source.id, linkId);
      this.toastService.show('Chain link removed.');
      this.ensureChainTargetSelected();
    } catch (error) {
      console.error(error);
    }
  }

  updateNewChainTarget(value: number | string | null): void {
    const parsed = Number(value);
    this.newChainTargetId.set(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
  }

  updateNewChainPriority(value: number | string): void {
    const parsed = Number(value);
    this.newChainPriority.set(Number.isFinite(parsed) ? Math.round(parsed) : 0);
  }

  updateNewChainSkipHours(value: number | string | null): void {
    const parsed = Number(value);
    this.newChainSkipHours.set(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
  }

  relationLabel(relation: HabitChainRelation): string {
    return relation === 'before' ? 'Before' : 'After';
  }

  private isCompletionBlocked(habit: Habit, now: Date): boolean {
    if (!habit.id) {
      return false;
    }
    const blockers = this.chainService.getCompletionBlockers(habit.id, { now });
    if (!blockers.length) {
      return false;
    }
    this.showCompletionBlockedToast(habit, blockers);
    return true;
  }

  private showCompletionBlockedToast(habit: Habit, blockers: Habit[]): void {
    if (!blockers.length) {
      return;
    }

    if (blockers.length === 1) {
      this.toastService.show(`Complete "${blockers[0].title}" first to unlock "${habit.title}".`);
      return;
    }

    const [first, second] = blockers;
    const remaining = blockers.length - 2;
    const prefix =
      remaining > 0
        ? `${first.title}, ${second.title}, and ${remaining} more`
        : `${first.title} and ${second.title}`;
    this.toastService.show(`Complete ${prefix} first to unlock "${habit.title}".`);
  }

  private isHabitCompletedForLock(habit: Habit, referenceDate: Date): boolean {
    if (!habit.id) {
      return false;
    }

    const period = habit.schedule?.frequencyPeriod ?? 'day';
    if (period !== 'day') {
      if (habit.type === 'binary') {
        const completed = this.logService.getPeriodCompletionCount(
          habit.id,
          period === 'month' ? 'month' : 'week',
          referenceDate
        );
        return completed >= 1;
      }
      if (habit.type === 'quantitative') {
        const target = getHabitPeriodTarget(habit, referenceDate);
        if (target <= 0) {
          return false;
        }
        const sum = this.logService.getPeriodQuantitySum(habit.id, period, referenceDate);
        return sum >= target;
      }
      if (habit.type === 'frequency') {
        const target = Math.max(1, Number(habit.schedule.frequencyCount ?? 1));
        const completed = this.logService.getCompletedCount(
          habit.id,
          period === 'month' ? 'month' : 'week',
          referenceDate
        );
        return completed >= target;
      }
      return false;
    }

    const log = this.logService.getLogForDate(habit.id, referenceDate);
    if (habit.type === 'binary') {
      return log?.value === true;
    }
    if (habit.type === 'quantitative') {
      const target = Math.max(0, Number(habit.schedule.dailyTargetValue ?? 0));
      if (target <= 0) {
        return false;
      }
      const value = typeof log?.value === 'number' ? Number(log.value) : 0;
      return value >= target;
    }
    if (habit.type === 'frequency') {
      const target = Math.max(1, Number(habit.schedule.frequencyCount ?? 1));
      const value =
        typeof log?.value === 'number' ? Number(log.value) : log?.value === true ? 1 : 0;
      return value >= target;
    }
    return false;
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
    const ordered = Array.from(days.values()).sort((a, b) => (a < b ? 1 : -1));
    if (!ordered.length) return 0;
    // Create a map of Date objects for quick step checks
    const toDate = (key: string) => new Date(key + 'T00:00:00');
    let prev: Date | undefined;
    for (const key of ordered) {
      const d = toDate(key);
      if (!prev) {
        current = 1;
      } else {
        const diff = Math.round((prev.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
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
        v = isNaN(d.getTime()) ? String(val) : d.toLocaleDateString(this.languageService.language() === 'hu' ? 'hu-HU' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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

  private ensureChainTargetSelected(): void {
    const current = this.newChainTargetId();
    const targets = this.availableChainTargets();
    if (!targets.length) {
      this.newChainTargetId.set(null);
      return;
    }
    if (current && targets.some((item) => item.id === current)) {
      return;
    }
    this.newChainTargetId.set(targets[0].id ?? null);
  }
}
