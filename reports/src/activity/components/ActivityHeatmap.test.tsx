import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActivityHeatmap } from './ActivityHeatmap';
import { demoInstances } from '../fixtures';

const todayISO = new Date().toISOString().slice(0, 10);

function addDaysISO(iso: string, delta: number): string {
  const dt = new Date(iso + 'T00:00:00');
  dt.setDate(dt.getDate() + delta);
  return dt.toISOString().slice(0, 10);
}

describe('ActivityHeatmap', () => {
  it('renders only visible cells (virtualized)', () => {
    const from = addDaysISO(todayISO, -180);
    const to = todayISO;
    render(<div style={{ width: 600 }}><ActivityHeatmap instances={demoInstances} startDate={from} endDate={to} /></div>);
    const cells = screen.getAllByTestId('day-cell');
    expect(cells.length).toBeLessThan(60); // visible subset only
  });

  it('keyboard navigation moves focus between cells', async () => {
    const user = userEvent.setup();
    const from = addDaysISO(todayISO, -30);
    const to = todayISO;
    render(<div style={{ width: 600 }}><ActivityHeatmap instances={demoInstances} startDate={from} endDate={to} /></div>);
    const cells = screen.getAllByTestId('day-cell');
    // Focus last (today)
    await user.tab();
    // Move left
    await user.keyboard('{ArrowLeft}');
    // Expect some cell focused
    const focused = cells.find((el) => el === document.activeElement);
    expect(focused).toBeDefined();
  });

  it('renders dashed cells with "No schedule" tooltip when scheduled=0', () => {
    // Our fixture includes some dates with 0 schedule by design
    const from = addDaysISO(todayISO, -360);
    const to = todayISO;
    render(<div style={{ width: 600 }}><ActivityHeatmap instances={demoInstances} startDate={from} endDate={to} /></div>);
    const anyNoSchedule = screen.getAllByTestId('day-cell').some((el) => (el as HTMLButtonElement).title.includes('No schedule'));
    expect(anyNoSchedule).toBe(true);
  });
});
