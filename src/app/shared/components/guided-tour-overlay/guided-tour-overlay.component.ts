import { NgClass, NgIf } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { OnboardingService } from '../../services/onboarding.service';
import { TutorialSampleHabitsService } from '../../services/tutorial-sample-habits.service';

type ArrowDirection = 'up' | 'down' | 'left' | 'right' | 'none';

interface WalkthroughStep {
  id: string;
  route: string;
  selectors: string[];
  title: string;
  description: string;
}

interface SpotlightBounds {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

interface CardPlacement {
  top: number;
  left: number;
  width: number;
  arrowDirection: ArrowDirection;
  arrowOffsetX: number;
  arrowOffsetY: number;
}

@Component({
  selector: 'app-guided-tour-overlay',
  standalone: true,
  imports: [NgIf, NgClass],
  template: `
    <div class="tour-root" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-desc">
      <div *ngIf="!spotlight()" class="tour-mask" [style.top.px]="0" [style.left.px]="0" [style.width.px]="viewportWidth()" [style.height.px]="viewportHeight()"></div>
      <ng-container *ngIf="spotlight() as hole">
        <div class="tour-mask" [style.top.px]="0" [style.left.px]="0" [style.width.px]="viewportWidth()" [style.height.px]="hole.top"></div>
        <div class="tour-mask" [style.top.px]="hole.top" [style.left.px]="0" [style.width.px]="hole.left" [style.height.px]="hole.height"></div>
        <div
          class="tour-mask"
          [style.top.px]="hole.top"
          [style.left.px]="hole.right"
          [style.width.px]="viewportWidth() - hole.right"
          [style.height.px]="hole.height"
        ></div>
        <div
          class="tour-mask"
          [style.top.px]="hole.bottom"
          [style.left.px]="0"
          [style.width.px]="viewportWidth()"
          [style.height.px]="viewportHeight() - hole.bottom"
        ></div>

        <div
          class="tour-spotlight"
          [style.top.px]="hole.top"
          [style.left.px]="hole.left"
          [style.width.px]="hole.width"
          [style.height.px]="hole.height"
        ></div>
      </ng-container>

      <div
        #card
        class="tour-card"
        [class.tour-card--hidden]="!cardReady()"
        [style.top.px]="placement().top"
        [style.left.px]="placement().left"
        [style.width.px]="placement().width"
        [style.--tour-arrow-x.px]="placement().arrowOffsetX"
        [style.--tour-arrow-y.px]="placement().arrowOffsetY"
      >
        <div class="tour-chip">Step {{ stepNumber() }} / {{ totalSteps() }}</div>
        <h2 id="tour-title" class="tour-title">{{ currentStep().title }}</h2>
        <p id="tour-desc" class="tour-description">{{ currentStep().description }}</p>
        <p *ngIf="targetMissing()" class="tour-missing">
          This area is still loading on this device view, so the tour will continue.
        </p>

        <div class="tour-actions">
          <button type="button" class="tour-btn tour-btn--ghost" (click)="skip()">Skip tutorial</button>
          <button type="button" class="tour-btn tour-btn--ghost" (click)="previous()" [disabled]="isFirstStep()">Back</button>
          <button type="button" class="tour-btn tour-btn--primary" (click)="next()">
            {{ isLastStep() ? 'Finish' : 'Next' }}
          </button>
        </div>

        <div
          *ngIf="placement().arrowDirection !== 'none'"
          class="tour-arrow"
          [ngClass]="'tour-arrow--' + placement().arrowDirection"
        ></div>
      </div>
    </div>
  `,
  styles: [
    `
      .tour-root {
        position: fixed;
        inset: 0;
        z-index: 140;
        pointer-events: auto;
      }

      .tour-mask {
        position: fixed;
        background: rgba(12, 10, 9, 0.7);
        backdrop-filter: blur(1px);
        -webkit-backdrop-filter: blur(1px);
      }

      .tour-spotlight {
        position: fixed;
        border: 2px solid color-mix(in srgb, var(--accent) 70%, white);
        border-radius: 16px;
        box-shadow: 0 0 0 200vmax rgba(0, 0, 0, 0.08);
        pointer-events: none;
      }

      .tour-card {
        position: fixed;
        max-width: min(360px, calc(100vw - 2rem));
        border-radius: 18px;
        border: 1px solid color-mix(in srgb, var(--accent) 18%, #ffffff);
        background: var(--paper);
        color: var(--text-1);
        padding: 1rem;
        box-shadow: 0 20px 45px rgba(0, 0, 0, 0.35);
        transition: opacity 140ms ease;
      }

      .tour-card--hidden {
        opacity: 0;
        pointer-events: none;
      }

      html.dark .tour-card {
        background: var(--brown-900);
        color: var(--on-surface-dark);
        border-color: var(--brown-700);
      }

      .tour-chip {
        display: inline-flex;
        align-items: center;
        border-radius: 9999px;
        border: 1px solid color-mix(in srgb, var(--accent) 50%, white);
        background: color-mix(in srgb, var(--accent) 15%, transparent);
        color: var(--accent);
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.03em;
        padding: 0.2rem 0.55rem;
      }

      .tour-title {
        margin: 0.65rem 0 0.4rem;
        font-size: 1.08rem;
        font-weight: 700;
      }

      .tour-description {
        margin: 0;
        font-size: 0.88rem;
        line-height: 1.4;
        color: var(--text-muted-light);
      }

      html.dark .tour-description {
        color: var(--text-muted-dark);
      }

      .tour-missing {
        margin: 0.6rem 0 0;
        font-size: 0.74rem;
        color: var(--text-subtle-light);
      }

      html.dark .tour-missing {
        color: var(--text-subtle-dark);
      }

      .tour-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        margin-top: 0.95rem;
      }

      .tour-btn {
        border-radius: 9999px;
        border: 1px solid transparent;
        font-size: 0.79rem;
        font-weight: 700;
        padding: 0.42rem 0.85rem;
        cursor: pointer;
      }

      .tour-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .tour-btn--ghost {
        border-color: color-mix(in srgb, var(--accent) 22%, #cbd5e1);
        background: transparent;
        color: inherit;
      }

      .tour-btn--primary {
        background: var(--accent);
        color: #ffffff;
      }

      .tour-arrow {
        position: absolute;
        width: 14px;
        height: 14px;
        transform: rotate(45deg);
        background: inherit;
        border-left: inherit;
        border-top: inherit;
      }

      .tour-arrow--up {
        top: -8px;
        left: calc(var(--tour-arrow-x) - 7px);
      }

      .tour-arrow--down {
        bottom: -8px;
        left: calc(var(--tour-arrow-x) - 7px);
      }

      .tour-arrow--left {
        left: -8px;
        top: calc(var(--tour-arrow-y) - 7px);
      }

      .tour-arrow--right {
        right: -8px;
        top: calc(var(--tour-arrow-y) - 7px);
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GuidedTourOverlayComponent implements AfterViewInit, OnDestroy {
  private readonly onboarding = inject(OnboardingService);
  private readonly router = inject(Router);
  private readonly tutorialSampleHabits = inject(TutorialSampleHabitsService);

  @ViewChild('card', { static: true })
  private cardRef?: ElementRef<HTMLDivElement>;

  private readonly steps: WalkthroughStep[] = [
    {
      id: 'today-summary',
      route: '/',
      selectors: ['[data-tour="today-summary"]'],
      title: 'Today progress overview',
      description: 'This strip tracks completed habits versus total habits visible for today.'
    },
    {
      id: 'today-logging',
      route: '/',
      selectors: ['[data-tour="today-workspace"]'],
      title: 'Quick logging area',
      description: 'Log instantly from cards: Done for binary habits, plus/minus for numeric goals, and swipe actions.'
    },
    {
      id: 'go-habits',
      route: '/',
      selectors: ['[data-tour="nav-habits"]'],
      title: 'Habits tab',
      description: 'Open Habits to browse everything you track and manage each habit.'
    },
    {
      id: 'habits-controls',
      route: '/habits',
      selectors: ['[data-tour="habits-controls"]'],
      title: 'Search, filter, sort',
      description: 'Use these controls to quickly find habits by name, type, and order.'
    },
    {
      id: 'habits-catalog',
      route: '/habits',
      selectors: ['[data-tour="habits-catalog"]'],
      title: 'Habit cards',
      description: 'Each card opens details, streak history, and delete actions from the menu.'
    },
    {
      id: 'add-basics',
      route: '/add-habit',
      selectors: ['[data-tour="add-title"]', '[data-tour="add-form"]'],
      title: 'Habit setup form',
      description: 'Define title, habit type, period, and optional target values before saving.'
    },
    {
      id: 'add-reminders',
      route: '/add-habit',
      selectors: ['[data-tour="add-reminder"]'],
      title: 'Reminder options',
      description: 'Enable reminders, choose time/day pattern, and optionally keep reminders persistent.'
    },
    {
      id: 'go-reports',
      route: '/add-habit',
      selectors: ['[data-tour="nav-reports"]'],
      title: 'Reports tab',
      description: 'Reports transforms your logs into trend and consistency insights.'
    },
    {
      id: 'reports-overview',
      route: '/reports',
      selectors: ['[data-tour="reports-panel"]'],
      title: 'Analytics and habit health',
      description: 'Review completion rates, streak momentum, and habits that need attention.'
    },
    {
      id: 'go-settings',
      route: '/reports',
      selectors: ['[data-tour="nav-settings"]'],
      title: 'Settings tab',
      description: 'Settings lets you control appearance, reminders, and profile details.'
    },
    {
      id: 'settings-onboarding',
      route: '/settings',
      selectors: ['[data-tour="settings-onboarding"]'],
      title: 'Replay tutorial later',
      description: 'If you want another guided run, reopen this full tour from Settings.'
    }
  ];

  private readonly viewportWidthSignal = signal<number>(window.innerWidth);
  private readonly viewportHeightSignal = signal<number>(window.innerHeight);
  private readonly stepIndexSignal = signal(0);
  private readonly spotlightSignal = signal<SpotlightBounds | null>(null);
  private readonly cardReadySignal = signal(false);
  private readonly placementSignal = signal<CardPlacement>({
    top: 24,
    left: 24,
    width: 340,
    arrowDirection: 'none',
    arrowOffsetX: 24,
    arrowOffsetY: 24
  });
  private readonly targetMissingSignal = signal(false);

  private currentTarget: HTMLElement | null = null;
  private navigationSub?: Subscription;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private viewportTicking = false;
  private stepToken = 0;
  private readonly onViewportChangeBound = () => this.queueViewportUpdate();

  readonly currentStep = computed(() => this.steps[this.stepIndexSignal()]);
  readonly totalSteps = computed(() => this.steps.length);
  readonly stepNumber = computed(() => this.stepIndexSignal() + 1);
  readonly isFirstStep = computed(() => this.stepIndexSignal() === 0);
  readonly isLastStep = computed(() => this.stepIndexSignal() === this.steps.length - 1);
  readonly spotlight = this.spotlightSignal.asReadonly();
  readonly cardReady = this.cardReadySignal.asReadonly();
  readonly placement = this.placementSignal.asReadonly();
  readonly targetMissing = this.targetMissingSignal.asReadonly();
  readonly viewportWidth = this.viewportWidthSignal.asReadonly();
  readonly viewportHeight = this.viewportHeightSignal.asReadonly();

  async ngAfterViewInit(): Promise<void> {
    try {
      await this.tutorialSampleHabits.ensurePresent();
    } catch (error) {
      console.error(error);
    }

    this.navigationSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        void this.prepareCurrentStep();
      });

    window.addEventListener('resize', this.onViewportChangeBound, { passive: true });
    window.addEventListener('scroll', this.onViewportChangeBound, { passive: true, capture: true });

    await this.prepareCurrentStep();
  }

  ngOnDestroy(): void {
    this.navigationSub?.unsubscribe();
    this.navigationSub = undefined;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    window.removeEventListener('resize', this.onViewportChangeBound);
    window.removeEventListener('scroll', this.onViewportChangeBound, true);
  }

  async next(): Promise<void> {
    if (this.isLastStep()) {
      await this.finish();
      return;
    }
    this.stepIndexSignal.update((value) => Math.min(value + 1, this.steps.length - 1));
    await this.prepareCurrentStep();
  }

  async previous(): Promise<void> {
    if (this.isFirstStep()) {
      return;
    }
    this.stepIndexSignal.update((value) => Math.max(value - 1, 0));
    await this.prepareCurrentStep();
  }

  async skip(): Promise<void> {
    try {
      await this.tutorialSampleHabits.removeAll();
    } catch (error) {
      console.error(error);
    }
    this.onboarding.completeDashboardIntro();
    this.onboarding.acknowledgeRequest();
    if (this.router.url !== '/') {
      await this.router.navigate(['/']);
    }
  }

  private async finish(): Promise<void> {
    try {
      await this.tutorialSampleHabits.removeAll();
    } catch (error) {
      console.error(error);
    }
    this.onboarding.completeDashboardIntro();
    this.onboarding.acknowledgeRequest();
    if (this.router.url !== '/') {
      await this.router.navigate(['/']);
    }
  }

  private queueViewportUpdate(): void {
    if (this.viewportTicking) {
      return;
    }
    this.viewportTicking = true;
    requestAnimationFrame(() => {
      this.viewportTicking = false;
      this.viewportWidthSignal.set(window.innerWidth);
      this.viewportHeightSignal.set(window.innerHeight);
      if (this.currentTarget) {
        this.placeForTarget(this.currentTarget);
      } else {
        this.placeForTarget(null);
      }
    });
  }

  private async prepareCurrentStep(): Promise<void> {
    this.cardReadySignal.set(false);

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    const token = ++this.stepToken;
    const step = this.currentStep();

    if (!this.matchesRoute(step.route)) {
      await this.router.navigateByUrl(step.route);
      if (token !== this.stepToken) {
        return;
      }
    }

    const target = await this.waitForTarget(step.selectors, token);
    if (token !== this.stepToken) {
      return;
    }

    this.currentTarget = target;
    this.targetMissingSignal.set(!target);

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      window.setTimeout(() => {
        if (token === this.stepToken) {
          this.placeForTarget(target);
        }
      }, 160);
      return;
    }

    this.placeForTarget(null);
  }

  private matchesRoute(expected: string): boolean {
    const url = this.router.url.split('?')[0];
    return url === expected;
  }

  private async waitForTarget(selectors: string[], token: number): Promise<HTMLElement | null> {
    return new Promise<HTMLElement | null>((resolve) => {
      const started = Date.now();
      const timeoutMs = 4200;

      const tick = () => {
        if (token !== this.stepToken) {
          resolve(null);
          return;
        }

        const found = this.findVisibleElement(selectors);
        if (found) {
          resolve(found);
          return;
        }

        if (Date.now() - started >= timeoutMs) {
          resolve(null);
          return;
        }

        this.pollTimer = setTimeout(tick, 120);
      };

      tick();
    });
  }

  private findVisibleElement(selectors: string[]): HTMLElement | null {
    for (const selector of selectors) {
      const candidates = Array.from(document.querySelectorAll<HTMLElement>(selector));
      const visible = candidates.find((element) => {
        const rect = element.getBoundingClientRect();
        const styles = window.getComputedStyle(element);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          styles.display !== 'none' &&
          styles.visibility !== 'hidden' &&
          styles.opacity !== '0'
        );
      });
      if (visible) {
        return visible;
      }
    }
    return null;
  }

  private placeForTarget(target: HTMLElement | null): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 16;
    const width = Math.min(360, Math.max(280, vw - margin * 2));
    const cardHeight = this.cardRef?.nativeElement.offsetHeight ?? 220;

    this.viewportWidthSignal.set(vw);
    this.viewportHeightSignal.set(vh);

    if (!target) {
      const centered: CardPlacement = {
        top: this.clamp(vh * 0.5 - cardHeight * 0.5, margin, Math.max(margin, vh - cardHeight - margin)),
        left: this.clamp(vw * 0.5 - width * 0.5, margin, Math.max(margin, vw - width - margin)),
        width,
        arrowDirection: 'none',
        arrowOffsetX: width * 0.5,
        arrowOffsetY: cardHeight * 0.5
      };
      this.placementSignal.set(centered);
      this.spotlightSignal.set(null);
      this.cardReadySignal.set(true);
      return;
    }

    const targetRect = target.getBoundingClientRect();
    const spotlight = this.buildSpotlight(targetRect, vw, vh);
    const gap = 18;
    const spaceAbove = spotlight.top - margin;
    const spaceBelow = vh - spotlight.bottom - margin;
    const spaceLeft = spotlight.left - margin;
    const spaceRight = vw - spotlight.right - margin;
    let placement: CardPlacement = {
      top: this.clamp(vh * 0.5 - cardHeight * 0.5, margin, Math.max(margin, vh - cardHeight - margin)),
      left: this.clamp(vw * 0.5 - width * 0.5, margin, Math.max(margin, vw - width - margin)),
      width,
      arrowDirection: 'none',
      arrowOffsetX: width * 0.5,
      arrowOffsetY: cardHeight * 0.5
    };

    if (spaceBelow >= cardHeight + gap) {
      const left = this.clamp(spotlight.centerX - width * 0.5, margin, Math.max(margin, vw - width - margin));
      placement = {
        top: spotlight.bottom + gap,
        left,
        width,
        arrowDirection: 'up',
        arrowOffsetX: this.clamp(spotlight.centerX - left, 22, width - 22),
        arrowOffsetY: 18
      };
    } else if (spaceAbove >= cardHeight + gap) {
      const left = this.clamp(spotlight.centerX - width * 0.5, margin, Math.max(margin, vw - width - margin));
      placement = {
        top: spotlight.top - cardHeight - gap,
        left,
        width,
        arrowDirection: 'down',
        arrowOffsetX: this.clamp(spotlight.centerX - left, 22, width - 22),
        arrowOffsetY: cardHeight - 18
      };
    } else if (spaceRight >= width + gap) {
      const top = this.clamp(spotlight.centerY - cardHeight * 0.5, margin, Math.max(margin, vh - cardHeight - margin));
      placement = {
        top,
        left: spotlight.right + gap,
        width,
        arrowDirection: 'left',
        arrowOffsetX: 18,
        arrowOffsetY: this.clamp(spotlight.centerY - top, 22, cardHeight - 22)
      };
    } else if (spaceLeft >= width + gap) {
      const top = this.clamp(spotlight.centerY - cardHeight * 0.5, margin, Math.max(margin, vh - cardHeight - margin));
      placement = {
        top,
        left: spotlight.left - width - gap,
        width,
        arrowDirection: 'right',
        arrowOffsetX: width - 18,
        arrowOffsetY: this.clamp(spotlight.centerY - top, 22, cardHeight - 22)
      };
    }

    this.placementSignal.set(placement);
    this.spotlightSignal.set(spotlight);
    this.cardReadySignal.set(true);
  }

  private buildSpotlight(rect: DOMRect, vw: number, vh: number): SpotlightBounds {
    const pad = 10;
    const top = this.clamp(rect.top - pad, 8, Math.max(8, vh - 48));
    const left = this.clamp(rect.left - pad, 8, Math.max(8, vw - 48));
    const right = this.clamp(rect.right + pad, 48, Math.max(48, vw - 8));
    const bottom = this.clamp(rect.bottom + pad, 48, Math.max(48, vh - 8));
    const width = Math.max(32, right - left);
    const height = Math.max(32, bottom - top);

    return {
      top,
      left,
      right,
      bottom,
      width,
      height,
      centerX: left + width / 2,
      centerY: top + height / 2
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
