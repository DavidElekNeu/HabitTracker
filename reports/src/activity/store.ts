import { create } from 'zustand';
import { addDays, formatISO } from 'date-fns';

type Zoom = '21d' | '30d' | '90d' | '6m' | '1y' | 'custom';

type State = {
  zoom: Zoom;
  from: string;
  to: string;
  setZoom: (z: Zoom) => void;
  setRange: (from: string, to: string) => void;
};

const todayISO = formatISO(new Date(), { representation: 'date' });

export const useActivityStore = create<State>((set, get) => ({
  zoom: '30d',
  from: formatISO(addDays(new Date(), -29), { representation: 'date' }),
  to: todayISO,
  setZoom: (z) => set({ zoom: z }),
  setRange: (from, to) => set({ from, to })
}));

