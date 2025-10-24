import { NgForOf, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { HeatmapCell } from '../../../core/services/analytics.service';

@Component({
  selector: 'app-heatmap-calendar',
  standalone: true,
  imports: [NgForOf, NgIf],
  template: `
    <div class="space-y-2">
      <div class="flex items-center justify-between text-xs text-slate-500">
        <span>{{ title }}</span>
        <span *ngIf="cells?.length">Last {{ cells.length }} days</span>
      </div>
      <div class="grid grid-cols-7 gap-1">
        <div
          *ngFor="let cell of cells"
          class="relative h-8 rounded-lg border border-slate-200 transition-colors dark:border-slate-700"
          [class.bg-emerald-100]="cell.intensity > 0 && cell.intensity <= 0.33"
          [class.bg-emerald-300]="cell.intensity > 0.33 && cell.intensity <= 0.66"
          [class.bg-emerald-500]="cell.intensity > 0.66"
          [class.bg-slate-100]="cell.intensity === 0"
          [attr.title]="cell.dayKey + ' · ' + cell.value + ' completions'"
        >
          <span class="sr-only">{{ cell.dayKey }}: {{ cell.value }}</span>
        </div>
      </div>
      <div *ngIf="!cells?.length" class="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
        Not enough data yet to display a heatmap. Log more habits to unlock insights.
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeatmapCalendarComponent {
  @Input() cells: HeatmapCell[] = [];
  @Input() title = 'Activity';
}
