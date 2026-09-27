import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export interface CategorySlice {
  label: string;
  value: number;
  percentage: number;
}

@Component({
  selector: 'app-habit-category-chart',
  standalone: true,
  imports: [NgFor, NgIf, DecimalPipe],
  template: `
    <div class="space-y-3">
      <header class="flex items-center justify-between text-xs text-slate-500">
        <span>{{ title }}</span>
        <span *ngIf="slices.length">{{ total }} habits</span>
      </header>
      <div class="relative h-40 w-full max-w-[260px] self-center">
        <svg viewBox="0 0 36 36" class="h-full w-full">
          <circle cx="18" cy="18" r="16" fill="none" stroke="#e2e0d0" stroke-width="4"></circle>
          <ng-container *ngIf="slices.length; else emptySlice">
            <ng-container *ngFor="let slice of slices; let i = index">
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                [attr.stroke]="colors[i % colors.length]"
                stroke-width="4"
                [attr.stroke-dasharray]="slice.percentage + ' ' + (100 - slice.percentage)"
                [attr.stroke-dashoffset]="computeOffset(i)"
              ></circle>
            </ng-container>
          </ng-container>
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center text-center text-xs font-semibold text-slate-600 dark:text-slate-200">
          <span>{{ total }}</span>
          <span>habits</span>
        </div>
      </div>
      <ng-template #emptySlice>
        <circle cx="18" cy="18" r="16" fill="none" stroke="#d4a017" stroke-width="4" stroke-dasharray="0 100"></circle>
      </ng-template>
      <ul class="space-y-2 text-xs">
        <li *ngFor="let slice of slices; let i = index" class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span
              class="inline-block h-3 w-3 rounded-full"
              [style.backgroundColor]="colors[i % colors.length]"
              aria-hidden="true"
            ></span>
            <span>{{ slice.label }}</span>
          </div>
          <span class="font-semibold text-slate-600 dark:text-slate-300">{{ slice.value }} ({{ slice.percentage | number: '1.0-0' }}%)</span>
        </li>
        <li *ngIf="!slices.length" class="rounded-xl border border-dashed border-slate-300 p-3 text-center text-slate-500">
          No categories yet. Add tags to habits to see distribution.
        </li>
      </ul>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HabitCategoryChartComponent {
  @Input() slices: CategorySlice[] = [];
  @Input() title = 'Habit categories';
  @Input() total = 0;

  readonly colors = ['#d4a017', '#b37a1e', '#f0c867', '#8c6d1f', '#c97f5b', '#6a4f32'];

  computeOffset(index: number): number {
    const prior = this.slices.slice(0, index).reduce((sum, slice) => sum + slice.percentage, 0);
    return 100 - prior;
  }
}
