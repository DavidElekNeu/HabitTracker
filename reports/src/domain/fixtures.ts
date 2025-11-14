import { addDays, formatISO, startOfDay } from 'date-fns';
import { Habit, HabitInstance } from './types';

const today = startOfDay(new Date());
const iso = (d: Date) => formatISO(d, { representation: 'date' });

export const habits: Habit[] = [
  { id: 'h1', name: 'Hydrate', tags: ['Wellness'], isActive: true },
  { id: 'h2', name: 'Run', tags: ['Sport'], isActive: true },
  { id: 'h3', name: 'Strength', tags: ['Sport'], isActive: true },
  { id: 'h4', name: 'Read', tags: ['Mind'], isActive: true },
  { id: 'h5', name: 'Meditate', tags: ['Mind'], isActive: true },
  { id: 'h6', name: 'Journal', tags: ['Mind'], isActive: true },
  { id: 'h7', name: 'Practice Guitar', tags: ['Creative'], isActive: true },
  { id: 'h8', name: 'Sleep 7h', tags: ['Wellness'], isActive: true }
];

// Generate instances for the last 21 days with sparse scheduling.
// Ensure ~11 completions in last 14 days and some days with zero scheduling.
// Also include some future instances to prove exclusion.

const makeInstance = (
  id: string,
  habitId: string,
  dayOffset: number,
  status: HabitInstance['status']
): HabitInstance => ({ id, habitId, date: iso(addDays(today, dayOffset)), status });

const instances: HabitInstance[] = [];

let idCounter = 1;
const id = () => `i${idCounter++}`;

// Pattern: schedule Run (h2) 3x/week, Strength (h3) 2x/week, Hydrate (h1) most days, Read (h4) some days
// Meditate/Journal sporadically, Guitar occasionally, Sleep tracked a few days.

for (let d = -21; d <= 7; d++) {
  const weekday = (startOfDay(addDays(today, d)).getDay() + 6) % 7; // ISO 0=Mon

  // Hydrate past/present: pattern completes on even offsets, misses on multiples of 5, else scheduled
  if (d <= 0) {
    let status: HabitInstance['status'] = 'scheduled';
    if (d % 5 === 0) status = 'missed';
    else if (d % 2 === 0) status = 'completed';
    instances.push(makeInstance(id(), 'h1', d, status));
  }

  // Run on Mon/Wed/Fri
  if (d <= 0 && [0, 2, 4].includes(weekday)) {
    const status = (Math.abs(d) % 4 === 0) ? 'missed' : 'completed';
    instances.push(makeInstance(id(), 'h2', d, status));
  } else if (d > 0 && [0, 2, 4].includes(weekday)) {
    // Future schedule to test exclusion
    instances.push(makeInstance(id(), 'h2', d, 'scheduled'));
  }

  // Strength Tue/Thu
  if (d <= 0 && [1, 3].includes(weekday)) {
    const status = (Math.abs(d) % 3 === 0) ? 'missed' : 'completed';
    instances.push(makeInstance(id(), 'h3', d, status));
  }

  // Read 4x across two weeks
  if (d <= 0 && [0, 3, 5, 6].includes((weekday + 1) % 7) && (Math.abs(d) % 7 === 0 || Math.abs(d) % 4 === 0)) {
    const status = (Math.abs(d) % 8 === 0) ? 'skipped' : 'completed';
    instances.push(makeInstance(id(), 'h4', d, status));
  }

  // Meditate/Journal occasionally
  if (d <= 0 && weekday === 6 && (Math.abs(d) % 2 === 1)) instances.push(makeInstance(id(), 'h5', d, 'completed'));
  if (d <= 0 && weekday === 2 && (Math.abs(d) % 3 === 1)) instances.push(makeInstance(id(), 'h6', d, 'completed'));

  // Guitar once per week
  if (d <= 0 && weekday === 5 && (Math.abs(d) % 4 !== 0)) instances.push(makeInstance(id(), 'h7', d, 'completed'));

  // Sleep tracked a few days
  if (d <= 0 && weekday === 1 && (Math.abs(d) % 6 === 0)) instances.push(makeInstance(id(), 'h8', d, 'completed'));
}

// Ensure at least 11 completions exist in the last 14 days: if fewer, add completions by
// converting some Hydrate scheduled/missed to completed deterministically.
const last14 = instances.filter((i) => i.date >= iso(addDays(today, -13)) && i.date <= iso(today));
const completedCount = last14.filter((i) => i.status === 'completed').length;
const need = Math.max(0, 11 - completedCount);
let forced = 0;
for (const i of last14) {
  if (forced >= need) break;
  if (i.habitId === 'h1' && i.status !== 'completed') {
    i.status = 'completed';
    forced++;
  }
}

export const habitInstances: HabitInstance[] = instances;
