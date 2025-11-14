import { NgFor } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [NgFor],
  template: `
    <div class="pointer-events-none fixed inset-x-0 bottom-16 z-[90] flex flex-col items-center gap-2 px-4 sm:bottom-6">
      <div
        *ngFor="let t of toasts.messages()"
        class="pointer-events-auto max-w-md animate-fade rounded-full border border-slate-200 bg-white/95 px-4 py-2 text-sm text-slate-800 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100"
        role="status"
        aria-live="polite"
      >
        {{ t.text }}
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToastContainerComponent {
  readonly toasts = inject(ToastService);
}

