import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { RepositoryProvider } from '../data/RepositoryContext';
import { createSeededMemoryRepository, MemoryRepository } from '../data/memoryRepository';
import { defaultBillingYearMonth, nextYearMonth, previousYearMonth } from '../lib/billing';
import { fixedCostsTotal, incomeTotal, savingsTotals } from '../lib/calc';
import { formatKRW } from '../lib/format';
import { CARD_METHODS } from '../types';
import DashboardPage from './DashboardPage';

describe('DashboardPage', () => {
  it.each([
    { savings: 150000, shortage: 0, current: 100000, next: 250000, uncovered: 0, percentage: 0 },
    { savings: 150000, shortage: 50000, current: 100000, next: 200000, uncovered: 0, percentage: 33 },
    { savings: 150000, shortage: 150000, current: 100000, next: 100000, uncovered: 0, percentage: 100 },
    { savings: 150000, shortage: 200000, current: 50000, next: 0, uncovered: 0, percentage: 100 },
    { savings: 150000, shortage: 300000, current: 0, next: 0, uncovered: 50000, percentage: 100 },
    { savings: 0, shortage: 50000, current: 50000, next: 0, uncovered: 0, percentage: 0 },
    { savings: 400000, shortage: 200000, current: 100000, next: 300000, uncovered: 0, percentage: 50 },
  ])('preserves all totals with savings $savings and shortage $shortage', async ({ savings, shortage, current, next, uncovered, percentage }) => {
    const repo = await createSavingsScenario(savings, shortage);
    renderDashboard(repo);
    const summary = await screen.findByRole('region', { name: '대시보드 요약' });
    const expectedTotals = {
      '총필요 예산': 1030000 + savings,
      '추가 지출': 50000,
      '수입': 1030000 + savings - shortage,
      '부족금액': shortage,
      '저축 금액': savings - shortage,
      '금월 잔고': current,
      '미충당 금액': uncovered,
      '익월 잔고': next,
    };
    for (const [label, value] of Object.entries(expectedTotals)) {
      const amount = within(summary).getByText(label).nextElementSibling;
      expect(amount?.textContent).toBe(formatKRW(value));
    }
    const table = screen.getByRole('table', { name: '카드별 예산' });
    const totals = within(table).getByRole('row', { name: /^합계/ });
    expect(within(totals).getAllByRole('cell').map((cell) => cell.textContent))
      .toEqual([180000, 190000, 140000, 50000].map(formatKRW));
    const overview = screen.getByRole('region', { name: '예산과 저축 현황' });
    const progress = within(overview).getByRole('progressbar', { name: '비상금 저금 사용' });
    const usage = progress.parentElement;
    if (!usage) throw new Error('비상금 저금 사용 그래프가 없습니다.');
    expect(progress).toHaveAttribute('aria-valuenow', String(percentage));
    expect(within(usage).getByText(`${formatKRW(shortage)} / ${formatKRW(savings)}`)).toBeInTheDocument();
    const remaining = within(usage).getByText(`잔액 ${formatKRW(savings - shortage)}`);
    if (shortage > savings) expect(remaining).toHaveClass('text-neg');
    else expect(remaining).not.toHaveClass('text-neg');
    expect(within(overview).queryByText('저축 잔액')).not.toBeInTheDocument();
    expect(within(overview).queryByText(/여행 저금/)).not.toBeInTheDocument();
  });

  it('shows the combined dashboard summary cards', async () => {
    const yearMonth = defaultBillingYearMonth();
    const spendingMonth = new Date(`${yearMonth}-01T00:00:00Z`);
    spendingMonth.setUTCMonth(spendingMonth.getUTCMonth() - 1);
    const spentOn = `${spendingMonth.toISOString().slice(0, 7)}-01`;
    const repo = createSeededMemoryRepository();
    await prepareFixedCostsForDefaultBilling(repo);
    await repo.addExtraSpending({ card: CARD_METHODS[0], name: '병원비', amount: 100000, spentOn });
    await repo.addExtraSpending({ card: CARD_METHODS[1], name: '외식', amount: 50000, spentOn });

    renderDashboard(repo);

    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());

    const summary = screen.getByRole('region', { name: '대시보드 요약' });
    expect(within(summary).getByText('총필요 예산')).toBeInTheDocument();
    expect(within(summary).getByText('추가 지출')).toBeInTheDocument();
    expect(within(summary).getByText('수입')).toBeInTheDocument();
    expect(within(summary).getByText('부족금액')).toBeInTheDocument();
    expect(within(summary).getByText('저축 금액')).toBeInTheDocument();
    expect(within(summary).getByText('미충당 금액')).toBeInTheDocument();
    expect(within(summary).getByText('금월 잔고')).toBeInTheDocument();
    expect(within(summary).getByText('익월 잔고')).toBeInTheDocument();
    const sourceMonth = previousYearMonth(yearMonth);
    const sourceFixedCosts = await repo.listFixedCosts(sourceMonth);
    const income = incomeTotal(await repo.listIncomes(sourceMonth));
    const total = fixedCostsTotal(sourceFixedCosts) + 150000;
    const shortage = Math.max(total - income, 0);
    const savingsAfterShortage = savingsTotals(sourceFixedCosts).totalSavings - shortage;
    expect(within(summary).getByText(formatKRW(total))).toBeInTheDocument();
    expect(within(summary).getByText(formatKRW(150000))).toBeInTheDocument();
    expect(within(summary).getByText(formatKRW(income))).toBeInTheDocument();
    expect(within(summary).getByText(formatKRW(shortage))).toHaveClass('text-neg');
    expect(within(summary).getAllByText(formatKRW(savingsAfterShortage))).toHaveLength(2);
    expect(within(summary).getAllByText('₩0')).toHaveLength(2);
    const overview = screen.getByRole('region', { name: '예산과 저축 현황' });
    expect(within(overview).getByText('비상금 저금 사용')).toBeInTheDocument();
    expect(within(overview).queryByText('예비금 사용')).not.toBeInTheDocument();
    expect(within(overview).queryByText('저축 사용')).not.toBeInTheDocument();
  });

  it('uses an entered actual card amount in the total budget', async () => {
    const user = userEvent.setup();
    const repo = createSeededMemoryRepository();
    await prepareFixedCostsForDefaultBilling(repo);
    renderDashboard(repo);

    const card = CARD_METHODS[0];
    const cardRow = await screen.findByRole('row', { name: new RegExp(card.replace('카드', '')) });
    const actualAmountInput = within(cardRow).getByRole('textbox', { name: `${card} 실제 카드값` });
    await user.clear(actualAmountInput);
    await user.type(actualAmountInput, '200000');
    await user.tab();

    const sourceFixedCosts = await repo.listFixedCosts(previousYearMonth(defaultBillingYearMonth()));
    const originalCardAmount = sourceFixedCosts
      .filter((item) => item.paymentMethod === card && item.active)
      .reduce((total, item) => total + item.amount, 0);
    const expectedTotal = fixedCostsTotal(sourceFixedCosts) - originalCardAmount + 200000;
    await waitFor(() => expect(screen.getByText(formatKRW(expectedTotal))).toBeInTheDocument());
    expect(within(screen.getByRole('region', { name: '대시보드 요약' })).getByText('총필요 예산')).toBeInTheDocument();
    expect(within(cardRow).getByRole('textbox', { name: `${card} 실제 카드값` })).toHaveValue('200,000');
  });

  it('does not save an actual card value until it changes', async () => {
    const user = userEvent.setup();
    const repo = createSeededMemoryRepository();
    renderDashboard(repo);

    const card = CARD_METHODS[0];
    const cardRow = await screen.findByRole('row', { name: new RegExp(card.replace('카드', '')) });
    await user.click(within(cardRow).getByRole('textbox', { name: `${card} 실제 카드값` }));
    await user.tab();

    expect(await repo.listActuals(defaultBillingYearMonth())).toEqual([]);
  });

  it('shows extra spending in its billing month', async () => {
    const repo = createSeededMemoryRepository();
    await repo.addExtraSpending({ card: CARD_METHODS[0], name: '지난 지출', amount: 1000, spentOn: '2025-01-10' });
    const user = userEvent.setup();

    renderDashboard(repo);
    const monthSelect = await screen.findByRole('combobox');
    await user.selectOptions(monthSelect, '2025-02');

    await waitFor(() => expect(screen.getByRole('row', { name: new RegExp(CARD_METHODS[0].replace('카드', '')) })).toHaveTextContent('₩1,000'));
  });
});

function renderDashboard(repo: ReturnType<typeof createSeededMemoryRepository>) {
  return render(
    <MemoryRouter>
      <RepositoryProvider repo={repo}>
        <DashboardPage />
      </RepositoryProvider>
    </MemoryRouter>,
  );
}

async function prepareFixedCostsForDefaultBilling(repo: ReturnType<typeof createSeededMemoryRepository>) {
  const targetSourceMonth = previousYearMonth(defaultBillingYearMonth());
  for (let month = '2026-07'; month < targetSourceMonth; month = nextYearMonth(month)) {
    await repo.copyPreviousMonthFixedCosts(nextYearMonth(month));
  }
}

async function createSavingsScenario(savings: number, shortage: number) {
  const repo = new MemoryRepository();
  const yearMonth = defaultBillingYearMonth();
  const sourceMonth = previousYearMonth(yearMonth);
  const base = { yearMonth: sourceMonth, variability: '고정' as const, active: true, sortOrder: 0 };
  await repo.addFixedCost({ ...base, paymentMethod: '현금이체', category: '생활비', name: '생활비', amount: 850000 });
  await repo.addFixedCost({ ...base, paymentMethod: '현금이체', category: '저금', name: '예비 생활비', amount: Math.min(150000, savings) });
  if (savings > 150000) {
    await repo.addFixedCost({ ...base, paymentMethod: '현금이체', category: '저금', name: '여행 저금', amount: savings - 150000 });
  }
  await repo.addFixedCost({ ...base, paymentMethod: '현대카드', category: '구독', name: '현대 고정비', amount: 100000 });
  await repo.addFixedCost({ ...base, paymentMethod: '신한카드', category: '구독', name: '신한 고정비', amount: 40000 });
  await repo.addExtraSpending({ card: '현대카드', name: '현대 추가지출', amount: 30000, spentOn: `${sourceMonth}-01` });
  await repo.addExtraSpending({ card: '신한카드', name: '신한 추가지출', amount: 20000, spentOn: `${sourceMonth}-01` });
  await repo.setActual(yearMonth, '현대카드', 120000);
  await repo.addIncome({ yearMonth: sourceMonth, type: '고정수입', name: '월급', amount: 1030000 + savings - shortage, active: true });
  await repo.setMonthlyAccountBalance(sourceMonth, '월급통장', 50000);
  await repo.setMonthlyAccountBalance(sourceMonth, '비상금통장', 30000);
  await repo.setMonthlyAccountBalance(sourceMonth, '여행통장', 20000);
  return repo;
}
