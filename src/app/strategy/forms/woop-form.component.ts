import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-woop-form',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf],
  template: `
    <section class="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header>
        <h3 class="text-base font-semibold">WOOP plan</h3>
        <p class="text-xs text-slate-500">
          Capture your Wish, visualize the Outcome, anticipate Obstacles, and script an if-then Plan you can rely on.
        </p>
      </header>
      <div class="grid gap-4">
        <label class="flex flex-col gap-2 text-sm font-medium">
          Wish<span class="text-rose-500">*</span>
          <textarea
            rows="2"
            formControlName="wish"
            placeholder="What do you most want to accomplish? (Keep it meaningful and realistic.)"
            class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          ></textarea>
          <span class="text-xs text-rose-500" *ngIf="form.get('wish')?.invalid && form.get('wish')?.touched">
            Describe your wish in a sentence.
          </span>
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium">
          Outcome<span class="text-rose-500">*</span>
          <textarea
            rows="2"
            formControlName="outcome"
            placeholder="Describe the best thing that happens if this habit sticks."
            class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          ></textarea>
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium">
          Obstacle<span class="text-rose-500">*</span>
          <textarea
            rows="2"
            formControlName="obstacle"
            placeholder="What inner obstacle might get in the way?"
            class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          ></textarea>
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium">
          If-Then Plan<span class="text-rose-500">*</span>
          <textarea
            rows="2"
            formControlName="plan"
            placeholder="Craft a concrete if-then: If [obstacle], then I will [response]."
            class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          ></textarea>
        </label>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WoopFormComponent {
  @Input({ required: true }) form!: FormGroup;
}
