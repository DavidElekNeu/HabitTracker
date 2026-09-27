import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-goal-compass-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section
      class="space-y-4 rounded-2xl border border-amber-900/50 bg-[#2a1d12]/70 p-4 shadow-sm"
      [formGroup]="form"
    >
      <header>
        <h3 class="text-base font-semibold text-amber-100">Goal Compass</h3>
        <p class="text-xs text-amber-200/85">
          Define one clear goal and align your direction, vision, and next move.
        </p>
      </header>
      <div class="grid gap-4">
        <label class="flex flex-col gap-2 text-sm font-medium text-amber-100">
          <span class="inline-flex items-center gap-1">Goal name<span class="text-rose-400">*</span></span>
          <input
            type="text"
            formControlName="goalName"
            placeholder="Build a healthier daily routine"
            class="rounded-xl border border-amber-900/40 bg-[#1d140d] px-4 py-2 text-base text-amber-50 shadow-sm focus:border-amber-400 focus:outline-none"
          />
        </label>

        <label class="flex flex-col gap-2 text-sm font-medium">
          <span class="inline-flex items-center gap-1 text-amber-100">Core why<span class="text-rose-400">*</span></span>
          <textarea
            rows="2"
            formControlName="why"
            placeholder="Why does this goal matter right now?"
            class="rounded-xl border border-amber-900/40 bg-[#1d140d] px-4 py-2 text-base text-amber-50 shadow-sm focus:border-amber-400 focus:outline-none"
          ></textarea>
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium text-amber-100">
          <span class="inline-flex items-center gap-1">Vision snapshot<span class="text-rose-400">*</span></span>
          <textarea
            rows="2"
            formControlName="vision"
            placeholder="Describe what success looks like when this goal is achieved."
            class="rounded-xl border border-amber-900/40 bg-[#1d140d] px-4 py-2 text-base text-amber-50 shadow-sm focus:border-amber-400 focus:outline-none"
          ></textarea>
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium text-amber-100">
          <span class="inline-flex items-center gap-1">Next main goal step<span class="text-rose-400">*</span></span>
          <textarea
            rows="2"
            formControlName="nextStep"
            placeholder="What is the next concrete action toward this goal?"
            class="rounded-xl border border-amber-900/40 bg-[#1d140d] px-4 py-2 text-base text-amber-50 shadow-sm focus:border-amber-400 focus:outline-none"
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
