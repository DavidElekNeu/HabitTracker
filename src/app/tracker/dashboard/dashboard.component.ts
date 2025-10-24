import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HabitService } from '../../core/services/habit.service';
import { LogService } from '../../core/services/log.service';
import { Habit } from '../../data/models/habit.model';
import { HabitLog } from '../../data/models/log.model';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton/loading-skeleton.component';
import { MetricCardComponent } from '../../shared/components/metric-card/metric-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { HabitTodayCardComponent } from '../components/habit-today-card/habit-today-card.component';
import { isHabitDueToday } from '../../core/utils/habit-utils';
import { toDayKey } from '../../core/utils/date-utils';
import { HabitLogModalComponent } from '../log-modal/habit-log-modal.component';
import { OnboardingService } from '../../shared/services/onboarding.service';
import { OnboardingOverlayComponent } from '../../shared/components/onboarding-overlay/onboarding-overlay.component';
import { SwipeActionDirective } from '../../shared/directives/swipe-action.directive';
import { HapticDirective } from '../../shared/directives/haptic.directive';
import { CommonModule } from '@angular/common';
interface HabitTodayViewModel {
  habit: Habit;
  todayLog?: HabitLog;
  streak: number;
  incrementStep: number;
  progressLabel?: string;
  isDue: boolean;
  quickChips: number[];
}

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [
    CommonModule, 
    PageHeaderComponent,
    LoadingSkeletonComponent,
    MetricCardComponent,
    EmptyStateComponent,
    HabitTodayCardComponent,
    HabitLogModalComponent,
    OnboardingOverlayComponent,
    SwipeActionDirective,
    HapticDirective,
    RouterLink,
    NgIf
  ],
  template: `
    <section class="space-y-6">
      <app-page-header
        title="Today"
        subtitle="Log progress, celebrate wins, and keep streaks alive."
        eyebrow="Dashboard"
      />

      <div class="flex justify-end">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 dark:border-slate-700 dark:text-slate-300"
          (click)="openOnboarding()"
          aria-label="Show dashboard tips"
          appHaptic="10"
        >
          <span aria-hidden="true">💡</span>
          Tips & tour
        </button>
      </div>

      <ng-container *ngIf="habitCards() as cards">
        <div class="grid gap-4 sm:grid-cols-2">
          <app-metric-card label="Habits due today" [value]="dueTodayCount()" hint="Scheduled for today" />
          <app-metric-card
            label="Completed today"
            [value]="completedToday()"
            hint="Marked as done so far"
          />
        </div>

        <app-loading-skeleton *ngIf="isLoading()" [rows]="3" [height]="112"></app-loading-skeleton>

        <div *ngIf="!isLoading() && !cards.length">
          <app-empty-state
            title="No habits due"
            description="Create or schedule habits to see them appear on your daily dashboard."
            actionLabel="Create habit"
            actionLink="/add-habit"
          />
        </div>

        <div class="grid gap-4 md:grid-cols-2" *ngIf="cards.length">
<ng-container *ngFor="let card of cards; trackBy: trackByHabitId">            
            <div
              appSwipeAction
              (swipeRight)="onToggleHabit(card)"
              (swipeLeft)="onResetHabit(card)"
              class="touch-pan-y"
            >
              <app-habit-today-card
                [habit]="card.habit"
                [todayLog]="card.todayLog"
                [streak]="card.streak"
                [incrementStep]="card.incrementStep"
                [progressLabel]="card.progressLabel"
                [isDue]="card.isDue"
                [celebrating]="activeCelebration() === card.habit.id"
                [quickChips]="card.quickChips"
                (toggle)="onToggleHabit(card)"
                (increment)="onIncrementHabit(card, $event)"
                (reset)="onResetHabit(card)"
                (logDetail)="openLogModal(card)"
              ></app-habit-today-card>
            </div>
          </ng-container>
        </div>
      </ng-container>
    </section>

    <app-onboarding-overlay *ngIf="shouldShowOnboarding()" (dismiss)="dismissOnboarding()"></app-onboarding-overlay>

    <app-habit-log-modal
      *ngIf="modalState().open"
      [habit]="modalState().habit!"
      [log]="modalState().log"
      (close)="closeLogModal()"
      (save)="handleModalSubmit($event)"
    ></app-habit-log-modal>

    <a
      routerLink="/add-habit"
      class="fixed bottom-20 right-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl text-white shadow-lg transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:bottom-10"
      aria-label="Add new habit"
      appHaptic="20"
    >
      +
    </a>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  private readonly habitService = inject(HabitService);
  private readonly logService = inject(LogService);
  private readonly onboardingService = inject(OnboardingService);

  readonly modalState = signal<{
    open: boolean;
    habit: Habit | null;
    log: HabitLog | undefined;
  }>({ open: false, habit: null, log: undefined });
  private readonly celebrationSignal = signal<number | null>(null);

  readonly activeCelebration = this.celebrationSignal.asReadonly();

  readonly isLoading = computed(
    () => this.habitService.isLoading() || this.logService.isLoading()
  );

  readonly habitCards = computed<HabitTodayViewModel[]>(() => {
    const habits = this.habitService.habits();
    const today = new Date();
    const todayKey = toDayKey(today);
    const viewModels: HabitTodayViewModel[] = [];

    for (const habit of habits) {
      if (habit.id === undefined) {
        continue;
      }

      const completedThisPeriod =
        habit.type === 'frequency'
          ? this.logService.getCompletedCount(
              habit.id,
              habit.schedule.frequencyPeriod === 'month' ? 'month' : 'week',
              today
            )
          : this.logService.getCompletedCount(habit.id, 'day', today);

      const isDue = isHabitDueToday(habit, today, {
        completedThisPeriod
      });

      const todayLog = this.logService.getLogForDate(habit.id, today);
      const streak = this.logService.getCurrentStreak(habit.id);
      const incrementStep = this.getIncrementStep(habit);
      const progressLabel = this.getProgressLabel(habit, todayKey, todayLog);

      if (!isDue && !todayLog) {
        continue;
      }

      const quickChips: number[] = [];
      if (habit.type === 'quantitative') {
        const base = Math.max(1, incrementStep);
        quickChips.push(base, base * 2);
      } else if (habit.type === 'frequency') {
        quickChips.push(1);
      }

      viewModels.push({
        habit,
        todayLog,
        streak,
        incrementStep,
        progressLabel,
        isDue,
        quickChips
      });
    }

    return viewModels;
  });

  readonly dueTodayCount = computed(() =>
    this.habitCards().filter((card) => card.isDue).length
  );
  readonly completedToday = computed(() =>
    this.habitCards().filter((card) => card.todayLog).length
  );

  readonly debugMode = signal(true);

  readonly shouldShowOnboarding = computed(
    () =>
      !this.onboardingService.state().dashboardIntro ||
      this.onboardingService.dashboardIntroRequested()
  );

  readonly debugCards = effect(() => {
    console.log('habit cards', this.habitCards());
  });

  async onToggleHabit(card: HabitTodayViewModel): Promise<void> {
    if (!card.habit.id) {
      return;
    }
    try {
      if (card.todayLog) {
        await this.logService.clearHabitLogForDate(card.habit.id, new Date());
        return;
      }
      await this.logService.setHabitLog({
        habitId: card.habit.id,
        value: true
      });
      this.triggerCelebration(card.habit.id);
    } catch (error) {
      console.error(error);
    }
  }

  async onIncrementHabit(card: HabitTodayViewModel, amount: number): Promise<void> {
    if (!card.habit.id) {
      return;
    }
    try {
      await this.logService.incrementHabitLog(card.habit.id, amount);
      this.triggerCelebration(card.habit.id);
    } catch (error) {
      console.error(error);
    }
  }

  async onResetHabit(card: HabitTodayViewModel): Promise<void> {
    if (!card.habit.id) {
      return;
    }
    try {
      await this.logService.clearHabitLogForDate(card.habit.id, new Date());
    } catch (error) {
      console.error(error);
    }
  }

  openLogModal(card: HabitTodayViewModel): void {
    this.modalState.set({
      open: true,
      habit: card.habit,
      log: card.todayLog
    });
  }

  closeLogModal(): void {
    this.modalState.set({ open: false, habit: null, log: undefined });
  }

  async handleModalSubmit(payload: { habitId: number; value: number; notes?: string }): Promise<void> {
    try {
      await this.logService.setHabitLog({
        habitId: payload.habitId,
        value: payload.value,
        notes: payload.notes
      });
      this.triggerCelebration(payload.habitId);
    } catch (error) {
      console.error(error);
    } finally {
      this.closeLogModal();
    }
  }

  dismissOnboarding(): void {
    this.onboardingService.completeDashboardIntro();
    this.onboardingService.acknowledgeRequest();
  }

  openOnboarding(): void {
    this.onboardingService.openDashboardIntroNow();
  }

  private getIncrementStep(habit: Habit): number {
    if (habit.type === 'quantitative' && habit.schedule.dailyTargetValue) {
      return Math.max(1, Math.round(habit.schedule.dailyTargetValue / 4));
    }
    if (habit.type === 'frequency') {
      return 1;
    }
    return 1;
  }

  private getProgressLabel(habit: Habit, dayKey: string, log?: HabitLog): string | undefined {
    if (habit.type === 'quantitative' && habit.schedule.dailyTargetValue) {
      const value = typeof log?.value === 'number' ? log.value : 0;
      return `${value}/${habit.schedule.dailyTargetValue} ${habit.units ?? ''}`.trim();
    }

    if (habit.type === 'frequency') {
      const completed = this.logService.getCompletedCount(
        habit.id!,
        habit.schedule.frequencyPeriod === 'month' ? 'month' : 'week'
      );
      const target = habit.schedule.frequencyCount ?? 0;
      if (!target) {
        return undefined;
      }
      return `${completed}/${target} this ${
        habit.schedule.frequencyPeriod === 'month' ? 'month' : 'week'
      }`;
    }

    return undefined;
  }

  private triggerCelebration(habitId: number): void {
    this.celebrationSignal.set(habitId);
    setTimeout(() => {
      if (this.celebrationSignal() === habitId) {
        this.celebrationSignal.set(null);
      }
    }, 900);
  }
}
