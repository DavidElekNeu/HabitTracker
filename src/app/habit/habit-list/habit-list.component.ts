import { DatePipe, NgFor, NgIf, TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HabitService } from '../../core/services/habit.service';
import { LogService } from '../../core/services/log.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton/loading-skeleton.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-habit-list',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    RouterLink,
    DatePipe,
    TitleCasePipe,
    PageHeaderComponent,
    LoadingSkeletonComponent,
    EmptyStateComponent
  ],
  template: `
    <section class="space-y-6">
      <app-page-header
        title="Habits"
        subtitle="Manage routines, adjust priorities, and keep your system organised."
        eyebrow="Manage"
      />

      <div class="flex flex-wrap gap-3 text-sm text-slate-500 dark:text-slate-300">
        <span class="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">Active: {{ activeCount() }}</span>
        <span class="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">Archived: {{ archivedCount() }}</span>
      </div>

      <div class="flex justify-end">
        <a
          routerLink="/add-habit"
          class="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
        >
          New habit
        </a>
      </div>

      <app-loading-skeleton *ngIf="isLoading()" [rows]="3" [height]="96"></app-loading-skeleton>

      <app-empty-state
        *ngIf="!isLoading() && !habits().length"
        title="No habits recorded yet"
        description="Create your first habit to start tracking progress."
        actionLabel="Create habit"
        actionLink="/add-habit"
      ></app-empty-state>

      <div *ngIf="habits().length" class="grid gap-4 md:grid-cols-2">
        <article
          *ngFor="let habit of habits()"
          class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-primary hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <header class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3">
              <span *ngIf="habit.icon" class="text-2xl" aria-hidden="true">{{ habit.icon }}</span>
              <div>
                <h2 class="text-lg font-semibold text-slate-900 dark:text-white">{{ habit.title }}</h2>
                <p class="text-sm text-slate-500 dark:text-slate-300" *ngIf="habit.description">
                  {{ habit.description }}
                </p>
              </div>
            </div>
            <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {{ habit.type | titlecase }}
            </span>
          </header>

          <dl class="mt-4 space-y-2 text-xs text-slate-500 dark:text-slate-300">
            <div class="flex justify-between">
              <dt>Created</dt>
              <dd>{{ habit.createdDate | date: 'mediumDate' }}</dd>
            </div>
            <div class="flex justify-between" *ngIf="habit.tags?.length">
              <dt>Tags</dt>
              <dd>{{ habit.tags.join(', ') }}</dd>
            </div>
          </dl>

          <footer class="mt-5 flex items-center justify-between text-sm">
            <a [routerLink]="['/habits', habit.id]" class="font-semibold text-primary hover:underline">
              View details
            </a>
            <div class="flex items-center gap-3">
              <span class="text-xs text-slate-400" *ngIf="habit.archived">Archived</span>
              <button
                type="button"
                class="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 active:scale-95 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/60"
                (click)="deleteHabit(habit.id)"
              >
                Delete
              </button>
            </div>
          </footer>
        </article>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HabitListComponent {
  private readonly habitService = inject(HabitService);
  private readonly logService = inject(LogService);

  readonly habits = this.habitService.habits;
  readonly isLoading = this.habitService.isLoading;

  activeCount(): number {
    return this.habits().filter((habit) => !habit.archived).length;
  }

  archivedCount(): number {
    return this.habits().filter((habit) => habit.archived).length;
  }

  async deleteHabit(id?: number): Promise<void> {
    if (!id) {
      return;
    }
    if (!confirm('Delete this habit? All associated logs will be removed.')) {
      return;
    }
    try {
      await this.logService.deleteLogsForHabit(id);
      await this.habitService.removeHabit(id);
    } catch (error) {
      console.error(error);
    }
  }
}
