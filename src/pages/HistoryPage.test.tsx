import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RepositoryProvider } from '../data/RepositoryContext';
import { MemoryRepository } from '../data/memoryRepository';
import HistoryPage from './HistoryPage';

describe('HistoryPage', () => {
  it('retains a month in history but excludes settled spending from its totals', async () => {
    const repo = new MemoryRepository();
    const settled = await repo.addExtraSpending({ card: '현대카드', name: '결재 항목', amount: 30_000, spentOn: '2026-07-01' });
    await repo.addExtraSpending({ card: '현대카드', name: '미결재 항목', amount: 50_000, spentOn: '2026-07-02' });
    await repo.updateExtraSpending(settled.id, { isSettled: true });

    render(<RepositoryProvider repo={repo}><HistoryPage /></RepositoryProvider>);

    expect(await screen.findByText('2026-08')).toBeInTheDocument();
    expect(screen.getByText('예산 ₩50,000 · 추가지출 ₩50,000')).toBeInTheDocument();
  });
});
