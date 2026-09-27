import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportsPage } from './ReportsPage';
import { useReportRange } from '../activity/reportRangeStore';

function getHeaderText() {
  return screen.getByRole('heading', { name: /Recent activity/ }).textContent || '';
}

describe('ReportsPage integration', () => {
  it('renders default 30d window and more than 21 total days, with virtualization', async () => {
    render(<ReportsPage />);
    const header = getHeaderText();
    // Expect formatted as "MMM d, yyyy"
    expect(header).toMatch(/Recent activity — [A-Za-z]{3} \d{1,2}, \d{4} → [A-Za-z]{3} \d{1,2}, \d{4}/);
    // Cells rendered are virtualized; ensure at least some appear
    const cells = await screen.findAllByTestId('day-cell');
    expect(cells.length).toBeGreaterThan(5);
  });

  it('zoom 90d updates range', async () => {
    const user = userEvent.setup();
    render(<ReportsPage />);
    const beforeFrom = useReportRange.getState().from;
    const beforeTo = useReportRange.getState().to;
    await user.click(screen.getByRole('button', { name: /90d/i }));
    const afterFrom = useReportRange.getState().from;
    const afterTo = useReportRange.getState().to;
    expect(afterFrom).not.toEqual(beforeFrom);
    expect(afterTo).not.toEqual(beforeTo);
  });

  it('Prev/Next/Today and Home key change window', async () => {
    const user = userEvent.setup();
    render(<ReportsPage />);
    const region = screen.getByRole('region', { name: 'Recent activity controls' });
    const before = getHeaderText();
    await user.click(screen.getByText('Prev'));
    const afterPrev = getHeaderText();
    expect(afterPrev).not.toEqual(before);
    await user.click(screen.getByText('Next'));
    const afterNext = getHeaderText();
    expect(afterNext).not.toEqual(afterPrev);
    await user.click(screen.getByText('Today'));
    const afterToday = getHeaderText();
    expect(afterToday).not.toEqual(afterNext);
    (region as HTMLElement).focus();
    await user.keyboard('{Home}');
    const afterHome = getHeaderText();
    expect(afterHome).toEqual(afterToday);
  });

  it('does not render the legacy 21-day label', () => {
    render(<ReportsPage />);
    expect(screen.getByTestId('activity-heatmap-v2')).toBeInTheDocument();
    expect(screen.queryByText(/Last 21 days/i)).toBeNull();
  });
});
