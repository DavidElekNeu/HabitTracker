import { DatePipe, NgFor, NgIf, TitleCasePipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HabitService } from '../../core/services/habit.service';
import { LogService } from '../../core/services/log.service';
// Removed Due-today indicator; no need for habit utils here
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton/loading-skeleton.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { HabitLogModalComponent } from '../../tracker/log-modal/habit-log-modal.component';
import { Habit } from '../../data/models/habit.model';
import { HabitLog } from '../../data/models/log.model';

@Component({
  selector: 'app-habit-list',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    NgClass,
    RouterLink,
    DatePipe,
    TitleCasePipe,
    LoadingSkeletonComponent,
    EmptyStateComponent,
    ConfirmDialogComponent,
    HabitLogModalComponent
  ],
  template: `
    <section class="space-y-6">

      <!-- Sticky search/filter/sort bar -->
      <div class="sticky top-16 z-10 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            type="search"
            [value]="searchText()"
            (input)="onSearch($any($event.target).value)"
            placeholder="Search habits…"
            class="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900 md:max-w-sm"
          />

          <div class="flex flex-wrap items-center gap-3">
            <div class="grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                class="px-3 py-1.5 text-xs font-semibold"
                [ngClass]="{ 'bg-primary/10': filter() === 'all', 'text-primary': filter() === 'all' }"
                (click)="setFilter('all')"
              >
                All
              </button>
              <button
                type="button"
                class="border-l border-slate-200 px-3 py-1.5 text-xs font-semibold dark:border-slate-700"
                [ngClass]="{ 'bg-primary/10': filter() === 'binary', 'text-primary': filter() === 'binary' }"
                (click)="setFilter('binary')"
              >
                Binary
              </button>
              <button
                type="button"
                class="border-l border-slate-200 px-3 py-1.5 text-xs font-semibold dark:border-slate-700"
                [ngClass]="{ 'bg-primary/10': filter() === 'quantitative', 'text-primary': filter() === 'quantitative' }"
                (click)="setFilter('quantitative')"
              >
                Quantitative
              </button>
            </div>

            <label class="text-xs text-slate-500">Sort
              <select class="ml-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900" [value]="sortBy()" (change)="onSort($any($event.target).value)">
                <option value="streak">Streak</option>
                <option value="recent">Recently created</option>
                <option value="name">Name A→Z</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <app-loading-skeleton *ngIf="isLoading()" [rows]="3" [height]="96"></app-loading-skeleton>

      <app-empty-state
        *ngIf="!isLoading() && !filteredHabits().length"
        title="No habits recorded yet"
        description="Create your first habit to start tracking progress."
      ></app-empty-state>

      <div *ngIf="filteredHabits().length" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <article
          *ngFor="let habit of filteredHabits()"
          class="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-primary hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <header class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3">
              <span *ngIf="habit.icon" class="text-2xl" aria-hidden="true">{{ habit.icon }}</span>
              <div>
                <h2 class="text-base font-semibold text-slate-900 dark:text-white">{{ habit.title }}</h2>
                <p class="text-xs text-slate-500 dark:text-slate-300">Created {{ habit.createdDate | date: 'mediumDate' }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{{ habit.type | titlecase }}</span>
            </div>
          </header>

          <div class="mt-3 flex items-center justify-between text-xs">
            <span class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-200" [title]="'Longest streak coming soon'">
              🔥 {{ streak(habit.id) }}-day streak
            </span>
            <div class="relative">
              <button type="button" class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" (click)="toggleMenu(habit.id)">⋯</button>
              <div *ngIf="menuOpenFor() === habit.id" class="absolute right-0 mt-2 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white text-xs shadow-md dark:border-slate-700 dark:bg-slate-900 z-30">
                <a [routerLink]="['/habits', habit.id]" class="block px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800">Details</a>
                <div class="block lg:hidden h-px w-4/5 mx-auto bg-slate-200 dark:bg-slate-700"></div>
                <button type="button" class="block w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50" (click)="confirmDelete(habit.id)">Delete</button>
              </div>
            </div>
          </div>
        </article>
      </div>

      <app-confirm-dialog
        [open]="pendingDeleteId() !== null"
        title="Biztosan törlöd?"
        message="A szokás és az összes kapcsolódó napló törlésre kerül."
        confirmText="Törlés"
        cancelText="Mégse"
        (confirm)="performDelete()"
        (cancel)="pendingDeleteId.set(null)"
      />

      <app-habit-log-modal
        *ngIf="logModalOpen()"
        [habit]="logModalHabit()"
        [log]="logModalLog()"
        (close)="logModalOpen.set(false)"
        (save)="handleLogSubmit($event)"
      ></app-habit-log-modal>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HabitListComponent implements OnInit {
  private readonly habitService = inject(HabitService);
  private readonly logService = inject(LogService);

  readonly habits = this.habitService.habits;
  readonly isLoading = this.habitService.isLoading;

  readonly pendingDeleteId = signal<number | null>(null);
  readonly searchText = signal<string>('');
  readonly filter = signal<'all' | 'binary' | 'quantitative'>('all');
  readonly sortBy = signal<'streak' | 'recent' | 'name'>('streak');
  readonly menuOpenFor = signal<number | null>(null);
  readonly logModalOpen = signal(false);
  readonly logModalHabit = signal<Habit | null>(null);
  readonly logModalLog = signal<HabitLog | undefined>(undefined);

  async ngOnInit(): Promise<void> {
    // Ensure logs are available so streak() can compute
    try { await this.logService.loadAllLogs(); } catch {}
  }

  activeCount(): number {
    return this.habits().filter((habit) => !habit.archived).length;
  }

  archivedCount(): number {
    return this.habits().filter((habit) => habit.archived).length;
  }

  // No "Due today" label on the list view per request

  confirmDelete(id?: number): void {
    if (!id) return;
    this.pendingDeleteId.set(id);
  }

  async performDelete(): Promise<void> {
    const id = this.pendingDeleteId();
    if (!id) return;
    try {
      await this.logService.deleteLogsForHabit(id);
      await this.habitService.removeHabit(id);
    } catch (error) {
      console.error(error);
    } finally {
      this.pendingDeleteId.set(null);
    }
  }

  onSearch(value: string): void { this.searchText.set(value ?? ''); }
  setFilter(v: 'all' | 'binary' | 'quantitative'): void { this.filter.set(v); }
  onSort(v: string): void {
    if (v === 'recent' || v === 'name' || v === 'streak') this.sortBy.set(v);
  }
  toggleMenu(id: number): void {
    this.menuOpenFor.set(this.menuOpenFor() === id ? null : id);
  }
  openLogModal(habitId: number): void {
    const h = this.habitService.getHabit(habitId) ?? null;
    this.logModalHabit.set(h);
    this.logModalLog.set(h?.id ? this.logService.getLogForDate(h.id, new Date()) : undefined);
    this.logModalOpen.set(true);
  }

  async handleLogSubmit(payload: { habitId: number; value: number; notes?: string }): Promise<void> {
    try {
      await this.logService.setHabitLog(payload);
      // resort if needed
      if (this.sortBy() === 'streak') {
        // access filteredHabits to trigger recompute
        void this.filteredHabits();
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.logModalOpen.set(false);
    }
  }

  readonly filteredHabits = computed(() => {
    let items = this.habits().slice();
    const q = this.searchText().trim().toLowerCase();
    if (q) {
      items = items.filter(h => h.title.toLowerCase().includes(q) || (h.description ?? '').toLowerCase().includes(q));
    }
    const f = this.filter();
    if (f !== 'all') {
      items = items.filter(h => h.type === f);
    }
    const s = this.sortBy();
    if (s === 'name') {
      items.sort((a,b) => a.title.localeCompare(b.title));
    } else if (s === 'recent') {
      items.sort((a,b) => (a.createdDate < b.createdDate ? 1 : -1));
    } else if (s === 'streak') {
      items.sort((a,b) => this.streak(b.id) - this.streak(a.id));
    }
    return items;
  });

  streak(id?: number): number {
    if (!id) return 0;
    try { return this.logService.getCurrentStreak(id); } catch { return 0; }
  }
}
