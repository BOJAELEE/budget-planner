import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SwimmingSchedule } from './SwimmingSchedule';

describe('SwimmingSchedule', () => {
  it('shows a display-only row of twelve numeric months with a month-end note', () => {
    render(<SwimmingSchedule yearMonth="2026-11" />);
    const schedule = screen.getByRole('region', { name: '2026년 수영회비 납부 일정' });
    const cells = within(schedule).getAllByRole('listitem');
    expect(cells.map((cell) => cell.textContent)).toEqual(Array.from({ length: 12 }, (_, index) => String(index + 1)));
    expect(cells.filter((cell) => cell.classList.contains('swimming-month--due')).map((cell) => cell.textContent))
      .toEqual(['5', '6', '8', '9', '11', '12']);
    expect(within(schedule).getByText('해당 월말에 납부')).toBeInTheDocument();
    expect(within(schedule).queryByRole('button')).not.toBeInTheDocument();
    expect(within(schedule).queryByRole('link')).not.toBeInTheDocument();
    expect(within(schedule).getByRole('listitem', { name: '2026년 5월 수영회비 해당 월말에 납부' })).toBeInTheDocument();
  });

  it('updates the displayed year without resetting the cycle at the year boundary', () => {
    const view = render(<SwimmingSchedule yearMonth="2026-12" />);
    view.rerender(<SwimmingSchedule yearMonth="2027-01" />);
    const schedule = screen.getByRole('region', { name: '2027년 수영회비 납부 일정' });
    expect(within(schedule).getAllByRole('listitem').filter((cell) => cell.classList.contains('swimming-month--due'))
      .map((cell) => cell.textContent)).toEqual(['2', '3', '5', '6', '8', '9', '11', '12']);
    expect(within(schedule).getByText('2027년')).toBeInTheDocument();
  });
});
