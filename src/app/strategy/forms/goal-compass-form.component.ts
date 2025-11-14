import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-goal-compass-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section
      class="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      [formGroup]="form"
    >
      <header>
        <h3 class="text-base font-semibold">Goal Compass</h3>
        <p class="text-xs text-slate-500">
          Align this habit with your deeper purpose, visualise the future, and outline the next bold step.
        </p>
      </header>
      <div class="grid gap-4">
        <label class="flex flex-col gap-2 text-sm font-medium">
          <span class="inline-flex items-center gap-1">Core why<span class="text-rose-500">*</span></span>
          <textarea
            rows="2"
            formControlName="why"
            placeholder="Why does this habit matter for who you want to become?"
            class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          ></textarea>
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium">
          Vision snapshot
          <textarea
            rows="2"
            formControlName="vision"
            placeholder="Paint a vivid picture of success."
            class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          ></textarea>
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium">
          Next courageous step
          <textarea
            rows="2"
            formControlName="nextStep"
            placeholder="What action will keep you moving toward the vision?"
            class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          ></textarea>
        </label>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoalCompassFormComponent {
  @Input({ required: true }) form!: FormGroup;
}
