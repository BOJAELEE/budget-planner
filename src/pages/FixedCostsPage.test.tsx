import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RepositoryProvider } from '../data/RepositoryContext';
import { createSeededMemoryRepository } from '../data/memoryRepository';
import { dateInKorea, nextYearMonth, previousYearMonth } from '../lib/billing';
import { fixedCostsTotal } from '../lib/calc';
import { formatKRW } from '../lib/format';
import FixedCostsPage from './FixedCostsPage';

describe('FixedCostsPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('replaces the current month with all previous-month items and notifies when copying finishes', async () => {
    const user = userEvent.setup();
    const repo = createSeededMemoryRepository();
    const targetMonth = dateInKorea().slice(0, 7);
    const sourceMonth = previousYearMonth(targetMonth);
    await prepareFixedCostsForMonth(repo, sourceMonth);
    const sourceItems = await repo.listFixedCosts(sourceMonth);
    await repo.addFixedCost({
      yearMonth: targetMonth, paymentMethod: '현금이체', category: '기타',
      name: '대상 월에만 있는 항목', amount: 1234, variability: '고정', active: true, sortOrder: 999,
    });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);

    render(
      <MemoryRouter>
        <RepositoryProvider repo={repo}>
          <FixedCostsPage />
        </RepositoryProvider>
      </MemoryRouter>,
    );

    await screen.findByText('대상 월에만 있는 항목');
    await user.click(screen.getByRole('button', { name: '전월 복사' }));

    const completeMessage = `전월 고정비 ${sourceItems.length}개를 복사했습니다.`;
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith(completeMessage));
    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(screen.getByRole('status')).toHaveTextContent(completeMessage);
    const total = screen.getByText('고정비 전체 합계').parentElement;
    expect(total).not.toBeNull();
    expect(within(total!).getByText(formatKRW(fixedCostsTotal(sourceItems)))).toBeInTheDocument();
    expect((await repo.listFixedCosts(targetMonth))).toHaveLength(sourceItems.length);
    expect((await repo.listFixedCosts(targetMonth)).find((item) => item.name === '대상 월에만 있는 항목')).toBeUndefined();
  });
});

async function prepareFixedCostsForMonth(
  repo: ReturnType<typeof createSeededMemoryRepository>,
  targetMonth: string,
) {
  for (let month = '2026-07'; month < targetMonth; month = nextYearMonth(month)) {
    await repo.copyPreviousMonthFixedCosts(nextYearMonth(month));
  }
}
