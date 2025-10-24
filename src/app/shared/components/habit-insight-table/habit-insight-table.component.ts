import { NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export interface HabitInsightRow {
  id: number;
  title: string;
  strength: number;
  completionRate: number;
  streak: number;
  type: string;
  tags: string[];
}

@Component({
  selector: 'app-habit-insight-table',
  standalone: true,
  imports: [NgFor, NgIf],
  template: `
    <div class="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
      <table class="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead class="bg-slate-50 dark:bg-slate-900/60">
          <tr>
            <th scope="col" class="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Habit</th>
            <th scope="col" class="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
            <th scope="col" class="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Strength</th>
            <th scope="col" class="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Completion</th>
            <th scope="col" class="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Streak</th>
            <th scope="col" class="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tags</th>
            <th scope="col" class="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
          <tr *ngFor="let row of rows" class="hover:bg-slate-50 dark:hover:bg-slate-800/40">
            <td class="px-4 py-2 font-medium text-slate-900 dark:text-slate-100">{{ row.title }}</td>
            <td class="px-4 py-2 text-slate-500">{{ row.type | titlecase }}</td>
            <td class="px-4 py-2">
              <div class="flex items-center gap-2">
                <div class="h-1.5 w-16 overflow-hidden rounded bg-slate-200 dark:bg-slate-700">
                  <div
                    class="h-full rounded bg-emerald-500 dark:bg-emerald-400"
                    [style.width.%]="row.strength"
                  ></div>
                </div>
                <span>{{ row.strength }}%</span>
              </div>
            </td>
            <td class="px-4 py-2">{{ row.completionRate }}%</td>
            <td class="px-4 py-2">{{ row.streak }}d</td>
            <td class="px-4 py-2">
              <span *ngIf="row.tags?.length; else noTags">{{ row.tags.join(', ') }}</span>
              <ng-template #noTags>—</ng-template>
            </td>
            <td class="px-4 py-2 text-right">
              <button
                type="button"
                class="text-xs font-semibold text-primary hover:underline"
                (click)="viewDetails.emit(row.id)"
              >
                View
              </button>
            </td>
          </tr>
          <tr *ngIf="!rows.length">
            <td colspan="7" class="px-4 py-6 text-center text-xs text-slate-500">
              No habits match the current filters.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HabitInsightTableComponent {
  @Input() rows: HabitInsightRow[] = [];
  @Output() viewDetails = new EventEmitter<number>();
}
