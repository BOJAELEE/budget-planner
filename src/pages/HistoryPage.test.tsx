import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RepositoryProvider } from '../data/RepositoryContext';
import { MemoryRepository } from '../data/memoryRepository';
import HistoryPage from './HistoryPage';

describe('HistoryPage', () => {
  it('retains a month in history under the budget month and excludes settled spending from its totals', async () => {
    const repo = new MemoryRepository();
    await repo.addFixedCost({
      yearMonth: '2026-07', paymentMethod: '현금이체', category: '생활비',
      name: '생활비', amount: 100_000, variability: '고정', active: true, sortOrder: 0,
    });
    const settled = await repo.addExtraSpending({ card: '현대카드', name: '결재 항목', amount: 30_000, spentOn: '2026-07-01' });
    await repo.addExtraSpending({ card: '현대카드', name: '미결재 항목', amount: 50_000, spentOn: '2026-07-02' });
    await repo.updateExtraSpending(settled.id, { isSettled: true });

    render(<RepositoryProvider repo={repo}><HistoryPage /></RepositoryProvider>);

    expect(await screen.findByText('2026-07')).toBeInTheDocument();
    expect(screen.getByText('예산 ₩150,000 · 추가지출 ₩50,000')).toBeInTheDocument();
  });
});
