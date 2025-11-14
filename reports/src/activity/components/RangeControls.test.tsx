import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RangeControls } from './RangeControls';
import { useReportRange } from '../../reportRangeStore';

describe('RangeControls', () => {
  it('Prev/Next/Today update store range', async () => {
    const user = userEvent.setup();
    render(<RangeControls />);
    const before = useReportRange.getState().from + '|' + useReportRange.getState().to;
    await user.click(screen.getByText('Prev'));
    const afterPrev = useReportRange.getState().from + '|' + useReportRange.getState().to;
    expect(afterPrev).not.toEqual(before);
    await user.click(screen.getByText('Next'));
    const afterNext = useReportRange.getState().from + '|' + useReportRange.getState().to;
    expect(afterNext).not.toEqual(afterPrev);
    await user.click(screen.getByText('Today'));
    const afterToday = useReportRange.getState().from + '|' + useReportRange.getState().to;
    expect(afterToday).not.toEqual(afterNext);
  });
});
