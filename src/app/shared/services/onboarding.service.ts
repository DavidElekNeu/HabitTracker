import { Injectable, signal } from '@angular/core';

interface OnboardingState {
  dashboardIntro: boolean;
  fullWalkthrough: boolean;
  startupAnimationSeen: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class OnboardingService {
  private readonly storageKey = 'habit-tracker-onboarding';
  private readonly stateSignal = signal<OnboardingState>(this.loadState());
  private readonly requestSignal = signal<boolean>(false);

  readonly state = this.stateSignal.asReadonly();
  readonly dashboardIntroRequested = this.requestSignal.asReadonly();

  completeDashboardIntro(): void {
    const completed = this.createCompletedState();
    const next: OnboardingState = {
      ...completed
    };
    this.persist(next);
    this.requestSignal.set(false);
  }

  reset(): void {
    this.persist({
      ...this.createUnfinishedState(),
      startupAnimationSeen: true
    });
    this.requestSignal.set(false);
  }

  shouldShowDashboardIntro(): boolean {
    return !this.stateSignal().fullWalkthrough;
  }

  openDashboardIntroNow(): void {
    this.persist({
      ...this.createUnfinishedState(),
      startupAnimationSeen: true
    });
    this.requestSignal.set(true);
  }

  markStartupAnimationSeen(): void {
    this.persist({
      ...this.stateSignal(),
      startupAnimationSeen: true
    });
  }

  acknowledgeRequest(): void {
    this.requestSignal.set(false);
  }

  private loadState(): OnboardingState {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return this.createUnfinishedState();
      }
      const parsed = JSON.parse(raw) as Partial<OnboardingState>;
      const completed = Boolean(parsed.fullWalkthrough ?? parsed.dashboardIntro);
      const base = completed ? this.createCompletedState() : this.createUnfinishedState();
      const hasExplicitStartupFlag = typeof parsed.startupAnimationSeen === 'boolean';
      return {
        ...base,
        startupAnimationSeen: hasExplicitStartupFlag ? parsed.startupAnimationSeen! : true
      };
    } catch {
      return this.createUnfinishedState();
    }
  }

  private persist(state: OnboardingState): void {
    this.stateSignal.set(state);
    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }

  private createCompletedState(): OnboardingState {
    return {
      dashboardIntro: true,
      fullWalkthrough: true,
      startupAnimationSeen: true
    };
  }

  private createUnfinishedState(): OnboardingState {
    return {
      dashboardIntro: false,
      fullWalkthrough: false,
      startupAnimationSeen: false
    };
  }
}
