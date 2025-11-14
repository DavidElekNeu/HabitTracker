import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-okr-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section
      class="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      [formGroup]="form"
    >
      <header>
        <h3 class="text-base font-semibold">OKR snapshot</h3>
        <p class="text-xs text-slate-500">
          Connect this habit to a larger Objective and concrete Key Result so daily wins ladder up to big goals.
        </p>
      </header>
      <div class="grid gap-4">
        <label class="flex flex-col gap-2 text-sm font-medium">
          <span class="inline-flex items-center gap-1">Objective<span class="text-rose-500">*</span></span>
          <textarea
            rows="2"
            formControlName="objective"
            placeholder="What inspiring objective does this habit support?"
            class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          ></textarea>
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium">
          <span class="inline-flex items-center gap-1">Key result<span class="text-rose-500">*</span></span>
          <textarea
            rows="2"
            formControlName="keyResult"
            placeholder="Define the measurable result this habit influences. How will you know you're on track?"
            class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          ></textarea>
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium">
          Target value
          <input
            type="number"
            formControlName="targetValue"
            min="0"
            placeholder="e.g. 80"
            class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium">
          Timeframe
          <input
            type="text"
            formControlName="timeframe"
            placeholder="e.g. Q1 2024"
            class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OkrFormComponent {
  @Input({ required: true }) form!: FormGroup;
}
