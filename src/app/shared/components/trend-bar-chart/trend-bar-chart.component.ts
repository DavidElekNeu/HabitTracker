import { DecimalPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CompletionTrendPoint } from '../../../core/services/analytics.service';

@Component({
  selector: 'app-trend-bar-chart',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, DecimalPipe],
  template: `
    <div class="space-y-2">
      <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
        <span>{{ title }}</span>
        <span *ngIf="points.length">Avg {{ average | number: '1.0-0' }}%</span>
      </div>
      <div [attr.aria-label]="title + ' bar chart'">
        <div class="w-full min-w-0" [ngClass]="scrollable ? 'chart-scroll' : ''">
          <div class="w-full" [ngClass]="scrollable ? 'overflow-x-auto overflow-y-hidden no-scrollbar px-3' : ''">
            <div
              class="flex items-end gap-2"
              [style.width.px]="scrollable ? points.length * barSlotWidth : null"
            >
            <div
              *ngFor="let point of points"
              class="flex flex-col items-center gap-1 text-[10px]"
              [ngClass]="scrollable ? 'flex-none' : 'w-full'"
              [style.width.px]="scrollable ? barSlotWidth : null"
            >
              <div class="relative h-24 w-full overflow-hidden rounded-md border border-slate-200 bg-slate-100 dark:border-slate-700">
                <div
                  class="h-full w-full origin-bottom rounded-md text-white transition bg-primary"
                  [style.height.%]="barHeight(point.value)"
                  [style.opacity]="point.value > 0 ? 1 : 0.00"
                  [attr.title]="point.label + ' - ' + (point.value | number: '1.0-0') + '%'"
                ></div>
              </div>
              <span class="font-medium text-slate-500 dark:text-slate-300">{{ point.label }}</span>
              <span class="text-slate-400 dark:text-slate-500">{{ point.value | number: '1.0-0' }}%</span>
            </div>
          </div>
        </div>
        </div>
        <div *ngIf="!points.length" class="flex w-full justify-center py-6 text-xs text-slate-500">
          No data yet.
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TrendBarChartComponent {
  @Input() points: CompletionTrendPoint[] = [];
  @Input() title = 'Trend';
  @Input() scrollable = false;
  readonly barSlotWidth = 22; // px per day when scrollable

  get average(): number {
    if (!this.points.length) {
      return 0;
    }
    const total = this.points.reduce((sum, point) => sum + point.value, 0);
    return total / this.points.length;
  }

  barHeight(value: number): number {
    const v = typeof value === 'number' ? value : 0;
    return Math.max(v, 4);
  }
}
