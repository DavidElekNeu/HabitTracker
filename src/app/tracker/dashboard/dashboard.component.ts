import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HabitService } from '../../core/services/habit.service';
import { LogService } from '../../core/services/log.service';
import { Habit } from '../../data/models/habit.model';
import { HabitLog } from '../../data/models/log.model';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton/loading-skeleton.component';
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
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
interface HabitTodayViewModel {
  habit: Habit;
  todayLog?: HabitLog;
  streak: number;
  incrementStep: number;
  progressLabel?: string;
  isDue: boolean;
  quickChips: number[];
  isNewToday?: boolean;
}

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [
    CommonModule, 
    LoadingSkeletonComponent,
    EmptyStateComponent,
    HabitTodayCardComponent,
    HabitLogModalComponent,
    OnboardingOverlayComponent,
    SwipeActionDirective,
    HapticDirective,
    ConfirmDialogComponent,
    RouterLink,
    NgIf
  ],
  template: `
    <section class="space-y-6">

      <div class="sticky top-16 z-10 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="flex items-center justify-between text-sm">
          <div class="font-semibold">Ma: <span class="text-primary">{{ completedToday() }}</span> / {{ totalTodayCount() }} teljesítve</div>
        </div>
      </div>

      

      <ng-container *ngIf="habitCards() as cards">
        <app-loading-skeleton *ngIf="isLoading()" [rows]="3" [height]="112"></app-loading-skeleton>

        <div *ngIf="!isLoading() && !cards.length">
          <app-empty-state
            title="Nincs mára esedékes"
            description="Hozz létre vagy ütemezz szokásokat, hogy itt megjelenjenek."
          />
        </div>

        <div class="grid gap-3 md:grid-cols-2" *ngIf="cards.length">
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

    <app-confirm-dialog
      [open]="confirmResetOpen()"
      title="Biztosan törlöd?"
      message="A mai bejegyzés törlésre kerül."
      confirmText="Törlés"
      cancelText="Mégse"
      (confirm)="performReset()"
      (cancel)="confirmResetOpen.set(false)"
    />

    
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
  readonly confirmResetOpen = signal(false);
  private pendingResetHabit = signal<number | null>(null);

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
      const createdToday = this.wasCreatedToday(habit, todayKey);
      const recentlyAdded = habit.id !== undefined && this.habitService.isRecentlyAdded(habit.id);
      const hasAnyLogs = this.logService.getLogsForHabit(habit.id).length > 0;

      if (!isDue && !todayLog && !createdToday && !recentlyAdded && hasAnyLogs) {
        continue;
      }

      const quickChips: number[] = [];
      if (habit.type === 'frequency') {
        quickChips.push(1);
      }

      viewModels.push({
        habit,
        todayLog,
        streak,
        incrementStep,
        progressLabel,
        isDue,
        quickChips,
        isNewToday: createdToday || recentlyAdded
      });

      if (recentlyAdded && habit.id !== undefined) {
        this.habitService.acknowledgeHabit(habit.id);
      }
    }

    return viewModels;
  });

  readonly dueTodayCount = computed(() =>
    this.habitCards().filter((card) => card.isDue).length
  );
  readonly totalTodayCount = computed(() => this.habitCards().length);
  readonly completedToday = computed(() => {
  const cards = this.habitCards();
  let count = 0;
  for (const card of cards) {
    const type = card.habit.type;
    if (type === "binary") {
      if (card.todayLog && card.todayLog.value === true) {
        count += 1;
      }
      continue;
    }
    if (type === "quantitative") {
      const target = card.habit.schedule.dailyTargetValue ?? 0;
      const value = typeof card.todayLog?.value === "number" ? (card.todayLog.value as number) : 0;
      if (target > 0 ? value >= target : value > 0) {
        count += 1;
      }
      continue;
    }
    const freqValue = typeof card.todayLog?.value === "number" ? (card.todayLog.value as number) : 0;
    if (freqValue > 0) {
      count += 1;
    }
  }
  return count;
});

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
      const today = new Date();
      const wasCompleted = this.isCompleted(card, today);
      if (card.todayLog) {
        await this.logService.clearHabitLogForDate(card.habit.id, today);
        this.clearCelebrationGuardForDay(card.habit.id, today);
        return;
      }
      await this.logService.setHabitLog({
        habitId: card.habit.id,
        value: true
      });
      const nowCompleted = this.isCompleted(card, today);
      if (!wasCompleted && nowCompleted) {
        this.triggerCelebrationOnce(card.habit.id, today);
      }
    } catch (error) {
      console.error(error);
    }
  }

  async onIncrementHabit(card: HabitTodayViewModel, amount: number): Promise<void> {
    if (!card.habit.id) {
      return;
    }
    try {
      const today = new Date();
      const wasCompleted = this.isCompleted(card, today);
      await this.logService.incrementHabitLog(card.habit.id, amount);
      const nowCompleted = this.isCompleted(card, today);
      if (!wasCompleted && nowCompleted) {
        this.triggerCelebrationOnce(card.habit.id, today);
      } else if (wasCompleted && !nowCompleted) {
        this.clearCelebrationGuardForDay(card.habit.id, today);
      }
      
    } catch (error) {
      console.error(error);
    }
  }

  async onResetHabit(card: HabitTodayViewModel): Promise<void> {
    if (!card.habit.id) return;
    this.pendingResetHabit.set(card.habit.id);
    this.confirmResetOpen.set(true);
  }

  async performReset(): Promise<void> {
    const id = this.pendingResetHabit();
    if (!id) { this.confirmResetOpen.set(false); return; }
    try {
      const today = new Date();
      await this.logService.clearHabitLogForDate(id, today);
      this.clearCelebrationGuardForDay(id, today);
    } catch (error) {
      console.error(error);
    } finally {
      this.confirmResetOpen.set(false);
      this.pendingResetHabit.set(null);
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
      const habit = this.habitService.getHabit(payload.habitId);
      const today = new Date();
      let wasCompleted = false;
      const card = this.habitCards().find((c) => c.habit.id === payload.habitId);
      if (card) {
        wasCompleted = this.isCompleted(card, today);
      }
      await this.logService.setHabitLog({
        habitId: payload.habitId,
        value: payload.value,
        notes: payload.notes
      });
      if (card) {
        const nowCompleted = this.isCompleted(card, today);
        if (!wasCompleted && nowCompleted) {
          this.triggerCelebrationOnce(payload.habitId, today);
        } else if (wasCompleted && !nowCompleted) {
          this.clearCelebrationGuardForDay(payload.habitId, today);
        }
      }
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
    // For non-daily goal period, increments are per occurrence or unit
    const period = habit.schedule?.frequencyPeriod ?? 'day';
    if (period !== 'day') {
      return 1;
    }
    if (habit.type === 'quantitative') {
      return 1;
    }
    return 1;
  }

  private getProgressLabel(habit: Habit, dayKey: string, log?: HabitLog): string | undefined {
    const period = habit.schedule?.frequencyPeriod ?? 'day';
    if (period !== 'day' && habit.type === 'quantitative' && habit.id && habit.schedule.dailyTargetValue) {
      const sum = this.logService.getPeriodQuantitySum(habit.id, period);
      const target = habit.schedule.dailyTargetValue;
      return `${sum}/${target} this ${period === 'month' ? 'month' : 'week'}`;
    }

    if (habit.type === 'quantitative' && habit.schedule.dailyTargetValue) {
      const value = typeof log?.value === 'number' ? log.value : 0;
      return `${value}/${habit.schedule.dailyTargetValue} ${habit.units ?? ''}`.trim();
    }

    return undefined;
  }

  private isCompleted(card: HabitTodayViewModel, referenceDate: Date): boolean {
    const h = card.habit;
    if (!h.id) return false;

    const period = h.schedule?.frequencyPeriod ?? 'day';
    if (period !== 'day') {
      if (h.type === 'binary') {
        const done = this.logService.getPeriodCompletionCount(h.id, period === 'month' ? 'month' : 'week', referenceDate);
        return done >= 1;
      }
      if (h.type === 'quantitative') {
        const target = h.schedule.dailyTargetValue ?? 0;
        if (target <= 0) return false;
        const sum = this.logService.getPeriodQuantitySum(h.id, period, referenceDate);
        return sum >= target;
      }
      return false;
    }

    if (h.type === 'binary') {
      const log = this.logService.getLogForDate(h.id, referenceDate);
      return log?.value === true;
    }
    if (h.type === 'quantitative') {
      const target = h.schedule.dailyTargetValue ?? 0;
      if (target <= 0) return false;
      const log = this.logService.getLogForDate(h.id, referenceDate);
      const val = typeof log?.value === 'number' ? Number(log.value) : 0;
      return val >= target;
    }
    return false;
  }

  private wasCreatedToday(habit: Habit, todayKey: string): boolean {
    if (!habit.createdDate) {
      return false;
    }
    try {
      return toDayKey(habit.createdDate) === todayKey;
    } catch {
      return false;
    }
  }

  private readonly celebrated = new Set<string>();
  private triggerCelebrationOnce(habitId: number, when: Date): void {
    const key = `${habitId}:${toDayKey(when)}`;
    if (this.celebrated.has(key)) {
      return;
    }
    this.celebrated.add(key);
    this.celebrationSignal.set(habitId);
    setTimeout(() => {
      if (this.celebrationSignal() === habitId) {
        this.celebrationSignal.set(null);
      }
    }, 900);
  }

  private clearCelebrationGuardForDay(habitId: number, when: Date): void {
    const key = `${habitId}:${toDayKey(when)}`;
    this.celebrated.delete(key);
  }
}

