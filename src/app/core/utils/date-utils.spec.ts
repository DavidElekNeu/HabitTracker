import { daysBetween } from './date-utils';

describe('calendar day differences', () => {
  it('counts dates across the spring DST transition in both directions', () => {
    const first = new Date(2026, 2, 28, 12);
    const last = new Date(2026, 2, 30, 12);
    expect(daysBetween(first, last)).toBe(2);
    expect(daysBetween(last, first)).toBe(2);
  });
  it('counts dates across the autumn DST transition', () => {
    expect(daysBetween(new Date(2026, 9, 24), new Date(2026, 9, 26))).toBe(2);
  });
  it('ignores the time of day', () => {
    expect(daysBetween(new Date(2026, 8, 25, 0), new Date(2026, 8, 25, 23, 59))).toBe(0);
  });
});
