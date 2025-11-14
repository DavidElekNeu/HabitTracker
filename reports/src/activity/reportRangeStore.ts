import { create } from 'zustand';
import { addDays, formatISO, parseISO } from 'date-fns';

export type Zoom = '21d' | '30d' | '90d' | '6m' | '1y' | 'custom';

export type ReportRangeState = {
  zoom: Zoom;
  from: string;
  to: string;
  setZoom: (z: Zoom) => void;
  setRange: (from: string, to: string) => void;
  prevWindow: () => void;
  nextWindow: () => void;
  today: () => void;
};

const todayISO = () => formatISO(new Date(), { representation: 'date' });

function daysForZoom(z: Zoom): number {
  switch (z) {
    case '21d':
      return 21;
    case '30d':
      return 30;
    case '90d':
      return 90;
    case '6m':
      return 183; // approx 6 months
    case '1y':
      return 365;
    default:
      return 30;
  }
}

function shift(from: string, to: string, deltaDays: number): { from: string; to: string } {
  const nf = formatISO(addDays(parseISO(from), deltaDays), { representation: 'date' });
  let nt = formatISO(addDays(parseISO(to), deltaDays), { representation: 'date' });
  // cap forward moves to today
  const today = todayISO();
  if (nt > today) {
    nt = today;
  }
  return { from: nf, to: nt };
}

export const useReportRange = create<ReportRangeState>((set, get) => ({
  zoom: '30d',
  from: formatISO(addDays(new Date(), -29), { representation: 'date' }),
  to: todayISO(),
  setZoom: (z) =>
    set((s) => {
      if (z === 'custom') return { zoom: z } as any;
      const days = daysForZoom(z);
      const t = todayISO();
      const f = formatISO(addDays(parseISO(t), -days + 1), { representation: 'date' });
      return { zoom: z, from: f, to: t };
    }),
  setRange: (from, to) => set({ zoom: 'custom', from, to }),
  prevWindow: () => set((s) => shift(s.from, s.to, -windowDays(s))),
  nextWindow: () => set((s) => shift(s.from, s.to, +windowDays(s))),
  today: () => set((s) => {
    const days = windowDays(s);
    const t = todayISO();
    const f = formatISO(addDays(parseISO(t), -days + 1), { representation: 'date' });
    return { from: f, to: t };
  })
}));

function windowDays(s: { from: string; to: string }): number {
  const ms = parseISO(s.to).getTime() - parseISO(s.from).getTime();
  return Math.max(1, Math.floor(ms / (24 * 60 * 60 * 1000)) + 1);
}

