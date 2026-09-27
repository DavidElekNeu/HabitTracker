import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HabitService } from '../../core/services/habit.service';
import { LogService } from '../../core/services/log.service';
import { Habit, HabitChainTrigger } from '../../data/models/habit.model';
import { HabitLog } from '../../data/models/log.model';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton/loading-skeleton.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { HabitTodayCardComponent } from '../components/habit-today-card/habit-today-card.component';
import { getHabitPeriodTarget, isHabitDueToday } from '../../core/utils/habit-utils';
import { toDayKey } from '../../core/utils/date-utils';
import { HabitLogModalComponent } from '../log-modal/habit-log-modal.component';
import { SwipeActionDirective } from '../../shared/directives/swipe-action.directive';
import { HapticDirective } from '../../shared/directives/haptic.directive';
import { CommonModule } from '@angular/common';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { HabitChainService, HabitChainSuggestion } from '../../core/services/habit-chain.service';
import { ToastService } from '../../shared/services/toast.service';
interface HabitTodayViewModel {
  habit: Habit;
  todayLog?: HabitLog;
  streak: number;
  incrementStep: number;
  progressLabel?: string;
  isDue: boolean;
  quickChips: number[];
  chainLinkCount: number;
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
    SwipeActionDirective,
    HapticDirective,
    ConfirmDialogComponent,
    RouterLink,
    NgIf
  ],
  template: `
    <section class="space-y-6">

      <div data-tour="today-summary" class="sticky top-16 z-10 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="flex items-center justify-between text-sm">
          <div class="font-semibold">Today: <span class="text-primary">{{ completedToday() }}</span> / {{ totalTodayCount() }} completed</div>
        </div>
      </div>

      <section
        *ngIf="chainSuggestion() as chainState"
        class="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/30"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="space-y-1">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Good next step</p>
            <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ chainState.suggestion.targetHabit.title }}</p>
            <p class="text-xs text-slate-600 dark:text-slate-300">{{ chainState.suggestion.reason }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              (click)="completeSuggestedHabit()"
            >
              Do now
            </button>
            <button
              type="button"
              class="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              (click)="snoozeChainSuggestion()"
            >
              Later
            </button>
            <button
              type="button"
              class="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              (click)="dismissChainSuggestion()"
            >
              Skip
            </button>
          </div>
        </div>
      </section>

      

      <ng-container *ngIf="habitCards() as cards">
        <app-loading-skeleton *ngIf="isLoading()" [rows]="3" [height]="112"></app-loading-skeleton>

        <div data-tour="today-workspace" *ngIf="!isLoading() && !cards.length">
          <app-empty-state
            title="Nothing due today"
            description="Create or schedule habits so they appear here."
          />
        </div>

        <div data-tour="today-workspace" class="grid gap-3 md:grid-cols-2" *ngIf="cards.length">
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
                [chainLinkCount]="card.chainLinkCount"
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

    <app-habit-log-modal
      *ngIf="modalState().open"
      [habit]="modalState().habit!"
      [log]="modalState().log"
      (close)="closeLogModal()"
      (save)="handleModalSubmit($event)"
    ></app-habit-log-modal>

    <app-confirm-dialog
      [open]="confirmResetOpen()"
      title="Are you sure you want to delete?"
      message="Today's entry will be deleted."
      confirmText="Delete"
      cancelText="Cancel"
      (confirm)="performReset()"
      (cancel)="confirmResetOpen.set(false)"
    />

    
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  private readonly habitService = inject(HabitService);
  private readonly logService = inject(LogService);
  private readonly chainService = inject(HabitChainService);
  private readonly toastService = inject(ToastService);

  readonly modalState = signal<{
    open: boolean;
    habit: Habit | null;
    log: HabitLog | undefined;
  }>({ open: false, habit: null, log: undefined });
  private readonly celebrationSignal = signal<number | null>(null);

  readonly activeCelebration = this.celebrationSignal.asReadonly();
  readonly confirmResetOpen = signal(false);
  private pendingResetHabit = signal<number | null>(null);
  readonly chainSuggestion = signal<{
    suggestion: HabitChainSuggestion;
    visitedHabitIds: number[];
  } | null>(null);

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

      const period = habit.schedule.frequencyPeriod ?? 'day';
      const completedThisPeriod =
        period === 'day'
          ? this.logService.getCompletedCount(habit.id, 'day', today)
          : this.logService.getCompletedCount(habit.id, period === 'month' ? 'month' : 'week', today);

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
      const chainLinkCount = this.chainService.getLinkCount(habit.id);

      viewModels.push({
        habit,
        todayLog,
        streak,
        incrementStep,
        progressLabel,
        isDue,
        quickChips,
        chainLinkCount,
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
    const today = new Date();
    let count = 0;
    for (const card of cards) {
      if (this.isHabitCompleted(card.habit, today)) {
        count += 1;
      }
    }
    return count;
  });

  readonly debugMode = signal(true);

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
      if (this.isCompletionBlocked(card.habit, today)) {
        return;
      }
      await this.logService.setHabitLog({
        habitId: card.habit.id,
        value: true
      });
      const nowCompleted = this.isCompleted(card, today);
      if (!wasCompleted && nowCompleted) {
        this.triggerCelebrationOnce(card.habit.id, today);
        this.presentChainSuggestion(card.habit.id, 'on_complete', [card.habit.id]);
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
      if (amount > 0 && !wasCompleted && this.isCompletionBlocked(card.habit, today)) {
        return;
      }
      await this.logService.incrementHabitLog(card.habit.id, amount);
      const nowCompleted = this.isCompleted(card, today);
      if (!wasCompleted && nowCompleted) {
        this.triggerCelebrationOnce(card.habit.id, today);
        this.presentChainSuggestion(card.habit.id, 'on_complete', [card.habit.id]);
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
    if (card.habit.id !== undefined) {
      this.presentChainSuggestion(card.habit.id, 'on_open', [card.habit.id]);
    }
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
      const today = new Date();
      let wasCompleted = false;
      const card = this.habitCards().find((c) => c.habit.id === payload.habitId);
      if (card) {
        wasCompleted = this.isCompleted(card, today);
      }
      const habit = card?.habit ?? this.habitService.getHabit(payload.habitId);
      if (payload.value > 0 && !wasCompleted && habit && this.isCompletionBlocked(habit, today)) {
        return;
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
          this.presentChainSuggestion(payload.habitId, 'on_complete', [payload.habitId]);
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

  private getProgressLabel(habit: Habit, _dayKey: string, log?: HabitLog): string | undefined {
    const period = habit.schedule?.frequencyPeriod ?? 'day';
    if (period !== 'day' && habit.type === 'quantitative' && habit.id && habit.schedule.dailyTargetValue) {
      const sum = this.logService.getPeriodQuantitySum(habit.id, period);
      const target = getHabitPeriodTarget(habit, new Date());
      return `${sum}/${target} this ${period === 'month' ? 'month' : 'week'}`;
    }

    if (habit.type === 'quantitative' && habit.schedule.dailyTargetValue) {
      const value = typeof log?.value === 'number' ? log.value : 0;
      return `${value}/${habit.schedule.dailyTargetValue} ${habit.units ?? ''}`.trim();
    }

    return undefined;
  }

  private isCompleted(card: HabitTodayViewModel, referenceDate: Date): boolean {
    return this.isHabitCompleted(card.habit, referenceDate);
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

  async completeSuggestedHabit(): Promise<void> {
    const chainState = this.chainSuggestion();
    if (!chainState) {
      return;
    }

    const suggestion = chainState.suggestion;
    const target = suggestion.targetHabit;
    if (!target.id) {
      this.chainSuggestion.set(null);
      return;
    }

    const now = new Date();
    const wasCompleted = this.isHabitCompleted(target, now);
    try {
      if (!wasCompleted && this.isCompletionBlocked(target, now)) {
        return;
      }
      if (target.type === 'binary') {
        await this.logService.setHabitLog({ habitId: target.id, value: true });
      } else {
        await this.logService.incrementHabitLog(target.id, this.getIncrementStep(target));
      }

      const nowCompleted = this.isHabitCompleted(target, now);
      if (!wasCompleted && nowCompleted) {
        this.triggerCelebrationOnce(target.id, now);
      }

      const nextVisited = Array.from(new Set([...chainState.visitedHabitIds, target.id]));
      if (suggestion.trigger === 'on_complete') {
        this.presentChainSuggestion(target.id, 'on_complete', nextVisited);
      } else {
        this.chainSuggestion.set(null);
      }
    } catch (error) {
      console.error(error);
    }
  }

  snoozeChainSuggestion(): void {
    const suggestion = this.chainSuggestion();
    if (suggestion?.suggestion.targetHabit.title) {
      this.toastService.show(`Saved for later: ${suggestion.suggestion.targetHabit.title}`);
    }
    this.chainSuggestion.set(null);
  }

  dismissChainSuggestion(): void {
    this.chainSuggestion.set(null);
  }

  private presentChainSuggestion(
    sourceHabitId: number,
    trigger: HabitChainTrigger,
    visitedHabitIds: number[]
  ): void {
    const normalizedVisited = Array.from(new Set([...visitedHabitIds, sourceHabitId]));
    const candidates = this.chainService.getSuggestionsFromHabit(sourceHabitId, trigger, {
      now: new Date(),
      limit: 1,
      excludeHabitIds: normalizedVisited
    });
    const next = candidates.find((item) => !this.isSuggestionExpired(item));
    if (!next) {
      this.chainSuggestion.set(null);
      return;
    }
    this.chainSuggestion.set({
      suggestion: next,
      visitedHabitIds: normalizedVisited
    });
  }

  private isSuggestionExpired(suggestion: HabitChainSuggestion): boolean {
    if (!suggestion.expiresAt) {
      return false;
    }
    const expiresAt = new Date(suggestion.expiresAt).getTime();
    if (!Number.isFinite(expiresAt)) {
      return false;
    }
    return expiresAt <= Date.now();
  }

  private isHabitCompleted(habit: Habit, referenceDate: Date): boolean {
    if (!habit.id) return false;

    const period = habit.schedule?.frequencyPeriod ?? 'day';
    if (period !== 'day') {
      if (habit.type === 'binary') {
        const done = this.logService.getPeriodCompletionCount(
          habit.id,
          period === 'month' ? 'month' : 'week',
          referenceDate
        );
        return done >= 1;
      }
      if (habit.type === 'quantitative') {
        const target = getHabitPeriodTarget(habit, referenceDate);
        if (target <= 0) return false;
        const sum = this.logService.getPeriodQuantitySum(habit.id, period, referenceDate);
        return sum >= target;
      }
      return false;
    }

    if (habit.type === 'binary') {
      const log = this.logService.getLogForDate(habit.id, referenceDate);
      return log?.value === true;
    }
    if (habit.type === 'quantitative') {
      const target = habit.schedule.dailyTargetValue ?? 0;
      if (target <= 0) return false;
      const log = this.logService.getLogForDate(habit.id, referenceDate);
      const val = typeof log?.value === 'number' ? Number(log.value) : 0;
      return val >= target;
    }
    return false;
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
}

