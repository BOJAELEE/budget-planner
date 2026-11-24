import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RepositoryProvider } from '../data/RepositoryContext';
import { MemoryRepository } from '../data/memoryRepository';
import HistoryPage from './HistoryPage';

describe('HistoryPage', () => {
  it('retains months in history newest-first under formatted budget months and excludes settled spending', async () => {
    const repo = new MemoryRepository();
    await repo.addFixedCost({
      yearMonth: '2026-07', paymentMethod: '현금이체', category: '생활비',
      name: '생활비', amount: 100_000, variability: '고정', active: true, sortOrder: 0,
    });
    const settled = await repo.addExtraSpending({ card: '현대카드', name: '결재 항목', amount: 30_000, spentOn: '2026-07-01' });
    await repo.addExtraSpending({ card: '현대카드', name: '미결재 항목', amount: 50_000, spentOn: '2026-07-02' });
    await repo.addExtraSpending({ card: '현대카드', name: '8월 항목', amount: 70_000, spentOn: '2026-08-05' });
    await repo.updateExtraSpending(settled.id, { isSettled: true });

    render(<RepositoryProvider repo={repo}><HistoryPage /></RepositoryProvider>);

    const july = await screen.findByText('2026년 7월');
    const august = await screen.findByText('2026년 8월');
    expect(august.compareDocumentPosition(july) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(screen.getByText('예산 ₩150,000 · 추가지출 ₩50,000')).toBeInTheDocument();
  });
});
