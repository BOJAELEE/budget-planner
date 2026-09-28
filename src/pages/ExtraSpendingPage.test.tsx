import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RepositoryProvider } from '../data/RepositoryContext';
import { MemoryRepository } from '../data/memoryRepository';
import { defaultBillingYearMonth, previousYearMonth } from '../lib/billing';
import ExtraSpendingPage from './ExtraSpendingPage';

describe('ExtraSpendingPage', () => {
  it('keeps a settled entry visible, excludes it from the total, and restores it on cancel', async () => {
    const repo = new MemoryRepository();
    const spentOn = `${previousYearMonth(defaultBillingYearMonth())}-01`;
    const item = await repo.addExtraSpending({ card: '현대카드', name: '주유비', amount: 30_000, spentOn });
    const user = userEvent.setup();
    render(<RepositoryProvider repo={repo}><ExtraSpendingPage /></RepositoryProvider>);

    const row = await screen.findByRole('article', { name: '주유비' });
    expect(screen.getByText(/추가지출 합계/, { selector: 'div.bg-brand-soft' })).toHaveTextContent('₩30,000');
    await user.click(within(row).getByRole('button', { name: '결재완' }));
    expect(await within(row).findByText('결재완 · 합계 제외')).toBeInTheDocument();
    expect(within(row).getByText('₩30,000')).toHaveClass('line-through');
    expect(screen.getByText(/추가지출 합계/, { selector: 'div.bg-brand-soft' })).toHaveTextContent('₩0');
    expect((await repo.listAllExtraSpendings())[0]).toMatchObject({ id: item.id, isSettled: true });

    await user.click(within(row).getByRole('button', { name: '완료 취소' }));
    expect(await within(row).findByText('합계 포함')).toBeInTheDocument();
    expect(screen.getByText(/추가지출 합계/, { selector: 'div.bg-brand-soft' })).toHaveTextContent('₩30,000');
    expect((await repo.listAllExtraSpendings())[0].isSettled).toBe(false);
  });
});
