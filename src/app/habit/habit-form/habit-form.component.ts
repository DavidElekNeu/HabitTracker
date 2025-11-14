import { NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  GoalCompassStrategy,
  Habit,
  HabitSchedule,
  HabitStrategy,
  OkrStrategy,
  SmartStrategy,
  StrategyType,
  TinyStrategy,
  WoopStrategy
} from '../../data/models/habit.model';
import { HabitService } from '../../core/services/habit.service';
import { ReminderService } from '../../core/services/reminder.service';
import { StrategySelectorComponent } from '../../strategy/strategy-selector/strategy-selector.component';
import { SmartGoalFormComponent } from '../../strategy/forms/smart-goal-form.component';
import { WoopFormComponent } from '../../strategy/forms/woop-form.component';
import { TinyHabitFormComponent } from '../../strategy/forms/tiny-habit-form.component';
import { GoalCompassFormComponent } from '../../strategy/forms/goal-compass-form.component';
import { OkrFormComponent } from '../../strategy/forms/okr-form.component';

@Component({
  selector: 'app-habit-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    StrategySelectorComponent,
    SmartGoalFormComponent,
    WoopFormComponent,
    TinyHabitFormComponent,
    GoalCompassFormComponent,
    OkrFormComponent,
    NgIf,
    NgSwitch,
    NgSwitchCase,
    NgSwitchDefault,
    NgClass
  ],
  template: `
    <section class="mx-auto max-w-3xl space-y-6">
      

      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-6">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="flex flex-col gap-2 text-sm font-medium">
            <span class="inline-flex items-center gap-1">Title<span class="text-rose-500">*</span></span>
            <input
              type="text"
              formControlName="title"
              placeholder="Morning meditation"
              class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
            />
            <span *ngIf="form.controls.title.invalid && form.controls.title.touched" class="text-xs text-rose-500">
              Give your habit a name.
            </span>
          </label>

          <div class="flex flex-col gap-2 text-sm font-medium">
            <span class="inline-flex items-center gap-1">Type<span class="text-rose-500">*</span></span>
            <div class="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                class="w-full px-3 py-2 text-center text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                [ngClass]="form.controls.type.value === 'binary' ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-slate-50 dark:hover:bg-slate-800'"
                (click)="setHabitType('binary')"
                [attr.aria-pressed]="form.controls.type.value === 'binary'"
              >
                Binary
              </button>
              <button
                type="button"
                class="w-full border-l border-slate-200 px-3 py-2 text-center text-sm font-semibold transition dark:border-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                [ngClass]="form.controls.type.value === 'quantitative' ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-slate-50 dark:hover:bg-slate-800'"
                (click)="setHabitType('quantitative')"
                [attr.aria-pressed]="form.controls.type.value === 'quantitative'"
              >
                Quantitative
              </button>
            </div>
          </div>

          

          <div class="sm:col-span-2 flex flex-col gap-2 text-sm font-medium">
            <span class="inline-flex items-center gap-1">Goal period</span>
            <div class="grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                class="w-full px-3 py-2 text-center text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                [ngClass]="(form.controls.frequencyPeriod.value ?? 'day') === 'day' ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-slate-50 dark:hover:bg-slate-800'"
                (click)="setGoalPeriod('day')"
                [attr.aria-pressed]="(form.controls.frequencyPeriod.value ?? 'day') === 'day'"
              >
                Day
              </button>
              <button
                type="button"
                class="w-full border-l border-slate-200 px-3 py-2 text-center text-sm font-semibold transition dark:border-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                [ngClass]="form.controls.frequencyPeriod.value === 'week' ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-slate-50 dark:hover:bg-slate-800'"
                (click)="setGoalPeriod('week')"
                [attr.aria-pressed]="form.controls.frequencyPeriod.value === 'week'"
              >
                Week
              </button>
              <button
                type="button"
                class="w-full border-l border-slate-200 px-3 py-2 text-center text-sm font-semibold transition dark:border-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                [ngClass]="form.controls.frequencyPeriod.value === 'month' ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-slate-50 dark:hover:bg-slate-800'"
                (click)="setGoalPeriod('month')"
                [attr.aria-pressed]="form.controls.frequencyPeriod.value === 'month'"
              >
                Month
              </button>
            </div>
            
          </div>

          <label class="sm:col-span-2 flex flex-col gap-2 text-sm font-medium">
            Description
            <textarea
              formControlName="description"
              rows="3"
              placeholder="Add context, motivation, or instructions"
              class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
            ></textarea>
          </label>

          <ng-container *ngIf="form.controls.type.value === 'quantitative'">
            <label class="flex flex-col gap-2 text-sm font-medium">
              Daily target
              <input
                type="number"
                min="0"
                formControlName="dailyTargetValue"
                class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label class="flex flex-col gap-2 text-sm font-medium">
              Units
              <input
                type="text"
                formControlName="units"
                placeholder="minutes, glasses, pages..."
                class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
          </ng-container>

          <ng-container *ngIf="form.controls.type.value === 'frequency'">
            <label class="flex flex-col gap-2 text-sm font-medium">
              Times per period
              <input
                type="number"
                min="1"
                formControlName="frequencyCount"
                class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label class="flex flex-col gap-2 text-sm font-medium">
              Period
              <select
                formControlName="frequencyPeriod"
                class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="week">Per week</option>
                <option value="month">Per month</option>
              </select>
            </label>
          </ng-container>

          <label class="sm:col-span-2 flex flex-col gap-2 text-sm font-medium">
            Tags
            <input
              type="text"
              formControlName="tags"
              placeholder="Comma separated e.g. health, focus, routine"
              class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
            />
          </label>

          <label class="sm:col-span-2 flex items-center gap-3 text-sm font-medium">
            <input type="checkbox" formControlName="allowSkips" class="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
            Allow intentional skips without breaking streak
          </label>

          <div class="sm:col-span-2 space-y-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <label class="flex items-center justify-between text-sm font-semibold">
              <span>Reminder</span>
              <input type="checkbox" formControlName="enableReminder" class="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary" />
            </label>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Reminders send a gentle nudge at your selected time. Use "persistent" if you want the notification to stay until you log.
            </p>

            <div class="grid gap-3 sm:grid-cols-2" *ngIf="form.controls.enableReminder.value">
              <label class="flex flex-col gap-2 text-sm font-medium">
                Time
                <input
                  type="time"
                  formControlName="reminderTime"
                  class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
              <label class="flex flex-col gap-2 text-sm font-medium">
                Repeat
                <select
                  formControlName="reminderPreset"
                  (change)="onReminderPresetChange()"
                  class="rounded-xl border border-slate-200 px-4 py-2 text-base shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="daily">Every day</option>
                  <option value="weekdays">Weekdays</option>
                  <option value="custom">Custom days</option>
                </select>
              </label>
            </div>

            <div class="flex flex-wrap gap-2" *ngIf="form.controls.enableReminder.value && showCustomDays()">
              <button
                *ngFor="let day of dayOptions"
                type="button"
                class="rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                [ngClass]="form.controls.reminderDays.value?.includes(day.value) ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200'"
                (click)="toggleDay(day.value)"
                [attr.aria-pressed]="form.controls.reminderDays.value?.includes(day.value)"
                [attr.aria-label]="'Toggle ' + day.label"
              >
                {{ day.label }}
              </button>
            </div>

            <label *ngIf="form.controls.enableReminder.value" class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <input type="checkbox" formControlName="reminderPersistent" class="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
              Keep reminding until completed
            </label>
          </div>
        </div>

        <app-strategy-selector [selected]="selectedStrategy()" (selectStrategy)="onStrategySelected($event)"></app-strategy-selector>

        <div [ngSwitch]="selectedStrategy()">
          <app-smart-goal-form *ngSwitchCase="'SMART'" [form]="smartForm"></app-smart-goal-form>
          <app-woop-form *ngSwitchCase="'WOOP'" [form]="woopForm"></app-woop-form>
          <app-tiny-habit-form *ngSwitchCase="'TINY'" [form]="tinyForm"></app-tiny-habit-form>
          <app-goal-compass-form *ngSwitchCase="'GOAL_COMPASS'" [form]="goalCompassForm"></app-goal-compass-form>
          <app-okr-form *ngSwitchCase="'OKR'" [form]="okrForm"></app-okr-form>
          <div *ngSwitchDefault class="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:text-slate-300">
            No framework selected. You can add one at any time.
          </div>
        </div>

        

        <div class="flex items-center justify-end gap-3">
          <button
            type="button"
            class="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
            (click)="cancel()"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            [disabled]="form.invalid"
          >
            Save habit
          </button>
        </div>
      </form>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HabitFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly habitService = inject(HabitService);
  private readonly reminderService = inject(ReminderService);
  private readonly router = inject(Router);
  private readonly selectedStrategySignal = signal<StrategyType>('NONE');
  readonly selectedStrategy = this.selectedStrategySignal.asReadonly();

  readonly form = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    type: ['binary', Validators.required],
    units: [''],
    dailyTargetValue: [0, [Validators.min(0)]],
    frequencyCount: [1, [Validators.min(1)]],
    frequencyPeriod: ['week'],
    allowSkips: [false],
    tags: [''],
    icon: [''],
    enableReminder: [false],
    reminderTime: ['08:00'],
    reminderPreset: ['daily'],
    reminderDays: this.fb.control<number[] | null>([0, 1, 2, 3, 4, 5, 6]),
    reminderPersistent: [true],
    strategyType: ['NONE'],
    strategyNotes: ['']
  });

  readonly smartForm: FormGroup = this.fb.group({
    targetMetric: ['', Validators.required],
    targetValue: [null, [Validators.min(0)]],
    measurementUnit: [''],
    deadline: [''],
    motivation: ['']
  });

  readonly woopForm: FormGroup = this.fb.group({
    wish: ['', Validators.required],
    outcome: ['', Validators.required],
    obstacle: ['', Validators.required],
    plan: ['', Validators.required]
  });

  readonly tinyForm: FormGroup = this.fb.group({
    anchor: ['', Validators.required],
    tinyVersion: ['', Validators.required],
    celebration: ['']
  });

  readonly goalCompassForm: FormGroup = this.fb.group({
    why: ['', Validators.required],
    vision: [''],
    nextStep: ['']
  });

  readonly okrForm: FormGroup = this.fb.group({
    objective: ['', Validators.required],
    keyResult: ['', Validators.required],
    targetValue: [null, [Validators.min(0)]],
    timeframe: ['']
  });


  readonly dayOptions = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' }
  ];


  showCustomDays(): boolean {
    return this.form.controls.reminderPreset.value === 'custom';
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const type = this.selectedStrategySignal();
    let strategy: HabitStrategy | undefined;
    const notes = this.form.controls.strategyNotes.value?.trim() || undefined;

    switch (type) {
      case 'SMART':
        this.smartForm.markAllAsTouched();
        if (this.smartForm.invalid) {
          return;
        }
        strategy = { type, notes, smart: this.buildSmartStrategy() };
        break;
      case 'WOOP':
        this.woopForm.markAllAsTouched();
        if (this.woopForm.invalid) {
          return;
        }
        strategy = { type, notes, woop: this.woopForm.value as WoopStrategy };
        break;
      case 'TINY':
        this.tinyForm.markAllAsTouched();
        if (this.tinyForm.invalid) {
          return;
        }
        strategy = { type, notes, tiny: this.tinyForm.value as TinyStrategy };
        break;
      case 'GOAL_COMPASS':
        this.goalCompassForm.markAllAsTouched();
        if (this.goalCompassForm.invalid) {
          return;
        }
        strategy = { type, notes, goalCompass: this.goalCompassForm.value as GoalCompassStrategy };
        break;
      case 'OKR':
        this.okrForm.markAllAsTouched();
        if (this.okrForm.invalid) {
          return;
        }
        strategy = { type, notes, okr: this.buildOkrStrategy() };
        break;
      default:
        strategy = notes ? { type: 'NONE', notes } : undefined;
        break;
    }

    const value = this.form.value;
    const schedule: HabitSchedule = {
      allowSkips: value.allowSkips ?? false
    };

    if (value.type === 'quantitative') {
      schedule.dailyTargetValue = this.asNumber(value.dailyTargetValue);
    }

    if (value.type === 'frequency') {
      schedule.frequencyCount = this.asPositiveInt(value.frequencyCount) ?? 1;
      schedule.frequencyPeriod = (value.frequencyPeriod ?? 'week') as HabitSchedule['frequencyPeriod'];
    }

    // Optional goal period (applies to any habit type). Default to 'day'.
    schedule.frequencyPeriod = (value.frequencyPeriod ?? 'day') as HabitSchedule['frequencyPeriod'];

    const reminderConfig =
      value.enableReminder
        ? {
            reminderTimes: [value.reminderTime ?? '08:00'],
            daysOfWeek: this.resolveReminderDays(),
            persistent: value.reminderPersistent ?? false
          }
        : undefined;

    const habit: Habit = {
      title: value.title ?? '',
      description: value.description ?? undefined,
      type: value.type as Habit['type'],
      schedule,
      units: value.type === 'quantitative' ? value.units ?? undefined : undefined,
      tags: this.parseTags(value.tags),
      icon: value.icon || undefined,
      strategy,
      reminderConfig,
      createdDate: new Date().toISOString()
    };

    const created = await this.habitService.addHabit(habit);

    if (reminderConfig && created.id) {
      await this.reminderService.enableReminder(created, {
        time: reminderConfig.reminderTimes[0],
        daysOfWeek: reminderConfig.daysOfWeek,
        persistent: reminderConfig.persistent
      });
    }

    void this.router.navigate(['/habits']);
  }

  cancel(): void {
    void this.router.navigate(['/habits']);
  }

  setHabitType(type: 'binary' | 'quantitative'): void {
    this.form.controls.type.setValue(type);
  }

  setGoalPeriod(period: 'day' | 'week' | 'month'): void {
    this.form.controls.frequencyPeriod.setValue(period);
  }

  onStrategySelected(strategy: StrategyType): void {
    this.selectedStrategySignal.set(strategy);
    this.form.controls.strategyType.setValue(strategy);
  }

  onReminderPresetChange(): void {
    if (this.form.controls.reminderPreset.value === 'daily') {
      this.form.controls.reminderDays.setValue([0, 1, 2, 3, 4, 5, 6]);
    } else if (this.form.controls.reminderPreset.value === 'weekdays') {
      this.form.controls.reminderDays.setValue([1, 2, 3, 4, 5]);
    }
  }

  toggleDay(day: number): void {
    const current = new Set(this.form.controls.reminderDays.value ?? []);
    if (current.has(day)) {
      current.delete(day);
    } else {
      current.add(day);
    }
    this.form.controls.reminderDays.setValue(Array.from(current).sort());
  }

  private resolveReminderDays(): number[] {
    if (this.form.controls.reminderPreset.value === 'custom') {
      const selected = this.form.controls.reminderDays.value ?? [];
      return selected.length ? selected : [0, 1, 2, 3, 4, 5, 6];
    }
    if (this.form.controls.reminderPreset.value === 'weekdays') {
      return [1, 2, 3, 4, 5];
    }
    return [0, 1, 2, 3, 4, 5, 6];
  }

  private buildSmartStrategy(): SmartStrategy {
    const value = this.smartForm.value;
    return {
      targetMetric: value.targetMetric ?? '',
      targetValue: this.asNumber(value.targetValue),
      measurementUnit: value.measurementUnit || undefined,
      deadline: value.deadline || undefined,
      motivation: value.motivation || undefined
    };
  }

  private buildOkrStrategy(): OkrStrategy {
    const value = this.okrForm.value;
    return {
      objective: value.objective ?? '',
      keyResult: value.keyResult ?? '',
      targetValue: this.asNumber(value.targetValue),
      timeframe: value.timeframe || undefined
    };
  }

  private asNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private asPositiveInt(value: unknown): number | undefined {
    const parsed = this.asNumber(value);
    if (parsed === undefined) {
      return undefined;
    }
    return parsed > 0 ? Math.floor(parsed) : undefined;
  }

  private parseTags(tagString?: string | null): string[] | undefined {
    if (!tagString) {
      return undefined;
    }
    const tags = tagString
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    return tags.length ? tags : undefined;
  }
}
