import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgIf, NgClass } from '@angular/common';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [NgIf, NgClass],
  template: `
    <article
      class="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
      [ngClass]="{
        'bg-primary/10': variant === 'primary',
        'p-3': compact,
        'p-5': !compact
      }"
    >
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {{ label }}
      </p>
      <p class="font-semibold text-slate-900 dark:text-slate-50" [ngClass]="compact ? 'mt-1 text-xl' : 'mt-2 text-2xl'">
        {{ value }}
      </p>
      <p *ngIf="hint" class="text-xs text-slate-500 dark:text-slate-300" [ngClass]="compact ? 'mt-1' : 'mt-1'">
        {{ hint }}
      </p>
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MetricCardComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: string | number;
  @Input() hint?: string;
  @Input() variant: 'default' | 'primary' = 'default';
  @Input() compact = false;
}
