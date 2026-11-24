import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RepositoryProvider } from '../data/RepositoryContext';
import { MemoryRepository } from '../data/memoryRepository';
import { defaultBudgetYearMonth, previousYearMonth } from '../lib/billing';
import ExtraSpendingPage from './ExtraSpendingPage';

describe('ExtraSpendingPage', () => {
  it('shows the monthly summary card at the top and keeps month and card filters applied', async () => {
    const repo = new MemoryRepository();
    const budgetMonth = defaultBudgetYearMonth();
    const previousMonth = previousYearMonth(budgetMonth);
    await repo.addExtraSpending({ card: '현대카드', name: '이번 달 현대', amount: 30_000, spentOn: `${budgetMonth}-01` });
    await repo.addExtraSpending({ card: '신한카드', name: '이번 달 신한', amount: 20_000, spentOn: `${budgetMonth}-01` });
    await repo.addExtraSpending({ card: '현대카드', name: '지난 달 현대', amount: 40_000, spentOn: `${previousMonth}-01` });
    const user = userEvent.setup();
    render(<RepositoryProvider repo={repo}><ExtraSpendingPage /></RepositoryProvider>);

    const row = await screen.findByRole('article', { name: '이번 달 현대' });
    const totals = screen.getAllByText(/추가지출 합계/, { selector: 'div.bg-brand-soft, div.bg-brand-soft *' });
    const totalCard = totals[0].closest('div.bg-brand-soft')!;
    expect(totalCard).toHaveTextContent('₩50,000');
    expect(totalCard).toHaveTextContent('미완료 2건');
    const filterGroup = screen.getByRole('group', { name: '카드사 필터' });
    expect(totalCard.compareDocumentPosition(filterGroup) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(filterGroup.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);

    await user.click(within(filterGroup).getByRole('button', { name: '현대' }));
    expect(totalCard).toHaveTextContent('₩30,000');
    await user.selectOptions(screen.getByRole('combobox', { name: '목록 월' }), previousMonth);
    expect(await screen.findByRole('article', { name: '지난 달 현대' })).toBeInTheDocument();
    expect(totalCard).toHaveTextContent('₩40,000');
  });

  it('keeps the total above the empty-list message when there are no records', async () => {
    render(<RepositoryProvider repo={new MemoryRepository()}><ExtraSpendingPage /></RepositoryProvider>);
    const totalCard = (await screen.findByText(/추가지출 합계/)).closest('div.bg-brand-soft')!;
    const emptyMessage = screen.getByText('선택한 월에 추가지출이 없습니다.');
    expect(totalCard).toHaveTextContent('₩0');
    expect(totalCard.compareDocumentPosition(emptyMessage) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });

  it('supports one-tap card chips without quick amount buttons and places delete safely inside row editor', async () => {
    const repo = new MemoryRepository();
    const spentOn = `${defaultBudgetYearMonth()}-01`;
    await repo.addExtraSpending({ card: '현대카드', name: '주유비', amount: 30_000, spentOn });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    render(<RepositoryProvider repo={repo}><ExtraSpendingPage /></RepositoryProvider>);

    const cardGroup = await screen.findByRole('group', { name: '카드사' });
    await user.click(within(cardGroup).getByRole('button', { name: '신한' }));
    expect(within(cardGroup).getByRole('button', { name: '신한' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: '+1만' })).not.toBeInTheDocument();

    const row = await screen.findByRole('article', { name: '주유비' });
    expect(within(row).queryByRole('button', { name: '삭제' })).not.toBeInTheDocument();

    await user.click(within(row).getByRole('button', { name: '주유비 수정' }));
    const editor = await screen.findByRole('region', { name: '주유비 편집' });
    await user.click(within(editor).getByRole('button', { name: '삭제' }));
    expect(await screen.findByText('선택한 월에 추가지출이 없습니다.')).toBeInTheDocument();
  });

  it('keeps a settled entry visible, excludes it from the total, and restores it on cancel', async () => {
    const repo = new MemoryRepository();
    const spentOn = `${defaultBudgetYearMonth()}-01`;
    const item = await repo.addExtraSpending({ card: '현대카드', name: '주유비', amount: 30_000, spentOn });
    const user = userEvent.setup();
    render(<RepositoryProvider repo={repo}><ExtraSpendingPage /></RepositoryProvider>);

    const row = await screen.findByRole('article', { name: '주유비' });
    const totalCard = screen.getByText(/추가지출 합계/).closest('div.bg-brand-soft')!;
    expect(totalCard).toHaveTextContent('₩30,000');
    await user.click(within(row).getByRole('button', { name: '결재완' }));
    expect(await within(row).findByText('결재완 · 합계 제외')).toBeInTheDocument();
    expect(within(row).getByText('₩30,000')).toHaveClass('line-through');
    expect(totalCard).toHaveTextContent('₩0');
    expect((await repo.listAllExtraSpendings())[0]).toMatchObject({ id: item.id, isSettled: true });

    await user.click(within(row).getByRole('button', { name: '완료 취소' }));
    expect(await within(row).findByText('합계 포함')).toBeInTheDocument();
    expect(totalCard).toHaveTextContent('₩30,000');
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
