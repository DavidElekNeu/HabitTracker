import { NgClass, NgFor } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';
import { StrategyType } from '../../data/models/habit.model';

interface StrategyOption {
  type: StrategyType;
  title: string;
  description: string;
  subtitle?: string;
}

@Component({
  standalone: true,
  selector: 'app-strategy-selector',
  imports: [NgFor, NgClass],
  template: `
    <section class="space-y-3">
      <h3 class="text-lg font-semibold">Strategy</h3>
      <p class="text-sm text-slate-500">
        Choose a framework to guide this habit's setup. Each option provides coaching prompts to help you define a clear plan.
      </p>

      <div class="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          *ngFor="let strategy of strategyOptions"
          class="rounded-2xl border p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 dark:border-slate-800"
          [ngClass]="{
            'border-primary bg-primary/5 shadow-sm dark:bg-primary/10':
              selected === strategy.type,
            'border-slate-200 bg-white hover:border-primary hover:shadow dark:bg-slate-900':
              selected !== strategy.type
          }"
          (click)="onSelect(strategy.type)"
          [attr.aria-pressed]="selected === strategy.type"
        >
          <p class="text-sm font-semibold text-primary">{{ strategy.title }}</p>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-300">
            {{ strategy.description }}
          </p>
          <p
            *ngIf="strategy.subtitle"
            class="mt-2 text-[11px] uppercase tracking-wide text-slate-400"
          >
            {{ strategy.subtitle }}
          </p>
        </button>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StrategySelectorComponent {
  // 👇 Single source of truth from parent
  @Input() selected: StrategyType = 'NONE';

  @Output() selectStrategy = new EventEmitter<StrategyType>();

  readonly strategyOptions: StrategyOption[] = [
    {
      type: 'SMART',
      title: 'SMART Goal',
      description:
        'Clarify what success looks like with measurable targets and a timeline.',
      subtitle:
        'Specific - Measurable - Achievable - Relevant - Time-bound'
    },
    {
      type: 'WOOP',
      title: 'WOOP Plan',
      description:
        'Visualize your Wish, Outcome, Obstacles, and if-then Plan to stay resilient.'
    },
    {
      type: 'TINY',
      title: 'Tiny Habit',
      description:
        'Anchor a tiny version of your habit to an existing routine for easy wins.'
    },
    {
      type: 'OKR',
      title: 'OKR Snapshot',
      description:
        'Connect daily habits to a larger Objective and measurable Key Result.'
    },
    {
      type: 'NONE',
      title: 'Track only',
      description:
        'Skip structured frameworks and just log progress.'
    }
  ];

  onSelect(strategy: StrategyType): void {
    // don't locally mutate anything, just tell the parent
    if (strategy !== this.selected) {
      this.selectStrategy.emit(strategy);
    }
  }
}
