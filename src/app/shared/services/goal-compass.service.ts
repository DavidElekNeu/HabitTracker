import { Injectable, signal } from '@angular/core';

export interface GoalCompassProfile {
  goalName: string;
  why: string;
  vision: string;
  nextStep: string;
  completedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class GoalCompassService {
  private readonly storageKey = 'habit-tracker-goal-compass-profile';
  private readonly skipSetupKey = 'habit-tracker-goal-compass-setup-skipped';
  private readonly profileSignal = signal<GoalCompassProfile | null>(this.loadProfile());
  private readonly setupSkippedSignal = signal<boolean>(this.loadSkipState());

  readonly profile = this.profileSignal.asReadonly();
  readonly setupSkipped = this.setupSkippedSignal.asReadonly();

  hasCompletedProfile(): boolean {
    return this.isComplete(this.profileSignal());
  }

  saveProfile(
    values: Pick<GoalCompassProfile, 'goalName' | 'why' | 'vision' | 'nextStep'>
  ): GoalCompassProfile | null {
    const next: GoalCompassProfile = {
      goalName: (values.goalName ?? '').trim(),
      why: (values.why ?? '').trim(),
      vision: (values.vision ?? '').trim(),
      nextStep: (values.nextStep ?? '').trim(),
      completedAt: new Date().toISOString()
    };

    if (!this.isComplete(next)) {
      return null;
    }

    this.profileSignal.set(next);
    this.setupSkippedSignal.set(false);
    localStorage.setItem(this.storageKey, JSON.stringify(next));
    localStorage.removeItem(this.skipSetupKey);
    return next;
  }

  skipSetup(): void {
    this.setupSkippedSignal.set(true);
    localStorage.setItem(this.skipSetupKey, 'true');
  }

  clearProfile(options?: { markSetupSkipped?: boolean }): void {
    this.profileSignal.set(null);
    localStorage.removeItem(this.storageKey);

    const markSkipped = options?.markSetupSkipped ?? false;
    this.setupSkippedSignal.set(markSkipped);
    if (markSkipped) {
      localStorage.setItem(this.skipSetupKey, 'true');
      return;
    }
    localStorage.removeItem(this.skipSetupKey);
  }

  private isComplete(profile: GoalCompassProfile | null): boolean {
    if (!profile) {
      return false;
    }
    return Boolean(
      profile.goalName?.trim() && profile.why?.trim() && profile.vision?.trim() && profile.nextStep?.trim()
    );
  }

  private loadProfile(): GoalCompassProfile | null {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as Partial<GoalCompassProfile>;
      if (
        typeof parsed.goalName !== 'string' ||
        typeof parsed.why !== 'string' ||
        typeof parsed.vision !== 'string' ||
        typeof parsed.nextStep !== 'string'
      ) {
        return null;
      }
      const profile: GoalCompassProfile = {
        goalName: parsed.goalName,
        why: parsed.why,
        vision: parsed.vision,
        nextStep: parsed.nextStep,
        completedAt: typeof parsed.completedAt === 'string' ? parsed.completedAt : new Date().toISOString()
      };
      return this.isComplete(profile) ? profile : null;
    } catch {
      return null;
    }
  }

  private loadSkipState(): boolean {
    try {
      const raw = localStorage.getItem(this.skipSetupKey);
      if (raw === null) {
        return false;
      }
      if (raw === 'true') {
        return true;
      }
      if (raw === 'false') {
        return false;
      }
      const parsed = JSON.parse(raw) as unknown;
      return parsed === true;
    } catch {
      return false;
    }
  }
}
