import { Injectable, computed, signal } from '@angular/core';
import { Habit, HabitChainLink, HabitChainRelation } from '../../data/models/habit.model';
import { DBService } from './db.service';
import { DBError } from './db-error';

@Injectable({
  providedIn: 'root'
})
export class HabitService {
  private readonly habitsSignal = signal<Habit[]>([]);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);
  private initialized = false;
  private changeVersion = 0;
  private readonly mutationVersions = new Map<number, { version: number; type: 'updated' | 'deleted' }>();
  private readonly recentlyAddedHabitIds = new Set<number>();

  readonly habits = computed(() => this.habitsSignal());
  readonly isLoading = computed(() => this.loadingSignal());
  readonly error = computed(() => this.errorSignal());

  constructor(private readonly db: DBService) {
    // Intentionally empty. Consumers should call init() to start loading.
  }

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    await this.loadHabits();
  }

  async loadHabits(): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    const loadVersion = this.changeVersion;
    try {
      const habits = await this.db.getHabits();
      this.applyLoadedHabits(habits, loadVersion);
    } catch (error) {
      const message = error instanceof DBError ? error.message : 'Unknown error fetching habits';
      this.errorSignal.set(message);
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async addHabit(habit: Habit): Promise<Habit> {
    this.errorSignal.set(null);
    try {
      const normalizedInput = this.normalizeHabit(habit);
      const id = await this.db.addHabit(normalizedInput);
      const timestampedHabit: Habit = this.normalizeHabit({ ...normalizedInput, id });
      this.habitsSignal.update((current) => [...current, timestampedHabit]);
      this.recordMutation(id, 'updated');
      this.recentlyAddedHabitIds.add(id);
      return timestampedHabit;
    } catch (error) {
      const message = error instanceof DBError ? error.message : 'Unknown error adding habit';
      this.errorSignal.set(message);
      throw error;
    }
  }

  async updateHabit(updated: Habit): Promise<Habit> {
    this.errorSignal.set(null);
    try {
      const normalizedUpdated = this.normalizeHabit(updated);
      await this.db.updateHabit(normalizedUpdated);
      let updatedHabit: Habit | undefined;
      this.habitsSignal.update((current) =>
        current.map((habit) => {
          if (habit.id === normalizedUpdated.id) {
            updatedHabit = this.normalizeHabit({ ...habit, ...normalizedUpdated });
            return updatedHabit;
          }
          return habit;
        })
      );
      if (normalizedUpdated.id !== undefined) {
        this.recordMutation(normalizedUpdated.id, 'updated');
      }
      return updatedHabit ?? normalizedUpdated;
    } catch (error) {
      const message = error instanceof DBError ? error.message : 'Unknown error updating habit';
      this.errorSignal.set(message);
      throw error;
    }
  }

  async removeHabit(id: number): Promise<void> {
    this.errorSignal.set(null);
    try {
      const affected = this.habitsSignal().filter(
        (habit) =>
          habit.id !== undefined &&
          habit.id !== id &&
          (habit.chainLinks ?? []).some((link) => link?.targetHabitId === id)
      );
      for (const habit of affected) {
        await this.updateHabit({
          ...habit,
          chainLinks: (habit.chainLinks ?? []).filter((link) => link?.targetHabitId !== id)
        });
      }
      await this.db.deleteHabit(id);
      this.habitsSignal.update((current) => current.filter((habit) => habit.id !== id));
      this.recordMutation(id, 'deleted');
      this.recentlyAddedHabitIds.delete(id);
    } catch (error) {
      const message = error instanceof DBError ? error.message : 'Unknown error removing habit';
      this.errorSignal.set(message);
      throw error;
    }
  }

  getHabit(id: number): Habit | undefined {
    return this.habitsSignal().find((habit) => habit.id === id);
  }

  isRecentlyAdded(id: number): boolean {
    return this.recentlyAddedHabitIds.has(id);
  }

  acknowledgeHabit(id: number): void {
    this.recentlyAddedHabitIds.delete(id);
  }

  clearError(): void {
    this.errorSignal.set(null);
  }

  getOutgoingChainLinks(
    sourceHabitId: number,
    relation?: HabitChainRelation
  ): Array<{ sourceHabit: Habit; link: HabitChainLink; targetHabit: Habit }> {
    const sourceHabit = this.getHabit(sourceHabitId);
    if (!sourceHabit?.chainLinks?.length) {
      return [];
    }
    const result: Array<{ sourceHabit: Habit; link: HabitChainLink; targetHabit: Habit }> = [];
    for (const rawLink of sourceHabit.chainLinks) {
      const link = this.normalizeChainLink(rawLink);
      if (!link || link.isActive === false) {
        continue;
      }
      if (relation && link.relation !== relation) {
        continue;
      }
      const targetHabit = this.getHabit(link.targetHabitId);
      if (!targetHabit || targetHabit.archived) {
        continue;
      }
      result.push({
        sourceHabit,
        link,
        targetHabit
      });
    }

    return result.sort((a, b) => (b.link.priority ?? 0) - (a.link.priority ?? 0));
  }

  getIncomingChainLinks(
    targetHabitId: number,
    relation?: HabitChainRelation
  ): Array<{ sourceHabit: Habit; link: HabitChainLink; targetHabit: Habit }> {
    const targetHabit = this.getHabit(targetHabitId);
    if (!targetHabit) {
      return [];
    }
    const result: Array<{ sourceHabit: Habit; link: HabitChainLink; targetHabit: Habit }> = [];
    for (const sourceHabit of this.habitsSignal()) {
      if (sourceHabit.id === undefined || sourceHabit.archived) {
        continue;
      }
      for (const rawLink of sourceHabit.chainLinks ?? []) {
        const link = this.normalizeChainLink(rawLink);
        if (!link || link.isActive === false) {
          continue;
        }
        if (link.targetHabitId !== targetHabitId) {
          continue;
        }
        if (relation && link.relation !== relation) {
          continue;
        }
        result.push({
          sourceHabit,
          link,
          targetHabit
        });
      }
    }
    return result.sort((a, b) => (b.link.priority ?? 0) - (a.link.priority ?? 0));
  }

  getChainLinkCount(habitId: number): number {
    const outgoing = this.getOutgoingChainLinks(habitId).length;
    const incoming = this.getIncomingChainLinks(habitId).length;
    return outgoing + incoming;
  }

  async addChainLink(
    sourceHabitId: number,
    input: Omit<HabitChainLink, 'id'> & { id?: string }
  ): Promise<Habit | undefined> {
    const sourceHabit = this.getHabit(sourceHabitId);
    if (!sourceHabit || sourceHabit.id === undefined) {
      return undefined;
    }
    if (input.targetHabitId === sourceHabitId) {
      return sourceHabit;
    }

    const nextLink: HabitChainLink = {
      ...input,
      id: input.id ?? this.createChainLinkId(),
      relation: input.relation,
      priority: input.priority ?? 0,
      isActive: input.isActive ?? true
    };

    const current = (sourceHabit.chainLinks ?? []).map((item) => this.normalizeChainLink(item)).filter(Boolean) as HabitChainLink[];
    const duplicate = current.find(
      (item) => item.targetHabitId === nextLink.targetHabitId && item.relation === nextLink.relation
    );
    const nextLinks = duplicate
      ? current.map((item) => (item.id === duplicate.id ? { ...duplicate, ...nextLink, id: duplicate.id } : item))
      : [...current, nextLink];

    return this.updateHabit({
      ...sourceHabit,
      chainLinks: nextLinks
    });
  }

  async removeChainLink(sourceHabitId: number, linkId: string): Promise<Habit | undefined> {
    const sourceHabit = this.getHabit(sourceHabitId);
    if (!sourceHabit || sourceHabit.id === undefined) {
      return undefined;
    }
    const currentLinks = (sourceHabit.chainLinks ?? []).filter((item) => item?.id !== linkId);
    return this.updateHabit({
      ...sourceHabit,
      chainLinks: currentLinks
    });
  }

  private applyLoadedHabits(habits: Habit[], loadVersion: number): void {
    const existing = this.habitsSignal();
    const merged: Habit[] = [];
    const seenIds = new Set<number>();

    for (const habit of habits) {
      if (habit.id === undefined) {
        continue;
      }
      const mutation = this.mutationVersions.get(habit.id);
      if (mutation && mutation.version > loadVersion) {
        if (mutation.type === 'deleted') {
          continue;
        }
        const local = existing.find((item) => item.id === habit.id);
        if (local) {
          merged.push(local);
          seenIds.add(habit.id);
          continue;
        }
      }
      // Migrate deprecated 'frequency' type to binary with schedule
      const normalized = this.normalizeHabit(habit);
      merged.push(normalized);
      seenIds.add(habit.id);
    }

    for (const habit of existing) {
      if (habit.id === undefined) {
        merged.push(habit);
        continue;
      }
      if (seenIds.has(habit.id)) {
        continue;
      }
      const mutation = this.mutationVersions.get(habit.id);
      if (mutation && mutation.type === 'deleted' && mutation.version > loadVersion) {
        continue;
      }
      const normalizedExisting = this.normalizeHabit(habit);
      merged.push(normalizedExisting);
      seenIds.add(habit.id);
    }

    this.habitsSignal.set(merged);
    this.pruneMutations(loadVersion);

    const mergedIds = new Set(merged.filter((habit) => habit.id !== undefined).map((habit) => habit.id as number));
    for (const id of Array.from(this.recentlyAddedHabitIds)) {
      if (!mergedIds.has(id)) {
        this.recentlyAddedHabitIds.delete(id);
      }
    }
  }

  private recordMutation(id: number | undefined, type: 'updated' | 'deleted'): void {
    if (id === undefined) {
      return;
    }
    const version = ++this.changeVersion;
    this.mutationVersions.set(id, { version, type });
  }

  private pruneMutations(maxVersion: number): void {
    for (const [id, mutation] of this.mutationVersions) {
      if (mutation.version <= maxVersion) {
        this.mutationVersions.delete(id);
      }
    }
  }

  private normalizeHabit(habit: Habit): Habit {
    const normalizedType = (habit as any).type === 'frequency' ? 'binary' : habit.type;
    const normalizedLinks = (habit.chainLinks ?? [])
      .map((item) => this.normalizeChainLink(item))
      .filter(Boolean) as HabitChainLink[];

    return {
      ...habit,
      type: normalizedType,
      chainLinks: normalizedLinks.length ? normalizedLinks : undefined
    };
  }

  private normalizeChainLink(link: HabitChainLink | undefined): HabitChainLink | undefined {
    if (!link || typeof link.targetHabitId !== 'number' || !Number.isFinite(link.targetHabitId)) {
      return undefined;
    }

    const relation: HabitChainRelation = link.relation === 'before' ? 'before' : 'after';

    return {
      ...link,
      id: link.id ?? this.createChainLinkId(),
      relation,
      priority: Number.isFinite(Number(link.priority ?? 0)) ? Number(link.priority ?? 0) : 0,
      isActive: link.isActive ?? true
    };
  }

  private createChainLinkId(): string {
    return `chain_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
