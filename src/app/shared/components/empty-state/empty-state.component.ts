import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
      <p class="mb-2 text-lg font-medium text-slate-700 dark:text-slate-200">{{ title }}</p>
      <p class="mx-auto mb-4 max-w-sm text-sm">{{ description }}</p>
      <a
        *ngIf="actionLink && actionLabel"
        [routerLink]="actionLink"
        class="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
      >
        {{ actionLabel }}
      </a>
      <button
        *ngIf="!actionLink && actionLabel"
        type="button"
        class="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
        (click)="onActionClicked()"
      >
        {{ actionLabel }}
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyStateComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) description!: string;
  @Input() actionLabel?: string;
  @Input() actionLink?: string;

  @Output() action = new EventEmitter<void>();

  onActionClicked(): void {
    this.action.emit();
  }
}
