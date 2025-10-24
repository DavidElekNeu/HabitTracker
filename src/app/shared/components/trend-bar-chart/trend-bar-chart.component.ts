import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CompletionTrendPoint } from '../../../core/services/analytics.service';

@Component({
  selector: 'app-trend-bar-chart',
  standalone: true,
  imports: [NgFor, NgIf, DecimalPipe],
  template: `
    <div class="space-y-2">
      <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
        <span>{{ title }}</span>
        <span *ngIf="points.length">Avg {{ average | number: '1.0-0' }}%</span>
      </div>
      <div class="flex items-end gap-2" [attr.aria-label]="title + ' bar chart'">
        <div
          *ngFor="let point of points"
          class="flex w-full flex-col items-center gap-1 text-[10px]"
        >
          <div class="h-24 w-full overflow-hidden rounded-md bg-slate-200 dark:bg-slate-700">
            <div
              class="h-full w-full origin-bottom rounded-md bg-emerald-500 text-white transition dark:bg-emerald-400"
              [style.height.%]="Math.max(point.value, 4)"
            ></div>
          </div>
          <span class="font-medium text-slate-500 dark:text-slate-300">{{ point.label }}</span>
          <span class="text-slate-400 dark:text-slate-500">{{ point.value | number: '1.0-0' }}%</span>
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

  get average(): number {
    if (!this.points.length) {
      return 0;
    }
    const total = this.points.reduce((sum, point) => sum + point.value, 0);
    return total / this.points.length;
  }
}
