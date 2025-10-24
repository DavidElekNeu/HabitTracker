import { NgFor } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';

interface Tip {
  title: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-onboarding-overlay',
  standalone: true,
  imports: [NgFor],
  template: `
    <div class="fixed inset-0 z-40 flex flex-col items-center justify-end bg-slate-900/60 backdrop-blur-sm sm:justify-center">
      <section
        class="w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-xl animate-slideUp focus:outline-none sm:rounded-3xl dark:bg-slate-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-onboarding-title"
        aria-describedby="dashboard-onboarding-desc"
      >
        <header class="mb-4 space-y-2 text-center" id="dashboard-onboarding-header">
          <span class="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Welcome</span>
          <h2 id="dashboard-onboarding-title" class="text-2xl font-semibold">Make the most of your dashboard</h2>
          <p id="dashboard-onboarding-desc" class="text-sm text-slate-500">
            Log from cards, open quick actions, and swipe through insights. You can re-open this guide in Settings later.
          </p>
        </header>

        <ul class="space-y-3 text-sm">
          <li *ngFor="let tip of tips" class="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
            <span class="text-lg">{{ tip.icon }}</span>
            <div>
              <p class="font-semibold">{{ tip.title }}</p>
              <p class="text-slate-500 dark:text-slate-300">{{ tip.description }}</p>
            </div>
          </li>
        </ul>

        <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
            (click)="dismiss.emit()"
          >
            Skip for now
          </button>
          <button
            type="button"
            class="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            (click)="dismiss.emit()"
            #confirmButton
          >
            Got it
          </button>
        </div>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OnboardingOverlayComponent implements AfterViewInit {
  @Output() dismiss = new EventEmitter<void>();

  readonly tips: Tip[] = [
    {
      icon: '✅',
      title: 'One-tap logging',
      description: 'Tap the primary button on each card to mark binary habits done in a second.'
    },
    {
      icon: '➕',
      title: 'Quick increments',
      description: 'Use the + buttons or "More" to log numeric amounts without leaving the dashboard.'
    },
    {
      icon: '🔔',
      title: 'Stay on track',
      description: 'Enable reminders when creating habits so you never miss a streak.'
    }
  ];

  @ViewChild('confirmButton', { static: true })
  private confirmButton?: ElementRef<HTMLButtonElement>;

  ngAfterViewInit(): void {
    this.confirmButton?.nativeElement.focus();
  }
}
