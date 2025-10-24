import { DatePipe, NgFor, NgIf, TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HabitService } from '../../core/services/habit.service';
import { LogService } from '../../core/services/log.service';
import { Habit, StrategyType } from '../../data/models/habit.model';
import { HabitLog } from '../../data/models/log.model';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton/loading-skeleton.component';
import { MetricCardComponent } from '../../shared/components/metric-card/metric-card.component';

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
    MetricCardComponent
  ],
  template: `
    <div *ngIf="isLoading(); else detailContent">
      <app-loading-skeleton [rows]="3" [height]="96"></app-loading-skeleton>
    </div>

    <ng-template #detailContent>
      <ng-container *ngIf="habit(); else missing">
        <div class="flex items-start gap-4">
          <div *ngIf="habit()?.icon" class="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-3xl" aria-hidden="true">
            {{ habit()?.icon }}
          </div>
          <app-page-header
            class="flex-1"
            [title]="habit()?.title ?? ''"
            [subtitle]="habit()?.description"
            eyebrow="Habit Detail"
          />
        </div>

        <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <app-metric-card label="Current streak" [value]="currentStreak() + ' days'"></app-metric-card>
          <app-metric-card label="Type" [value]="habit()?.type | titlecase"></app-metric-card>
          <app-metric-card
            label="Created"
            [value]="habit()?.createdDate | date: 'mediumDate'"
          ></app-metric-card>
          <app-metric-card
            *ngIf="supplementaryMetric()"
            label="Progress"
            [value]="supplementaryMetric()!"
          ></app-metric-card>
        </div>

        <div class="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            class="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 active:scale-95 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/60"
            (click)="deleteHabit()"
          >
            Delete habit
          </button>
        </div>

        <section class="mt-8 grid gap-4 lg:grid-cols-3">
          <article class="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 class="text-lg font-semibold">Recent activity</h2>
            <ul class="mt-4 space-y-3">
              <li
                *ngFor="let log of recentLogs()"
                class="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-800"
              >
                <span>{{ log.date | date: 'mediumDate' }}</span>
                <span class="font-semibold text-emerald-600 dark:text-emerald-400">
                  {{ renderLogValue(log.value) }}
                </span>
              </li>
            </ul>
            <p *ngIf="!recentLogs().length" class="mt-6 text-sm text-slate-500">
              No logs yet. Start tracking today!
            </p>
          </article>

          <article class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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

              <dl class="space-y-2 text-sm text-slate-500" [ngSwitch]="strategy.type">
                <ng-container *ngSwitchCase="'SMART'">
                  <div class="flex justify-between">
                    <dt>Target metric</dt>
                    <dd>{{ strategy.smart?.targetMetric }}</dd>
                  </div>
                  <div class="flex justify-between" *ngIf="strategy.smart?.targetValue !== undefined">
                    <dt>Target value</dt>
                    <dd>
                      {{ strategy.smart?.targetValue }}
                      <span *ngIf="strategy.smart?.measurementUnit"> {{ strategy.smart?.measurementUnit }}</span>
                    </dd>
                  </div>
                  <div class="flex justify-between" *ngIf="strategy.smart?.deadline">
                    <dt>Deadline</dt>
                    <dd>{{ strategy.smart?.deadline | date: 'mediumDate' }}</dd>
                  </div>
                  <p *ngIf="strategy.smart?.motivation" class="text-xs text-slate-500">
                    Motivation: {{ strategy.smart?.motivation }}
                  </p>
                  <p class="text-xs text-slate-400">
                    Tip: schedule a weekly reflection to celebrate progress and course-correct toward the deadline.
                  </p>
                </ng-container>

                <ng-container *ngSwitchCase="'WOOP'">
                  <div><span class="font-semibold text-slate-600 dark:text-slate-200">Wish:</span> {{ strategy.woop?.wish }}</div>
                  <div><span class="font-semibold text-slate-600 dark:text-slate-200">Outcome:</span> {{ strategy.woop?.outcome }}</div>
                  <div><span class="font-semibold text-slate-600 dark:text-slate-200">Obstacle:</span> {{ strategy.woop?.obstacle }}</div>
                  <div><span class="font-semibold text-slate-600 dark:text-slate-200">Plan:</span> {{ strategy.woop?.plan }}</div>
                  <p class="text-xs text-slate-400">
                    When the obstacle shows up, say your if-then plan out loud to reinforce it.
                  </p>
                </ng-container>

                <ng-container *ngSwitchCase="'TINY'">
                  <div><span class="font-semibold text-slate-600 dark:text-slate-200">Anchor:</span> {{ strategy.tiny?.anchor }}</div>
                  <div><span class="font-semibold text-slate-600 dark:text-slate-200">Tiny version:</span> {{ strategy.tiny?.tinyVersion }}</div>
                  <div *ngIf="strategy.tiny?.celebration">
                    <span class="font-semibold text-slate-600 dark:text-slate-200">Celebrate by:</span> {{ strategy.tiny?.celebration }}
                  </div>
                  <p class="text-xs text-slate-400">
                    Once the tiny version feels automatic, slowly scale the habit while keeping the celebration.
                  </p>
                </ng-container>

                <ng-container *ngSwitchCase="'GOAL_COMPASS'">
                  <div><span class="font-semibold text-slate-600 dark:text-slate-200">Why:</span> {{ strategy.goalCompass?.why }}</div>
                  <div *ngIf="strategy.goalCompass?.vision">
                    <span class="font-semibold text-slate-600 dark:text-slate-200">Vision:</span> {{ strategy.goalCompass?.vision }}
                  </div>
                  <div *ngIf="strategy.goalCompass?.nextStep">
                    <span class="font-semibold text-slate-600 dark:text-slate-200">Next step:</span> {{ strategy.goalCompass?.nextStep }}
                  </div>
                  <p class="text-xs text-slate-400">
                    Keep the why visible. If motivation dips, reread the vision paragraph aloud.
                  </p>
                </ng-container>

                <ng-container *ngSwitchCase="'OKR'">
                  <div><span class="font-semibold text-slate-600 dark:text-slate-200">Objective:</span> {{ strategy.okr?.objective }}</div>
                  <div><span class="font-semibold text-slate-600 dark:text-slate-200">Key result:</span> {{ strategy.okr?.keyResult }}</div>
                  <div *ngIf="strategy.okr?.targetValue !== undefined">
                    <span class="font-semibold text-slate-600 dark:text-slate-200">Target:</span> {{ strategy.okr?.targetValue }}
                  </div>
                  <div *ngIf="strategy.okr?.timeframe">
                    <span class="font-semibold text-slate-600 dark:text-slate-200">Timeframe:</span> {{ strategy.okr?.timeframe }}
                  </div>
                  <p class="text-xs text-slate-400">
                    Align weekly checkpoints with your OKR cadence to ensure this habit feeds the larger objective.
                  </p>
                </ng-container>
              </dl>

              <p *ngIf="strategy.notes" class="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Notes: {{ strategy.notes }}
              </p>
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HabitDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly habitService = inject(HabitService);
  private readonly logService = inject(LogService);
  private readonly router = inject(Router);

  private readonly habitId = Number(this.route.snapshot.paramMap.get('id'));

  readonly habit = computed<Habit | undefined>(() => this.habitService.getHabit(this.habitId));
  readonly currentStreak = signal(0);
  readonly recentLogs = signal<HabitLog[]>([]);
  readonly isLoading = computed(() => this.habitService.isLoading() || this.logService.isLoading());
  readonly supplementaryMetric = computed(() => {
    const habit = this.habit();
    if (!habit?.id) {
      return null;
    }

    if (habit.type === 'frequency') {
      const target = habit.schedule.frequencyCount ?? 0;
      if (!target) {
        return null;
      }
      const periodLabel = habit.schedule.frequencyPeriod === 'month' ? 'month' : 'week';
      const completed = this.logService.getCompletedCount(
        habit.id,
        habit.schedule.frequencyPeriod === 'month' ? 'month' : 'week'
      );
      return `${completed}/${target} this ${periodLabel}`;
    }

    if (habit.type === 'quantitative' && habit.schedule.dailyTargetValue) {
      const todayLog = this.logService.getLogForDate(habit.id, new Date());
      const value = typeof todayLog?.value === 'number' ? todayLog.value : 0;
      return `${value}/${habit.schedule.dailyTargetValue} ${habit.units ?? ''}`.trim();
    }

    return null;
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
    const logs = this.logService
      .getLogsForHabit(this.habitId)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 7);
    this.recentLogs.set(logs);
    this.currentStreak.set(this.logService.getCurrentStreak(this.habitId));
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
    if (!confirm('Delete this habit? All associated logs will be removed.')) {
      return;
    }
    try {
      await this.logService.deleteLogsForHabit(this.habitId);
      await this.habitService.removeHabit(this.habitId);
      void this.router.navigate(['/habits']);
    } catch (error) {
      console.error(error);
    }
  }
}
