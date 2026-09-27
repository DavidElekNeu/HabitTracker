import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [NgIf],
  template: `
    <div *ngIf="open" class="fixed inset-0 z-[100] animate-overlay" role="dialog" aria-modal="true">
      <div class="absolute inset-0 bg-black/40" (click)="cancel.emit()" aria-hidden="true"></div>
      <div class="absolute inset-x-4 bottom-10 mx-auto max-w-md animate-slideUp rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <h2 class="text-base font-semibold text-slate-900 dark:text-slate-100">{{ title || 'Are you sure you want to delete?' }}</h2>
        <p *ngIf="message" class="mt-1 text-sm text-slate-500 dark:text-slate-300">{{ message }}</p>
        <div class="mt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            (click)="cancel.emit()"
          >
            {{ cancelText || 'Cancel' }}
          </button>
          <button
            type="button"
            class="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            (click)="confirm.emit()"
          >
            {{ confirmText || 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmDialogComponent {
  @Input() open = false;
  @Input() title?: string;
  @Input() message?: string;
  @Input() confirmText?: string;
  @Input() cancelText?: string;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
