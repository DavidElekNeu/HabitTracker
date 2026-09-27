import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgFor, NgIf, NgClass } from '@angular/common';

export interface StatItem {
  label: string;
  value: string | number;
  hint?: string;
}

@Component({
  selector: 'app-stats-strip',
  standalone: true,
  imports: [NgFor, NgIf, NgClass],
  template: `
    <section
      class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      aria-label="Summary statistics"
    >
      <div class="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        <ng-container *ngFor="let item of items; let i = index">
          <!-- Item -->
          <div class="min-w-0" [ngClass]="i >= 2 ? 'sm:border-slate-200 sm:pl-4 dark:sm:border-slate-700' : ''">
            <div class="flex items-baseline justify-between gap-2">
              <span class="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{{ item.label }}</span>
            </div>
            <div class="mt-0.5 flex items-baseline gap-2">
              <span
                class="truncate font-semibold text-slate-900 dark:text-slate-50"
                [ngClass]="i === highlightIndex ? 'text-primary' : ''"
                [attr.aria-label]="item.label + ' value'"
                [class.text-xl]="true"
              >
                {{ item.value }}
              </span>
            </div>
            <p *ngIf="item.hint" class="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-300">{{ item.hint }}</p>
          </div>

          <!-- Divider after second item (between left and right group) -->
          <div
            *ngIf="i === 1"
            class="col-span-2 my-2 h-px w-full bg-slate-200 dark:bg-slate-700 sm:col-span-4"
            role="separator"
            aria-hidden="true"
          ></div>
        </ng-container>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatsStripComponent {
  @Input({ required: true }) items!: StatItem[];
  @Input() highlightIndex?: number;
}
