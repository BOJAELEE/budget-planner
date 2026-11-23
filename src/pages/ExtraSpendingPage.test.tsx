import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RepositoryProvider } from '../data/RepositoryContext';
import { MemoryRepository } from '../data/memoryRepository';
import { defaultBudgetYearMonth, previousYearMonth } from '../lib/billing';
import ExtraSpendingPage from './ExtraSpendingPage';

describe('ExtraSpendingPage', () => {
  it('shows one total above the records and keeps month and card filters applied', async () => {
    const repo = new MemoryRepository();
    const budgetMonth = defaultBudgetYearMonth();
    const previousMonth = previousYearMonth(budgetMonth);
    await repo.addExtraSpending({ card: '현대카드', name: '이번 달 현대', amount: 30_000, spentOn: `${budgetMonth}-01` });
    await repo.addExtraSpending({ card: '신한카드', name: '이번 달 신한', amount: 20_000, spentOn: `${budgetMonth}-01` });
    await repo.addExtraSpending({ card: '현대카드', name: '지난 달 현대', amount: 40_000, spentOn: `${previousMonth}-01` });
    const user = userEvent.setup();
    render(<RepositoryProvider repo={repo}><ExtraSpendingPage /></RepositoryProvider>);

    const row = await screen.findByRole('article', { name: '이번 달 현대' });
    const totals = screen.getAllByText(/추가지출 합계/, { selector: 'div.bg-brand-soft' });
    expect(totals).toHaveLength(1);
    const total = totals[0];
    expect(total).toHaveTextContent('₩50,000');
    expect(total.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    const filter = screen.getByRole('combobox', { name: '카드사 필터' });
    expect(filter.compareDocumentPosition(total) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);

    await user.selectOptions(filter, '현대카드');
    expect(total).toHaveTextContent('₩30,000');
    await user.selectOptions(screen.getByRole('combobox', { name: '목록 월' }), previousMonth);
    expect(await screen.findByRole('article', { name: '지난 달 현대' })).toBeInTheDocument();
    expect(total).toHaveTextContent('₩40,000');
  });

  it('keeps the total above the empty-list message when there are no records', () => {
    render(<RepositoryProvider repo={new MemoryRepository()}><ExtraSpendingPage /></RepositoryProvider>);
    const total = screen.getByText(/추가지출 합계/, { selector: 'div.bg-brand-soft' });
    const emptyMessage = screen.getByText('선택한 월에 추가지출이 없습니다.');
    expect(total).toHaveTextContent('₩0');
    expect(total.compareDocumentPosition(emptyMessage) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });

  it('keeps a settled entry visible, excludes it from the total, and restores it on cancel', async () => {
    const repo = new MemoryRepository();
    const spentOn = `${defaultBudgetYearMonth()}-01`;
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

  it('displays the budget month for post-cutoff spending while preserving the internal billing month in storage', async () => {
    const repo = new MemoryRepository();
    await repo.addExtraSpending({ card: '현대카드', name: '마감 후 지출', amount: 15_000, spentOn: '2026-11-20' });
    const user = userEvent.setup();
    render(<RepositoryProvider repo={repo}><ExtraSpendingPage /></RepositoryProvider>);

    await screen.findByRole('option', { name: '2026년 12월' });
    await user.selectOptions(screen.getByRole('combobox', { name: '목록 월' }), '2026-12');
    const row = await screen.findByRole('article', { name: '마감 후 지출' });
    expect(row).toHaveTextContent('사용일 2026-11-20 · 반영월 2026년 12월');
    expect((await repo.listAllExtraSpendings())[0].yearMonth).toBe('2027-01');
  });
});
