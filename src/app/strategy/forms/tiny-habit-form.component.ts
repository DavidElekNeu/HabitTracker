import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-tiny-habit-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section
      class="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      [formGroup]="form"
    >
      <header>
        <h3 class="text-base font-semibold">Tiny habit recipe</h3>
        <p class="text-xs text-slate-500">
          Anchor a tiny version of your habit to a reliable routine. Start ridiculously small so it never feels daunting.
        </p>
      </header>
      <div class="grid gap-4">
        <label class="flex flex-col gap-2 text-sm font-medium">
          Anchor<br /><span class="text-xs font-normal text-slate-500">After I...</span>
          <input
            type="text"
            formControlName="anchor"
            placeholder="After I brush my teeth"
            class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium">
          Tiny version<br /><span class="text-xs font-normal text-slate-500">I will...</span>
          <input
            type="text"
            formControlName="tinyVersion"
            placeholder="Do 2 push-ups"
            class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label class="flex flex-col gap-2 text-sm font-medium">
          Celebration<br /><span class="text-xs font-normal text-slate-500">And celebrate by...</span>
          <input
            type="text"
            formControlName="celebration"
            placeholder="High-five myself"
            class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TinyHabitFormComponent {
  @Input({ required: true }) form!: FormGroup;
}
