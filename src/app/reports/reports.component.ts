import { AsyncPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HabitService } from '../core/services/habit.service';
import { LogService } from '../core/services/log.service';
import { AnalyticsService, CompletionTrendPoint, HeatmapCell } from '../core/services/analytics.service';
import { isLogCompleted } from '../core/utils/log-helpers';
import { startOfDay, startOfWeek } from '../core/utils/date-utils';
import { LoadingSkeletonComponent } from '../shared/components/loading-skeleton/loading-skeleton.component';
import { StatsStripComponent, StatItem } from '../shared/components/stats-strip/stats-strip.component';
import { EmptyStateComponent } from '../shared/components/empty-state/empty-state.component';
import { HeatmapCalendarComponent } from '../shared/components/heatmap-calendar/heatmap-calendar.component';
import { TrendBarChartComponent } from '../shared/components/trend-bar-chart/trend-bar-chart.component';
import { Habit } from '../data/models/habit.model';

interface HabitInsight {
  id: number;
  title: string;
  strength: number;
  completionRate: number;
  streak: number;
}

type PeriodOption = '7d' | '30d' | '90d' | '365d';
type InsightFilter = 'all' | 'strong' | 'needs-attention';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    AsyncPipe,
    DatePipe,
    LoadingSkeletonComponent,
    StatsStripComponent,
    EmptyStateComponent,
    HeatmapCalendarComponent,
    TrendBarChartComponent,
    RouterLink
  ],
  template: `
    <section class="space-y-6">

      <app-loading-skeleton *ngIf="isLoading()" [rows]="3" [height]="112"></app-loading-skeleton>

      <div *ngIf="!isLoading() && !hasData()" class="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
        Log habits consistently to unlock detailed analytics, streak trends, and heatmaps.
      </div>

      <ng-container *ngIf="!isLoading() && hasData()">
        <app-stats-strip [items]="statItems()" [highlightIndex]="1"></app-stats-strip>

        <div class="grid gap-6 lg:grid-cols-2">
          <app-trend-bar-chart [points]="dailyTrend()" title="Daily progress"></app-trend-bar-chart>
          <app-trend-bar-chart [points]="weeklyTrend()" title="Weekly completion"></app-trend-bar-chart>
        </div>

        <div *ngIf="false" class="grid gap-6 lg:grid-cols-1">
          <section class="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 max-h-96 overflow-y-auto no-scrollbar">
            <header class="flex items-center justify-between pb-8">
              <div>
                <h2 class="text-lg font-semibold">Focus habit</h2>
                <p class="text-xs text-slate-500 dark:text-slate-300">Spotlight the habit with the strongest momentum.</p>
              </div>
              <button
                *ngIf="focusHabit()"
                type="button"
                class="text-xs font-semibold text-primary hover:underline"
                (click)="focusHabit() && goToHabit(focusHabit()!.id)"
              >
                View habit
              </button>
            </header>

            <ng-container *ngIf="focusHabit(); else noFocus">
              <div class="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                <h3 class="text-base font-semibold text-slate-900 dark:text-slate-50">
                  {{ focusHabit()!.title }}
                </h3>
                <dl class="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-slate-500">Completion</dt>
                    <dd class="text-lg font-semibold text-slate-900 dark:text-slate-200">
                      {{ focusHabit()!.completionRate }}%
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-slate-500">Strength</dt>
                    <dd class="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                      {{ focusHabit()!.strength }}%
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-slate-500">Current streak</dt>
                    <dd class="text-lg font-semibold text-slate-900 dark:text-slate-200">
                      {{ focusHabit()!.streak }} days
                    </dd>
                  </div>
                  <div *ngIf="focusHabitTags().length">
                    <dt class="text-xs uppercase tracking-wide text-slate-500">Tags</dt>
                    <dd class="text-sm text-slate-600 dark:text-slate-300">
                      {{ focusHabitTags().join(', ') }}
                    </dd>
                  </div>
                </dl>
              </div>
            </ng-container>
            <ng-template #noFocus>
              <div class="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                Log a few entries to spotlight a habit here.
              </div>
            </ng-template>
          </section>
        </div>

        <div class="grid gap-6 lg:grid-cols-2">
          <section class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <header class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold">Filters</h2>
                <p class="text-xs text-slate-500 dark:text-slate-300">Compare performance across tags and time ranges.</p>
              </div>
              
            </header>

            <div class="space-y-4">
              <div>
                <label class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Tag</label>
                <div class="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                    [ngClass]="{
                      'bg-primary/10': selectedTag() === 'all',
                      'text-primary': selectedTag() === 'all',
                      'border-primary': selectedTag() === 'all',
                      'border-slate-200': selectedTag() !== 'all'
                    }"
                    (click)="setTag('all')"
                  >
                    All
                  </button>

                  <button
                    *ngFor="let tag of availableTags()"
                    type="button"
                    class="rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                    [ngClass]="{
                      'bg-primary/10': selectedTag() === tag,
                      'text-primary': selectedTag() === tag,
                      'border-primary': selectedTag() === tag,
                      'border-slate-200': selectedTag() !== tag
                    }"
                    (click)="setTag(tag)"
                  >
                    {{ tag }}
                  </button>
                </div>
              </div>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
              <p class="font-semibold">Focus habit</p>
              <div *ngIf="focusHabit(); else noFocus" class="mt-2 space-y-1">
                <p>{{ focusHabit()?.title }}</p>
                <p>Strength {{ focusHabit()?.strength }} · Completion {{ focusHabit()?.completionRate }}%</p>
                <a [routerLink]="['/habits', focusHabit()?.id]" class="inline-flex items-center text-primary hover:underline">
                  Review habit
                </a>
              </div>
              <ng-template #noFocus>
                <p>No focus habit selected. Choose a strongest/attention habit to spotlight.</p>
              </ng-template>
            </div>
          </section>

          <section class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <header class="flex items-center justify-between">
                <h2 id="habit-health-title" class="text-lg font-semibold">Habit health</h2>
              <select
                class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900"
                [value]="selectedFilter()"
                (change)="onFilterChange($event)"
              >
                <option value="all">All</option>
                <option value="strong">Strongest</option>
                <option value="needs-attention">Needs attention</option>
              </select>
            </header>
            <div class="my-8 border-t border-slate-200 dark:border-slate-700"></div>
            <br>
            <ul class="space-y-3 text-sm">
              <li
                *ngFor="let insight of filteredInsights()"
                class="rounded-2xl border border-slate-200 p-4 transition hover:border-primary/60 dark:border-slate-700"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ insight.title }}</p>
                    <p class="text-xs text-slate-500 dark:text-slate-300">
                      Strength {{ insight.strength }} · Completion {{ insight.completionRate }}% · Streak {{ insight.streak }}d
                    </p>
                  </div>
                  <span
                    class="rounded-full px-3 py-1 text-xs font-semibold"
                    [class.bg-emerald-100]="insight.strength >= 70"
                    [class.text-emerald-700]="insight.strength >= 70"
                    [class.bg-amber-100]="insight.strength >= 40 && insight.strength < 70"
                    [class.text-amber-700]="insight.strength >= 40 && insight.strength < 70"
                    [class.bg-rose-100]="insight.strength < 40"
                    [class.text-rose-700]="insight.strength < 40"
                  >
                    {{ insight.strength }}%
                  </span>
                </div>
              </li>
            </ul>

            <div *ngIf="!filteredInsights().length" class="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
              Not enough data yet. Keep logging to get personalized habit insights.
            </div>
          </section>
        </div>

        
      </ng-container>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportsComponent {
  private readonly habitService = inject(HabitService);
  private readonly logService = inject(LogService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly router = inject(Router);

  readonly isLoading = computed(() => this.habitService.isLoading() || this.logService.isLoading());
  readonly habits = this.habitService.habits;
  readonly logs = this.logService.logs;

  readonly selectedPeriod = signal<PeriodOption>('30d');
  readonly selectedTag = signal<string>('all');
  readonly selectedFilter = signal<InsightFilter>('all');

  readonly periodOptions: Array<{ value: PeriodOption; label: string }> = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Quarter' },
    { value: '365d', label: 'Year' }
  ];

  readonly availableTags = computed(() => {
    const set = new Set<string>();
    for (const habit of this.habits()) {
      habit.tags?.forEach((tag) => set.add(tag));
    }
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
  });

  readonly matchingHabits = computed(() =>
    this.habits().filter((habit): habit is Habit & { id: number } => {
      if (habit.id === undefined) {
        return false;
      }
      const tag = this.selectedTag();
      if (tag === 'all') {
        return true;
      }
      return habit.tags?.includes(tag) ?? false;
    })
  );

  readonly filteredLogs = computed(() => {
    const cutoff = this.getCutoffDate(this.selectedPeriod());
    const habitIds = new Set(this.matchingHabits().map((habit) => habit.id));
    return this.logs().filter((log) => {
      if (cutoff && new Date(log.date) < cutoff) {
        return false;
      }
      return habitIds.has(log.habitId);
    });
  });

  readonly activeHabitsCount = computed(() => this.matchingHabits().length);
  readonly totalLogEntries = computed(() => this.filteredLogs().length);
  readonly averageCompletionRate = computed(() => {
    const trend = this.weeklyTrend();
    if (!trend.length) {
      return 0;
    }
    const total = trend.reduce((sum, p) => sum + p.value, 0);
    return Math.round(total / trend.length);
  });

  readonly heatmapCells = computed<HeatmapCell[]>(() =>
    this.analyticsService.buildHeatmap(this.filteredLogs(), 7)
  );

  readonly statItems = computed<StatItem[]>(() => [
    { label: 'Active habits', value: this.activeHabitsCount(), hint: 'Currently tracking' },
    { label: 'Avg completion', value: `${this.averageCompletionRate()}%`, hint: 'Last 8 weeks' },
    { label: 'Top streak', value: this.topStreakLabel(), hint: 'Best current run' },
    { label: 'Entries logged', value: this.totalLogEntries(), hint: 'Within filters' }
  ]);

  readonly dailyTrend = computed<CompletionTrendPoint[]>(() => {
    const logs = this.filteredLogs();
    const habits = this.matchingHabits();
    const trend: CompletionTrendPoint[] = [];
    const today = startOfDay(new Date());
    for (let i = 7 - 1; i >= 0; i--) {
      const dayStart = startOfDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i));
      const dayEnd = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate(), 23, 59, 59, 999);
      const eligibleHabits = habits.filter((h) => new Date(h.createdDate) <= dayEnd && !h.archived);
      const dayLogs = logs.filter((log) => {
        const d = new Date(log.date);
        return d >= dayStart && d <= dayEnd;
      });
      const rate = this.analyticsService.calculateMicroRateAgainstHabits(dayLogs, eligibleHabits, dayStart, dayEnd);
      const label = dayStart.toLocaleDateString(undefined, { weekday: 'short' });
      trend.push({ label, value: rate });
    }
    return trend;
  });

  readonly weeklyTrend = computed<CompletionTrendPoint[]>(() => {
    const logs = this.filteredLogs();
    const habits = this.matchingHabits();
    const trend: CompletionTrendPoint[] = [];
    const now = new Date();
    for (let i = 8 - 1; i >= 0; i--) {
      const start = startOfWeek(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7));
      const end = new Date(start);
      end.setDate(end.getDate() + 6);

      let scheduled = 0;
      let completed = 0;
      const cursor = new Date(start);
      while (cursor <= end) {
        const dayStart = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
        const dayEnd = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), 23, 59, 59, 999);
        const eligibleHabits = habits.filter((h) => new Date(h.createdDate) <= dayEnd && !h.archived);
        scheduled += eligibleHabits.length;
        completed += logs.filter((log) => {
          const d = new Date(log.date);
          return d >= dayStart && d <= dayEnd && isLogCompleted(log);
        }).length;
        cursor.setDate(cursor.getDate() + 1);
      }

      const rate = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;
      trend.push({ label: `${start.getMonth() + 1}/${start.getDate()}`, value: rate });
    }
    return trend;
  });

  readonly monthlyTrend = computed<CompletionTrendPoint[]>(() =>
    this.analyticsService.buildMonthlyAverages(this.filteredLogs())
  );

  readonly insights = computed<HabitInsight[]>(() =>
    this.matchingHabits()
      .map((habit) => {
        const habitLogs = this.filteredLogs().filter((log) => log.habitId === habit.id);
        return {
          id: habit.id,
          title: habit.title,
          strength: this.analyticsService.getHabitStrength(habit, habitLogs),
          completionRate: this.analyticsService.calculateCompletionRate(habitLogs),
          streak: this.logService.getCurrentStreak(habit.id)
        };
      })
      .sort((a, b) => b.strength - a.strength)
  );

  readonly filteredInsights = computed(() => {
    const filter = this.selectedFilter();
    const data = this.insights();

    if (filter === 'strong') {
      return data.filter((item) => item.strength >= 70);
    }

    if (filter === 'needs-attention') {
      return data.filter((item) => item.strength < 40);
    }

    return data;
  });

  readonly hasData = computed(() => this.matchingHabits().length > 0 && this.filteredLogs().length > 0);

  // No goal-aware series used here; dailyTrend remains a plain per-day completion rate

  readonly topStreakLabel = computed(() => {
    // Always compute Top streak from time/tag filtered data only,
    // ignoring the Habit health filter selection.
    const data = this.insights();
    if (!data.length) {
      return '—';
    }
    const top = data.reduce((best, current) => (current.streak > best.streak ? current : best), data[0]);
    if (top.streak === 0) {
      return '—';
    }
    return `${top.streak} · ${top.title}`;
  });

  readonly focusHabit = computed(() => {
    const data = this.filteredInsights();
    if (!data.length) {
      return null;
    }
    if (this.selectedFilter() === 'needs-attention') {
      return data.reduce((worst, current) => (current.strength < worst.strength ? current : worst), data[0]);
    }
    return data[0];
  });

  readonly focusHabitTags = computed(() => {
    const focus = this.focusHabit();
    if (!focus) {
      return [];
    }
    const habit = this.matchingHabits().find((item) => item.id === focus.id);
    return habit?.tags ?? [];
  });

  

  resetFilters(): void {
    this.selectedPeriod.set('30d');
    this.selectedTag.set('all');
    this.selectedFilter.set('all');
  }

  setPeriod(period: PeriodOption): void {
    this.selectedPeriod.set(period);
  }

  setTag(tag: string): void {
    this.selectedTag.set(tag);
  }

  setFilter(filter: InsightFilter): void {
    this.selectedFilter.set(filter);
  }

  onFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as InsightFilter;
    this.setFilter(value);
  }

  goToHabit(id: number): void {
    void this.router.navigate(['/habits', id]);
  }

  private getCutoffDate(period: PeriodOption): Date | null {
    const now = new Date();
    const cutoff = new Date(now);
    switch (period) {
      case '7d':
        cutoff.setDate(now.getDate() - 7);
        return cutoff;
      case '30d':
        cutoff.setDate(now.getDate() - 30);
        return cutoff;
      case '90d':
        cutoff.setDate(now.getDate() - 90);
        return cutoff;
      case '365d':
        cutoff.setDate(now.getDate() - 365);
        return cutoff;
      default:
        return null;
    }
  }

  private periodDays(): number {
    switch (this.selectedPeriod()) {
      case '7d':
        return 7;
      case '30d':
        return 30;
      case '90d':
        return 90;
      case '365d':
        return 365;
      default:
        return 30;
    }
  }
}
