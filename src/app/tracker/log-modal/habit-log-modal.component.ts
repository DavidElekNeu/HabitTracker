import { NgIf, TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Habit } from '../../data/models/habit.model';
import { HabitLog } from '../../data/models/log.model';

@Component({
  selector: 'app-habit-log-modal',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, TitleCasePipe],
  template: `
    <div class="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <div class="absolute inset-0 bg-slate-900/60 animate-overlay" (click)="onClose()"></div>

      <div
        class="relative z-50 w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-lg animate-slideUp sm:rounded-3xl dark:bg-slate-900"
      >
        <header class="mb-4 flex items-start justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-wide text-slate-500">{{ habit?.type | titlecase }}</p>
            <h2 class="text-xl font-semibold">{{ habit?.title }}</h2>
            <p class="text-sm text-slate-500" *ngIf="habit?.description">{{ habit?.description }}</p>
          </div>
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-sm text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            (click)="onClose()"
            aria-label="Close log modal"
          >
            ✕
          </button>
        </header>

        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5">
          <div>
            <label class="flex flex-col gap-2 text-sm font-medium">
              Amount
              <input
                type="number"
                formControlName="value"
                [step]="inputStep"
                min="0"
                class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
              />
              <span class="text-xs text-slate-500" *ngIf="habit?.units">
                Units: {{ habit?.units }}
              </span>
            </label>
          </div>

          <div *ngIf="quickValues.length" class="flex flex-wrap gap-2">
            <button
              type="button"
              *ngFor="let quick of quickValues"
              class="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300"
              (click)="applyQuickValue(quick)"
            >
              +{{ quick }}
              <span *ngIf="habit?.units" class="ml-1 text-xs font-medium">{{ habit?.units }}</span>
            </button>
          </div>

          <div>
            <label class="flex flex-col gap-2 text-sm font-medium">
              Notes
              <textarea
                rows="3"
                formControlName="notes"
                placeholder="Add context or reflections..."
                class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
              ></textarea>
            </label>
          </div>

          <div class="flex items-center justify-between text-xs text-slate-500">
            <span>Press Enter to save</span>
            <span class="font-medium">{{ habit?.type | titlecase }}</span>
          </div>

          <div class="flex items-center justify-end gap-3">
            <button
              type="button"
              class="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              (click)="onClose()"
            >
              Cancel
            </button>
            <button
              type="submit"
              [disabled]="form.invalid"
              class="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save log
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HabitLogModalComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() habit: Habit | null = null;
  @Input() log?: HabitLog;

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<{ habitId: number; value: number; notes?: string }>();

  readonly form = this.fb.nonNullable.group({
    value: [0, [Validators.required, Validators.min(0)]],
    notes: ['']
  });

  get quickValues(): number[] {
    if (!this.habit) {
      return [];
    }
    if ((this.habit.schedule?.frequencyCount ?? 0) > 0) {
      return [1];
    }
    if (this.habit.type === 'quantitative') {
      const target = this.habit.schedule.dailyTargetValue ?? 4;
      const step = Math.max(1, Math.round(target / 4));
      return [step, step * 2, step * 3];
    }
    return [];
  }

  get inputStep(): number {
    if (!this.habit) {
      return 1;
    }
    if ((this.habit.schedule?.frequencyCount ?? 0) > 0) {
      return 1;
    }
    if (this.habit.type === 'quantitative') {
      return Math.min(1, this.habit.schedule.dailyTargetValue ?? 1);
    }
    return 1;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['log'] || changes['habit']) {
      this.patchForm();
    }
  }

  applyQuickValue(amount: number): void {
    const current = this.form.controls.value.value ?? 0;
    this.form.controls.value.setValue(current + amount);
  }

  submit(): void {
    if (!this.habit || this.form.invalid) {
      return;
    }
    const rawValue = this.form.controls.value.value;
    const value = typeof rawValue === 'number' ? rawValue : Number(rawValue);
    this.save.emit({
      habitId: this.habit.id!,
      value,
      notes: this.form.controls.notes.value || undefined
    });
  }

  onClose(): void {
    this.close.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.onClose();
  }

  private patchForm(): void {
    const defaultValue =
      typeof this.log?.value === 'number'
        ? this.log.value
        : this.log?.value === true
        ? 1
        : 0;
    this.form.reset({
      value: defaultValue,
      notes: this.log?.notes ?? ''
    });
  }
}
