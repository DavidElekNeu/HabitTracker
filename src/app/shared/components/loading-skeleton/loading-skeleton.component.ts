import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-loading-skeleton',
  standalone: true,
  imports: [NgFor],
  template: `
    <div class="space-y-3">
      <div
        *ngFor="let _ of skeletonArray"
        class="rounded-2xl bg-slate-200/60 animate-pulse dark:bg-slate-700/50"
        [style.height.px]="height"
      ></div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingSkeletonComponent {
  @Input() rows = 2;
  @Input() height = 24;

  get skeletonArray(): number[] {
    return Array.from({ length: this.rows });
  }
}
