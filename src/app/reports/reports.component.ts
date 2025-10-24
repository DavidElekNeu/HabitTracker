import { AsyncPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HabitService } from '../core/services/habit.service';
import { LogService } from '../core/services/log.service';
import { AnalyticsService, CompletionTrendPoint, HeatmapCell } from '../core/services/analytics.service';
import { PageHeaderComponent } from '../shared/components/page-header/page-header.component';
import { LoadingSkeletonComponent } from '../shared/components/loading-skeleton/loading-skeleton.component';
import { MetricCardComponent } from '../shared/components/metric-card/metric-card.component';
import { EmptyStateComponent } from '../shared/components/empty-state/empty-state.component';
import { HeatmapCalendarComponent } from '../shared/components/heatmap-calendar/heatmap-calendar.component';
import { TrendBarChartComponent } from '../shared/components/trend-bar-chart/trend-bar-chart.component';
import { HabitCategoryChartComponent, CategorySlice } from '../shared/components/habit-category-chart/habit-category-chart.component';
import { HabitInsightTableComponent, HabitInsightRow } from '../shared/components/habit-insight-table/habit-insight-table.component';
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
    PageHeaderComponent,
    LoadingSkeletonComponent,
    MetricCardComponent,
    EmptyStateComponent,
    HeatmapCalendarComponent,
    TrendBarChartComponent,
    HabitCategoryChartComponent,
    HabitInsightTableComponent,
    RouterLink
  ],
  template: `
    <section class="space-y-6">
      <app-page-header
        title="Reports & Insights"
        subtitle="Understand trends, consistency, and celebrate progress over time."
        eyebrow="Analytics"
      />

      <app-loading-skeleton *ngIf="isLoading()" [rows]="3" [height]="112"></app-loading-skeleton>

      <div *ngIf="!isLoading() && !hasData()" class="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
        Log habits consistently to unlock detailed analytics, streak trends, and heatmaps.
      </div>

      <ng-container *ngIf="!isLoading() && hasData()">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <app-metric-card label="Active habits" [value]="activeHabitsCount()" hint="Currently tracking"></app-metric-card>
          <app-metric-card label="Avg completion" [value]="averageCompletionRate() + '%'" hint="Across filtered range"></app-metric-card>
          <app-metric-card label="Top streak" [value]="topStreakLabel()" hint="Best current run"></app-metric-card>
          <app-metric-card label="Entries logged" [value]="totalLogEntries()" hint="Within filters"></app-metric-card>
        </div>

        <div class="grid gap-6 lg:grid-cols-2">
          <app-heatmap-calendar [cells]="heatmapCells()" title="Recent activity"></app-heatmap-calendar>
          <app-trend-bar-chart [points]="weeklyTrend()" title="Weekly completion"></app-trend-bar-chart>
        </div>

        <div class="grid gap-6 lg:grid-cols-2">
          <app-trend-bar-chart [points]="monthlyTrend()" title="Monthly averages"></app-trend-bar-chart>
          <app-habit-category-chart [slices]="categorySlices()" [total]="categoryTotal()" title="Habit tags"></app-habit-category-chart>
        </div>

        <div class="grid gap-6 lg:grid-cols-2">
          <section class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <header class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold">Filters</h2>
                <p class="text-xs text-slate-500 dark:text-slate-300">Compare performance across tags and time ranges.</p>
              </div>
              <button
                type="button"
                class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300"
                (click)="resetFilters()"
              >
                Reset
              </button>
            </header>

            <div class="space-y-4">
              <div>
                <label class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Time range</label>
                <div class="mt-2 flex flex-wrap gap-2">
                  <button
                    *ngFor="let option of periodOptions"
                    type="button"
                    class="rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                    [ngClass]="{
                      'bg-primary/10': selectedPeriod() === option.value,
                      'text-primary': selectedPeriod() === option.value,
                      'border-primary': selectedPeriod() === option.value,
                      'border-slate-200': selectedPeriod() !== option.value
                    }"
                    (click)="setPeriod(option.value)"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </div>

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
              <h2 class="text-lg font-semibold">Habit health</h2>
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

        <app-habit-insight-table [rows]="insightRows()" (viewDetails)="goToHabit($event)"></app-habit-insight-table>
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
  readonly averageCompletionRate = computed(() =>
    this.analyticsService.calculateCompletionRate(this.filteredLogs())
  );

  readonly heatmapCells = computed<HeatmapCell[]>(() =>
    this.analyticsService.buildHeatmap(this.filteredLogs())
  );

  readonly weeklyTrend = computed<CompletionTrendPoint[]>(() =>
    this.analyticsService.buildWeeklyTrend(this.filteredLogs())
  );

  readonly monthlyTrend = computed<CompletionTrendPoint[]>(() =>
    this.analyticsService.buildMonthlyAverages(this.filteredLogs())
  );

  readonly categorySlices = computed<CategorySlice[]>(() => {
    const habits = this.matchingHabits();
    if (!habits.length) {
      return [];
    }
    const counts = new Map<string, number>();
    for (const habit of habits) {
      if (habit.tags?.length) {
        habit.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
      } else {
        counts.set('Untagged', (counts.get('Untagged') ?? 0) + 1);
      }
    }
    return Array.from(counts.entries()).map(([label, value]) => ({
      label,
      value,
      percentage: (value / habits.length) * 100
    }));
  });

  readonly categoryTotal = computed(() => this.matchingHabits().length);

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

  readonly topStreakLabel = computed(() => {
    const data = this.filteredInsights();
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

  readonly insightRows = computed<HabitInsightRow[]>(() =>
    this.filteredInsights().map((insight) => {
      const habit = this.matchingHabits().find((h) => h.id === insight.id);
      return {
        id: insight.id,
        title: insight.title,
        strength: insight.strength,
        completionRate: insight.completionRate,
        streak: insight.streak,
        type: habit?.type ?? 'binary',
        tags: habit?.tags ?? []
      };
    })
  );

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
}
