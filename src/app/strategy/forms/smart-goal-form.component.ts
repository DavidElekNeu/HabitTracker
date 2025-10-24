import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-smart-goal-form',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf],
  template: `
    <section class="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header>
        <h3 class="text-base font-semibold">SMART goal details</h3>
        <p class="text-xs text-slate-500">
          Clarify what success looks like, how you'll measure it, and why the finish line matters.
        </p>
      </header>
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="flex flex-col gap-2 text-sm font-medium">
          Target metric<span class="text-rose-500">*</span>
          <input
            type="text"
            formControlName="targetMetric"
            placeholder="e.g. Jog 3 km every morning"
            class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          />
          <span class="text-xs text-rose-500" *ngIf="form.get('targetMetric')?.invalid && form.get('targetMetric')?.touched">
            Describe what you will measure.
          </span>
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium">
          Target value
          <input
            type="number"
            formControlName="targetValue"
            min="0"
            placeholder="Numerical target (optional)"
            class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium">
          Unit
          <input
            type="text"
            formControlName="measurementUnit"
            placeholder="kilometers, minutes, pages..."
            class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium">
          Deadline
          <input
            type="date"
            formControlName="deadline"
            class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
      </div>
      <label class="flex flex-col gap-2 text-sm font-medium">
        Motivation
        <textarea
          rows="3"
          formControlName="motivation"
          placeholder="Why is this habit meaningful right now? Visualize what happens when you stick with it."
          class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
        ></textarea>
      </label>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SmartGoalFormComponent {
  @Input({ required: true }) form!: FormGroup;
}
