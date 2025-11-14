import { DatePipe, DecimalPipe, NgClass, NgForOf, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { HeatmapCell } from '../../../core/services/analytics.service';

@Component({
  selector: 'app-heatmap-calendar',
  standalone: true,
  imports: [NgForOf, NgIf, NgClass, DatePipe, DecimalPipe],
  template: `
    <div class="space-y-2">
      <div class="flex items-center justify-start text-xs text-slate-500 dark:text-slate-300">
        <span>{{ title }}</span>
      </div>
      <div class="grid grid-cols-7 gap-1">
        <div
          *ngFor="let cell of cells"
          class="relative h-8 rounded-lg border border-slate-200 transition-colors dark:border-slate-700"
          [class.bg-emerald-100]="cell.intensity > 0 && cell.intensity <= 0.33"
          [class.bg-emerald-300]="cell.intensity > 0.33 && cell.intensity <= 0.66"
          [class.bg-emerald-500]="cell.intensity > 0.66"
          [class.bg-slate-100]="cell.intensity === 0"
          [attr.title]="cell.scheduled && cell.scheduled > 0
            ? (cell.dayKey + ' — ' + cell.value + '/' + cell.scheduled + ' (' + ((cell.intensity * 100) | number: '1.0-0') + '%)')
            : (cell.dayKey + ' — No schedule')"
        >
          <span class="sr-only">{{ cell.dayKey }}: {{ cell.value }}</span>
          <span
            aria-hidden="true"
            class="absolute inset-0 flex items-center justify-center text-[10px] font-bold drop-shadow-[0_1px_1px_rgba(255,255,255,0.25)]"
            [style.color]="forceBlackLabels ? '#2f2410' : (accentLabels ? 'var(--accent)' : '')"
            [ngClass]="!forceBlackLabels && !accentLabels ? 'text-slate-900 dark:text-slate-50' : ''"
          >
            {{ cell.dayKey | date: 'M/d' }}
          </span>
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
  @Input() accentLabels = false;
  @Input() forceBlackLabels = false;
}
