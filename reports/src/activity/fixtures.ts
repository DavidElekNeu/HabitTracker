import { addDays, formatISO, startOfDay } from 'date-fns';
import type { HabitInstance } from './types';

const today = startOfDay(new Date());
const iso = (d: Date) => formatISO(d, { representation: 'date' });

const habits = ['h1', 'h2', 'h3', 'h4'];

function genYear(seed = 1): HabitInstance[] {
  const out: HabitInstance[] = [];
  // deterministic simple pattern: schedule on weekdays; fewer on weekends
  for (let i = 0; i < 370; i++) {
    const d = addDays(today, -i);
    const day = d.getDay(); // 0 Sun .. 6 Sat
    const isWeekend = day === 0 || day === 6;
    const scheduledHabits = isWeekend ? ['h1'] : habits;
    for (const h of scheduledHabits) {
      const done = ((i + h.charCodeAt(1)) % (isWeekend ? 3 : 2)) !== 0; // some misses
      out.push({ habitId: h, date: iso(d), status: done ? 'completed' : 'missed' });
    }
  }
  // a few days with 0 scheduled: drop all instances for these dates
  for (let k = 10; k < 360; k += 53) {
    const dateKey = iso(addDays(today, -k));
    for (let i = out.length - 1; i >= 0; i--) if (out[i].date === dateKey) out.splice(i, 1);
  }
  return out;
}

export const demoInstances = genYear();

