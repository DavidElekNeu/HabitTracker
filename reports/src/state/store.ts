import { create } from 'zustand';
import { addDays, formatISO, startOfDay, subDays, startOfQuarter, startOfYear } from 'date-fns';
import { habits as seedHabits, habitInstances as seedInstances } from '../domain/fixtures';
import type { Filters, Habit, HabitInstance } from '../domain/types';

const todayISO = formatISO(startOfDay(new Date()), { representation: 'date' });

type RangeKey = '7' | '30' | 'quarter' | 'year';

const ranges: Record<RangeKey, { from: string; to: string }> = {
  '7': { from: formatISO(subDays(new Date(), 6), { representation: 'date' }), to: todayISO },
  '30': { from: formatISO(subDays(new Date(), 29), { representation: 'date' }), to: todayISO },
  quarter: { from: formatISO(startOfQuarter(new Date()), { representation: 'date' }), to: todayISO },
  year: { from: formatISO(startOfYear(new Date()), { representation: 'date' }), to: todayISO }
};

export type Store = {
  todayISO: string;
  habits: Habit[];
  instances: HabitInstance[];
  tags: string[];
  filters: Filters & { rangeKey: RangeKey };
  setRange: (key: RangeKey) => void;
  toggleTag: (tag: string) => void;
  setAgg: (agg: Filters['agg']) => void;
  applyFilters: (next: Partial<Filters & { rangeKey: RangeKey }>) => void;
  resetFilters: () => void;
};

const initialRange = ranges['30'];

export const useStore = create<Store>((set, get) => ({
  todayISO,
  habits: seedHabits,
  instances: seedInstances,
  tags: Array.from(new Set(seedHabits.flatMap((h) => h.tags))).sort(),
  filters: { dateFrom: initialRange.from, dateTo: initialRange.to, tags: [], agg: 'micro', rangeKey: '30' },
  setRange: (key) =>
    set((s) => ({ filters: { ...s.filters, ...ranges[key], rangeKey: key } })),
  toggleTag: (tag) =>
    set((s) => {
      const has = s.filters.tags.includes(tag);
      const tags = has ? s.filters.tags.filter((t) => t !== tag) : [...s.filters.tags, tag];
      return { filters: { ...s.filters, tags } };
    }),
  setAgg: (agg) => set((s) => ({ filters: { ...s.filters, agg } })),
  applyFilters: (next) => set((s) => ({ filters: { ...s.filters, ...next } })),
  resetFilters: () => set(() => ({ filters: { dateFrom: initialRange.from, dateTo: initialRange.to, tags: [], agg: 'micro', rangeKey: '30' } }))
}));

