import { Injectable, signal } from '@angular/core';

interface OnboardingState {
  dashboardIntro: boolean;
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
    const next: OnboardingState = {
      ...this.stateSignal(),
      dashboardIntro: true
    };
    this.persist(next);
    this.requestSignal.set(false);
  }

  reset(): void {
    this.persist({ dashboardIntro: false });
    this.requestSignal.set(false);
  }

  shouldShowDashboardIntro(): boolean {
    return !this.stateSignal().dashboardIntro;
  }

  openDashboardIntroNow(): void {
    this.persist({ ...this.stateSignal(), dashboardIntro: false });
    this.requestSignal.set(true);
  }

  acknowledgeRequest(): void {
    this.requestSignal.set(false);
  }

  private loadState(): OnboardingState {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return { dashboardIntro: false };
      }
      return JSON.parse(raw) as OnboardingState;
    } catch {
      return { dashboardIntro: false };
    }
  }

  private persist(state: OnboardingState): void {
    this.stateSignal.set(state);
    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }
}
