import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { RepositoryProvider } from '../data/RepositoryContext';
import { createSeededMemoryRepository } from '../data/memoryRepository';
import { defaultBillingYearMonth, nextYearMonth, previousYearMonth } from '../lib/billing';
import { fixedCostsTotal, incomeTotal, savingsTotals } from '../lib/calc';
import { formatKRW } from '../lib/format';
import { CARD_METHODS } from '../types';
import DashboardPage from './DashboardPage';

describe('DashboardPage', () => {
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
