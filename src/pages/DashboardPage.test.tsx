import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RepositoryProvider } from '../data/RepositoryContext';
import { createSeededMemoryRepository, MemoryRepository } from '../data/memoryRepository';
import * as billing from '../lib/billing';
import {
  defaultBillingYearMonth, defaultBudgetYearMonth, nextYearMonth, previousYearMonth,
} from '../lib/billing';
import { fixedCostsTotal, incomeTotal } from '../lib/calc';
import { formatKRW } from '../lib/format';
import { DASHBOARD_SCENARIO_VIEWS_KEY } from '../lib/dashboardScenarioView';
import { exportData } from '../lib/backup';
import { CARD_METHODS } from '../types';
import DashboardPage from './DashboardPage';

describe('DashboardPage', () => {
  beforeEach(() => localStorage.removeItem(DASHBOARD_SCENARIO_VIEWS_KEY));
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows the compact schedule above the memo without navigating months or changing financial data', async () => {
    const repo = await createSavingsScenario(150000, 50000);
    await repo.addExtraSpending({ card: '현대카드', name: '10월 항목', amount: 1000, spentOn: '2026-10-01' });
    await repo.addExtraSpending({ card: '현대카드', name: '익년 항목', amount: 2000, spentOn: '2027-01-01' });
    const originalData = await exportData(repo);
    const user = userEvent.setup();
    renderDashboard(repo);
    const monthSelect = await screen.findByRole('combobox', { name: '기준월' });
    expect(monthSelect).toHaveValue(defaultBudgetYearMonth());
    await user.selectOptions(monthSelect, '2026-10');
    const quickStrip = screen.getByRole('region', { name: '메모 및 수영 일정 요약' });
    await user.click(within(quickStrip).getByRole('button', { name: '메모 및 수영회비 일정' }));
    const schedule = await screen.findByRole('region', { name: '2026년 수영회비 납부 일정' });
    const memo = screen.getByRole('region', { name: /메모$/ });
    expect(monthSelect.compareDocumentPosition(quickStrip) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(schedule.compareDocumentPosition(memo) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(screen.queryByText('청구월')).not.toBeInTheDocument();
    expect(screen.queryByText('기준월')).not.toBeInTheDocument();
    expect(within(schedule).getByText('해당 월말에 납부')).toBeInTheDocument();
    const tableBefore = screen.getByRole('table', { name: '카드별 예산' }).textContent;
    await user.click(within(schedule).getByRole('listitem', { name: '2026년 5월 수영회비 해당 월말에 납부' }));
    expect(screen.getByRole('combobox', { name: '기준월' })).toHaveValue('2026-10');
    expect(screen.getByRole('table', { name: '카드별 예산' }).textContent).toBe(tableBefore);
    await user.selectOptions(screen.getByRole('combobox', { name: '기준월' }), '2027-01');
    const nextYearSchedule = await screen.findByRole('region', { name: '2027년 수영회비 납부 일정' });
    expect(within(nextYearSchedule).getAllByRole('listitem').filter((cell) => cell.classList.contains('swimming-month--due'))
      .map((cell) => cell.textContent)).toEqual(['2', '3', '5', '6', '8', '9', '11', '12']);
    expect(await exportData(repo)).toBe(originalData);
  });

  it('shows the unified funds headline below the compact strip and updates it with the selected scenario without changing data', async () => {
    const repo = new MemoryRepository();
    const month = defaultBillingYearMonth();
    const sourceMonth = previousYearMonth(month);
    const base = { yearMonth: sourceMonth, variability: '고정' as const, active: true, sortOrder: 0 };
    await repo.addFixedCost({ ...base, paymentMethod: '현금이체', category: '생활비', name: '현금 고정비', amount: 5240496 });
    await repo.addFixedCost({ ...base, paymentMethod: '현대카드', category: '기타', name: '카드 고정비', amount: 300000 });
    await repo.addIncome({ yearMonth: sourceMonth, type: '고정수입', name: '월급', amount: 5610000, active: true });
    await repo.addExtraSpending({ card: '현대카드', name: '추가 지출', amount: 727060, spentOn: `${sourceMonth}-01` });
    await repo.setActual(month, '현대카드', 810772);
    const originalData = await exportData(repo);
    const user = userEvent.setup();
    renderDashboard(repo);
    const headline = await screen.findByRole('region', { name: '월별 자금 핵심 요약' });
    expect(within(headline).getByText('예비자금').nextElementSibling).toHaveTextContent('650,000');
    expect(within(headline).getByText('사용금액').nextElementSibling).toHaveTextContent('727,060');
    expect(within(headline).getByText('초과금액').nextElementSibling).toHaveTextContent('-77,060');
    const quickStrip = screen.getByRole('region', { name: '메모 및 수영 일정 요약' });
    expect(quickStrip.compareDocumentPosition(headline) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    const paymentFunding = screen.getByRole('region', { name: '카드결제 이체금' });
    const cardTable = screen.getByRole('table', { name: '카드별 예산' });
    expect(cardTable.compareDocumentPosition(paymentFunding) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(screen.getByRole('main').lastElementChild).toBe(paymentFunding);
    expect(within(paymentFunding).getByText('월급 여유 자금').closest('dt')?.nextElementSibling).toHaveTextContent('₩150,000');
    expect(within(paymentFunding).getByText('옮길 금액 합계').closest('div')?.querySelector('strong')).toHaveTextContent('₩7,556');
    expect(within(paymentFunding).getByText('추가 지출').closest('dt')?.nextElementSibling).toHaveTextContent('₩77,060');
    await user.click(screen.getByRole('button', { name: '실제' }));
    expect(within(headline).getByText('사용금액').nextElementSibling).toHaveTextContent('510,772');
    expect(within(headline).getByText('잔액', { exact: true }).nextElementSibling).toHaveTextContent('139,228');
    expect(within(headline).queryByText('초과금액')).not.toBeInTheDocument();
    expect(within(paymentFunding).getByText('옮길 금액 합계').closest('div')?.querySelector('strong')).toHaveTextContent('₩0');
    expect(within(paymentFunding).getByText('월간 비상금').closest('dt')?.nextElementSibling).toHaveTextContent('₩291,268');
    expect(within(paymentFunding).getByText('추가 지출').closest('dt')?.nextElementSibling).toHaveTextContent('₩0');
    expect(await exportData(repo)).toBe(originalData);
  });

  it('remembers each month independently and defaults new months to expected even with actual values entered', async () => {
    const repo = await createSavingsScenario(150000, 50000);
    await repo.addExtraSpending({ card: '현대카드', name: '4월 항목', amount: 1000, spentOn: '2026-04-01' });
    await repo.addExtraSpending({ card: '현대카드', name: '5월 항목', amount: 2000, spentOn: '2026-05-01' });
    await repo.setActual('2026-05', '현대카드', 9000);
    const originalActuals = await repo.listAllActuals();
    const user = userEvent.setup();
    renderDashboard(repo);
    expect(await screen.findByRole('region', { name: '예상 카드값 기준 대시보드' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '실제' }));

    await user.selectOptions(screen.getByRole('combobox', { name: '기준월' }), '2026-04');
    expect(await screen.findByRole('region', { name: '예상 카드값 기준 대시보드' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: '카드결제 이체금' })).getByText('2026년 4월 · 예상 기준')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '실제' }));
    await user.click(screen.getByRole('button', { name: '예상' }));
    await user.selectOptions(screen.getByRole('combobox', { name: '기준월' }), '2026-05');
    expect(await screen.findByRole('region', { name: '예상 카드값 기준 대시보드' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '실제' }));

    await user.selectOptions(screen.getByRole('combobox', { name: '기준월' }), '2026-04');
    expect(await screen.findByRole('region', { name: '예상 카드값 기준 대시보드' })).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: '기준월' }), '2026-05');
    expect(await screen.findByRole('region', { name: '실제 카드값 기준 대시보드' })).toBeInTheDocument();
    expect(await repo.listAllActuals()).toEqual(originalActuals);
  });

  it('restores monthly choices after reopening the dashboard', async () => {
    const repo = createSeededMemoryRepository();
    await repo.addExtraSpending({ card: '현대카드', name: '4월 항목', amount: 1000, spentOn: '2026-04-01' });
    const user = userEvent.setup();
    const view = renderDashboard(repo);
    await screen.findByRole('region', { name: '예상 카드값 기준 대시보드' });
    await user.click(screen.getByRole('button', { name: '실제' }));
    await user.selectOptions(screen.getByRole('combobox', { name: '기준월' }), '2026-04');
    await screen.findByRole('region', { name: '예상 카드값 기준 대시보드' });
    await user.click(screen.getByRole('button', { name: '예상' }));
    view.unmount();

    renderDashboard(repo);
    expect(await screen.findByRole('region', { name: '실제 카드값 기준 대시보드' })).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: '기준월' }), '2026-04');
    expect(await screen.findByRole('region', { name: '예상 카드값 기준 대시보드' })).toBeInTheDocument();
  });

  it('keeps monthly choices in memory and explains when browser storage fails', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    const repo = createSeededMemoryRepository();
    await repo.addExtraSpending({ card: '현대카드', name: '4월 항목', amount: 1000, spentOn: '2026-04-01' });
    await repo.addExtraSpending({ card: '현대카드', name: '현재 월 항목', amount: 2000, spentOn: `${defaultBudgetYearMonth()}-01` });
    const user = userEvent.setup();
    renderDashboard(repo);
    await screen.findByRole('region', { name: '예상 카드값 기준 대시보드' });
    await user.click(screen.getByRole('button', { name: '실제' }));
    expect(screen.getByRole('button', { name: '실제' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('선택을 브라우저에 저장하지 못했습니다. 앱을 다시 열면 초기화될 수 있습니다.')).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: '기준월' }), '2026-04');
    await screen.findByRole('region', { name: '예상 카드값 기준 대시보드' });
    await user.selectOptions(screen.getByRole('combobox', { name: '기준월' }), defaultBudgetYearMonth());
    expect(await screen.findByRole('region', { name: '실제 카드값 기준 대시보드' })).toBeInTheDocument();
  });

  it('keeps the selected billing month memo inside the expandable strip above the funds headline without changing totals', async () => {
    const repo = await createSavingsScenario(150000, 50000);
    const month = defaultBillingYearMonth();
    await repo.setMonthlyMemo(month, '이번 달 확인사항\n카드 대금 확인');
    const user = userEvent.setup();
    renderDashboard(repo);
    const panel = await screen.findByRole('region', { name: '예상 카드값 기준 대시보드' });
    const summaryBefore = within(panel).getByRole('region', { name: '예상 카드값 기준 요약' }).textContent;
    const tableBefore = screen.getByRole('table', { name: '카드별 예산' }).textContent;
    const quickStrip = screen.getByRole('region', { name: '메모 및 수영 일정 요약' });
    expect(await within(quickStrip).findByText('이번 달 확인사항')).toBeInTheDocument();
    await user.click(within(quickStrip).getByRole('button', { name: '메모 및 수영회비 일정' }));
    const memo = await screen.findByRole('region', { name: `${formatKRW(0).replace('₩0', '')}${defaultBudgetYearMonth().slice(0, 4)}년 ${Number(defaultBudgetYearMonth().slice(5))}월 메모` });
    expect(memo).toHaveTextContent('이번 달 확인사항');
    const select = screen.getByRole('combobox', { name: '기준월' });
    const headline = screen.getByRole('region', { name: '월별 자금 핵심 요약' });
    const overview = screen.getByRole('region', { name: '예상 카드값 기준 현황' });
    expect(select.compareDocumentPosition(quickStrip) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(quickStrip.compareDocumentPosition(headline) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(headline.compareDocumentPosition(overview) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(within(panel).queryByRole('region', { name: /메모$/ })).not.toBeInTheDocument();
    await user.click(within(memo).getByRole('button', { name: '수정' }));
    await user.type(within(memo).getByRole('textbox'), '\n추가 메모');
    await user.click(within(memo).getByRole('button', { name: '저장' }));
    await waitFor(() => expect(within(memo).queryByRole('textbox')).not.toBeInTheDocument());
    expect(within(panel).getByRole('region', { name: '예상 카드값 기준 요약' }).textContent).toBe(summaryBefore);
    expect(screen.getByRole('table', { name: '카드별 예산' }).textContent).toBe(tableBefore);

    await user.click(screen.getByRole('button', { name: '백업 및 복구' }));
    expect(await screen.findByRole('dialog', { name: '데이터 백업 및 복구' })).toBeInTheDocument();
  });

  it.each([
    { savings: 150000, shortage: 0 },
    { savings: 150000, shortage: 50000 },
    { savings: 150000, shortage: 150000 },
    { savings: 150000, shortage: 200000 },
    { savings: 150000, shortage: 300000 },
    { savings: 150000, shortage: 800000 },
    { savings: 0, shortage: 50000 },
    { savings: 400000, shortage: 200000 },
  ])('uses income after fixed costs with savings $savings and shortage $shortage', async ({ savings, shortage }) => {
    const user = userEvent.setup();
    const repo = await createSavingsScenario(savings, shortage);
    renderDashboard(repo);
    const expectedPanel = await screen.findByRole('region', { name: '예상 카드값 기준 대시보드' });
    expect(screen.queryByRole('region', { name: '실제 카드값 기준 대시보드' })).not.toBeInTheDocument();
    expect(within(expectedPanel).getByRole('button', { name: '예상' })).toHaveAttribute('aria-pressed', 'true');
    const fixedTotal = 990000 + savings;
    const income = 1030000 + savings - shortage;
    const effectiveBase = Math.min(income, fixedTotal);
    const expectedSummary = within(expectedPanel).getByRole('region', { name: '예상 카드값 기준 요약' });
    expect(within(expectedSummary).getByText('총필요 예산').nextElementSibling).toHaveTextContent(formatKRW(1040000 + savings));
    expect(within(expectedSummary).getByText('부족금액').nextElementSibling).toHaveTextContent(formatKRW(shortage + 10000));
    expect(within(expectedSummary).getByText('잔액/저축액').nextElementSibling).toHaveTextContent(formatKRW(effectiveBase + 650000 - (1040000 + savings)));
    expect(within(expectedSummary).getAllByText('잔액/저축액')).toHaveLength(1);
    expect(within(expectedSummary).getByText('미충당 금액').nextElementSibling).toHaveTextContent(formatKRW(Math.max(1040000 + savings - effectiveBase - 650000, 0)));
    const expectedOverview = within(expectedPanel).getByRole('region', { name: '예상 카드값 기준 현황' });
    expect(within(expectedOverview).getByText(`사용 ${formatKRW(1040000 + savings)} / 가용 ${formatKRW(effectiveBase + 650000)}`)).toBeInTheDocument();
    await user.click(within(expectedPanel).getByRole('button', { name: '실제' }));
    const actualPanel = screen.getByRole('region', { name: '실제 카드값 기준 대시보드' });
    expect(screen.queryByRole('region', { name: '예상 카드값 기준 대시보드' })).not.toBeInTheDocument();
    expect(within(actualPanel).getByRole('button', { name: '실제' })).toHaveAttribute('aria-pressed', 'true');
    const summary = within(actualPanel).getByRole('region', { name: '실제 카드값 기준 요약' });
    const actualReserveRemaining = effectiveBase + 650000 - (1030000 + savings);
    const expectedTotals = {
      '총필요 예산': 1030000 + savings,
      '추가 지출': 50000,
      '수입': income,
      '부족금액': shortage,
      '잔액/저축액': actualReserveRemaining,
      '미충당 금액': Math.max(-actualReserveRemaining, 0),
    };
    for (const [label, value] of Object.entries(expectedTotals)) {
      const amount = within(summary).getByText(label).nextElementSibling;
      expect(amount?.textContent).toBe(formatKRW(value));
    }
    const table = screen.getByRole('table', { name: '카드별 예산' });
    const totals = within(table).getByRole('row', { name: /^합계/ });
    expect(within(totals).getAllByRole('cell').map((cell) => cell.textContent))
      .toEqual([180000, 190000, 140000, 50000].map(formatKRW));
    const overview = within(actualPanel).getByRole('region', { name: '실제 카드값 기준 현황' });
    expect(within(overview).getAllByRole('progressbar')).toHaveLength(2);
    expect(within(overview).getByRole('progressbar', { name: '예산 사용' }))
      .toHaveAttribute('aria-valuetext', `${formatKRW(1030000 + savings)} / ${formatKRW(effectiveBase + 650000)}`);
    expect(within(overview).getByText(`고정비 ${formatKRW(990000 + savings)}`)).toBeInTheDocument();
    expect(within(overview).getByText(`추가지출 ${formatKRW(40000)}`)).toBeInTheDocument();
    const reserveUsed = Math.max(1030000 + savings - effectiveBase, 0);
    const baseUsed = Math.min(reserveUsed, 150000);
    const emergencyUsed = Math.min(Math.max(reserveUsed - 150000, 0), 500000);
    const fundingUsed = baseUsed + emergencyUsed;
    const fundingCapacity = 650000;
    expect(within(overview).getByRole('progressbar', { name: '예비 자금 사용' }))
      .toHaveAttribute('aria-valuetext', `${formatKRW(fundingUsed)} / ${formatKRW(fundingCapacity)}`);
    expect(within(overview).queryByText('여유 자금')).not.toBeInTheDocument();
    expect(within(overview).getByText('월급 여유 자금')).toBeInTheDocument();
    expect(within(overview).getByText('월간 비상금')).toBeInTheDocument();
    expect(within(overview).getByText(`${formatKRW(baseUsed)} / ${formatKRW(150000)}`)).toBeInTheDocument();
    expect(within(overview).getByText(`${formatKRW(emergencyUsed)} / ${formatKRW(500000)}`)).toBeInTheDocument();
    expect(within(overview).queryByText('저축 잔액')).not.toBeInTheDocument();
    expect(within(overview).queryByText(/여행 저금/)).not.toBeInTheDocument();
    await user.click(within(actualPanel).getByRole('button', { name: '예상' }));
    expect(screen.getByRole('region', { name: '예상 카드값 기준 대시보드' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: '실제 카드값 기준 대시보드' })).not.toBeInTheDocument();
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

    const expectedPanel = screen.getByRole('region', { name: '예상 카드값 기준 대시보드' });
    await userEvent.setup().click(within(expectedPanel).getByRole('button', { name: '실제' }));
    const actualPanel = screen.getByRole('region', { name: '실제 카드값 기준 대시보드' });
    const summary = within(actualPanel).getByRole('region', { name: '실제 카드값 기준 요약' });
    expect(within(summary).getByText('총필요 예산')).toBeInTheDocument();
    expect(within(summary).getByText('추가 지출')).toBeInTheDocument();
    expect(within(summary).getByText('수입')).toBeInTheDocument();
    expect(within(summary).getByText('부족금액')).toBeInTheDocument();
    expect(within(summary).getAllByText('잔액/저축액')).toHaveLength(1);
    expect(within(summary).getByText('미충당 금액')).toBeInTheDocument();
    expect(within(summary).queryByText('예비 자금')).not.toBeInTheDocument();
    expect(within(summary).queryByText('익월 잔고')).not.toBeInTheDocument();
    const sourceMonth = previousYearMonth(yearMonth);
    const sourceFixedCosts = await repo.listFixedCosts(sourceMonth);
    const income = incomeTotal(await repo.listIncomes(sourceMonth));
    const fixed = fixedCostsTotal(sourceFixedCosts);
    const total = fixed + 150000;
    const shortage = Math.max(total - income, 0);
    const reserveRemaining = Math.min(income, fixed) - total + 150000 + 500000;
    expect(within(summary).getByText(formatKRW(total))).toBeInTheDocument();
    expect(within(summary).getByText(formatKRW(150000))).toBeInTheDocument();
    expect(within(summary).getByText(formatKRW(income))).toBeInTheDocument();
    expect(within(summary).getByText(formatKRW(shortage))).toHaveClass('text-neg');
    expect(within(summary).getByText('잔액/저축액').nextElementSibling).toHaveTextContent(formatKRW(reserveRemaining));
    const overview = within(actualPanel).getByRole('region', { name: '실제 카드값 기준 현황' });
    expect(within(overview).queryByText('여유 자금')).not.toBeInTheDocument();
    expect(within(overview).queryByText('수입보다 고정비가 커서 여유 자금 구간은 0원입니다.')).not.toBeInTheDocument();
    expect(within(overview).getByText('월급 여유 자금')).toBeInTheDocument();
    expect(within(overview).getByText('월간 비상금')).toBeInTheDocument();
    expect(within(overview).queryByText('15만 원')).not.toBeInTheDocument();
    expect(within(overview).queryByText('50만 원')).not.toBeInTheDocument();
    expect(within(overview).queryByText(/통장 추가 충당/)).not.toBeInTheDocument();
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
    const expectedPanel = screen.getByRole('region', { name: '예상 카드값 기준 대시보드' });
    expect(within(expectedPanel).getByText('총필요 예산').nextElementSibling).toHaveTextContent(formatKRW(fixedCostsTotal(sourceFixedCosts)));
    await user.click(within(expectedPanel).getByRole('button', { name: '실제' }));
    const actualPanel = screen.getByRole('region', { name: '실제 카드값 기준 대시보드' });
    await waitFor(() => expect(within(actualPanel).getByText(formatKRW(expectedTotal))).toBeInTheDocument());
    expect(within(actualPanel).getByText('총필요 예산').nextElementSibling).toHaveTextContent(formatKRW(expectedTotal));
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
    const monthSelect = await screen.findByRole('combobox', { name: '기준월' });
    await user.selectOptions(monthSelect, '2025-01');

    await waitFor(() => expect(screen.getByRole('row', { name: new RegExp(CARD_METHODS[0].replace('카드', '')) })).toHaveTextContent('₩1,000'));
  });

  it('syncs actual salary above the card table with income and recalculates shortage and card transfer total', async () => {
    const user = userEvent.setup();
    const repo = new MemoryRepository();
    const billingMonth = defaultBillingYearMonth();
    const budgetMonth = defaultBudgetYearMonth();
    const template = await repo.addIncomeTemplate({ name: '월급', defaultAmount: 5_400_000, active: true });
    await repo.addIncome({ yearMonth: budgetMonth, type: '고정수입', name: '아동수당', amount: 210_000, active: true });
    const base = { yearMonth: budgetMonth, variability: '고정' as const, active: true, sortOrder: 0 };
    await repo.addFixedCost({ ...base, paymentMethod: '현금이체', category: '생활비', name: '현금 고정비', amount: 5_240_496 });
    await repo.addFixedCost({ ...base, paymentMethod: '현대카드', category: '기타', name: '카드 고정비', amount: 300_000 });
    await repo.addExtraSpending({ card: '현대카드', name: '추가 지출', amount: 727_060, spentOn: `${budgetMonth}-01` });

    const setFixedIncomeSpy = vi.spyOn(repo, 'setFixedIncome');
    renderDashboard(repo);

    const salarySection = await screen.findByRole('region', { name: '실제 월급' });
    const cardTable = screen.getByRole('table', { name: '카드별 예산' });
    expect(salarySection.compareDocumentPosition(cardTable) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);

    const salaryInput = within(salarySection).getByRole('textbox', { name: '실제 월급' });
    expect(salaryInput).toHaveValue('5,400,000');
    expect(within(salarySection).queryByText(/기준 대비/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('월급 변동 반영')).not.toBeInTheDocument();
    const initialPaymentFunding = screen.getByRole('region', { name: '카드결제 이체금' });
    const initialStep3 = within(initialPaymentFunding).getByText('추가 지출').closest('dt');
    expect(initialStep3?.nextElementSibling).toHaveTextContent('₩77,060');
    const initialGap = within(initialPaymentFunding).getByLabelText('수입·고정비 차액');
    expect(initialStep3!.compareDocumentPosition(initialGap) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(initialGap).toHaveTextContent('+₩69,504');
    expect(initialGap).toHaveTextContent('수입 여유');

    // Focus and blur without changes does not write to storage
    await user.click(salaryInput);
    await user.tab();
    expect(setFixedIncomeSpy).not.toHaveBeenCalled();

    // Lower salary by 400,000 -> shortage and transfer total increase by 400,000
    await user.clear(salaryInput);
    await user.type(salaryInput, '5000000');
    await user.tab();

    const summary = screen.getByRole('region', { name: '예상 카드값 기준 요약' });
    const paymentFunding = screen.getByRole('region', { name: '카드결제 이체금' });
    await waitFor(() => expect(within(summary).getByText('부족금액').nextElementSibling).toHaveTextContent('₩1,057,556'));
    expect(within(salarySection).getByText('기준 대비 -₩400,000')).toBeInTheDocument();
    expect(within(paymentFunding).getByLabelText('수입·고정비 차액')).toHaveTextContent('-₩330,496');
    expect(within(paymentFunding).getByLabelText('수입·고정비 차액')).toHaveTextContent('고정비 초과');
    expect(within(paymentFunding).getByText('옮길 금액 합계').closest('div')?.querySelector('strong')).toHaveTextContent('₩407,556');
    const moreImpact = within(paymentFunding).getByLabelText('월급 변동 반영');
    expect(moreImpact).toHaveTextContent('기준 월급 대비 -₩400,000 · 기준 이체금 ₩7,556');
    expect(moreImpact).toHaveTextContent('+₩400,000');
    expect(moreImpact).toHaveTextContent('더 옮김');
    expect(setFixedIncomeSpy).toHaveBeenCalledWith(budgetMonth, template.id, 5_000_000);
    expect((await repo.listIncomes(budgetMonth)).find((item) => item.name === '월급')?.amount).toBe(5_000_000);

    // Raise salary by 600,000 from 5,400,000 -> shortage and transfer total decrease by 600,000
    await user.clear(salaryInput);
    await user.type(salaryInput, '6000000');
    await user.tab();

    await waitFor(() => expect(within(summary).getByText('부족금액').nextElementSibling).toHaveTextContent('₩57,556'));
    expect(within(salarySection).getByText('기준 대비 +₩600,000')).toBeInTheDocument();
    expect(within(paymentFunding).getByLabelText('수입·고정비 차액')).toHaveTextContent('+₩669,504');
    expect(within(paymentFunding).getByLabelText('수입·고정비 차액')).toHaveTextContent('수입 여유');
    expect(within(paymentFunding).getByText('옮길 금액 합계').closest('div')?.querySelector('strong')).toHaveTextContent('₩0');
    const lessImpact = within(paymentFunding).getByLabelText('월급 변동 반영');
    expect(lessImpact).toHaveTextContent('기준 월급 대비 +₩600,000 · 기준 이체금 ₩7,556');
    expect(lessImpact).toHaveTextContent('-₩7,556');
    expect(lessImpact).toHaveTextContent('덜 옮김');
    expect((await repo.listIncomes(budgetMonth)).find((item) => item.name === '월급')?.amount).toBe(6_000_000);
    expect(await repo.listActuals(billingMonth)).toEqual([]);
  });

  it('absorbs fixed-cost increases exceeding 5,610,000 won income into top reserve usage and keeps excess synced', async () => {
    const repo = new MemoryRepository();
    const budgetMonth = defaultBudgetYearMonth();
    await repo.addIncome({ yearMonth: budgetMonth, type: '고정수입', name: '월급', amount: 5_400_000, active: true });
    await repo.addIncome({ yearMonth: budgetMonth, type: '고정수입', name: '아동수당', amount: 210_000, active: true });
    const base = { yearMonth: budgetMonth, variability: '고정' as const, active: true, sortOrder: 0 };
    await repo.addFixedCost({ ...base, paymentMethod: '현금이체', category: '생활비', name: '현금 고정비', amount: 5_410_000 });
    await repo.addFixedCost({ ...base, paymentMethod: '현대카드', category: '기타', name: '카드 고정비', amount: 300_000 });
    await repo.addExtraSpending({ card: '현대카드', name: '추가 지출 1', amount: 200_000, spentOn: `${budgetMonth}-01` });

    const view = renderDashboard(repo);
    const headline = await screen.findByRole('region', { name: '월별 자금 핵심 요약' });
    const overview = screen.getByRole('region', { name: '예상 카드값 기준 현황' });
    const paymentFunding = screen.getByRole('region', { name: '카드결제 이체금' });

    expect(within(headline).getByText('예비자금').nextElementSibling).toHaveTextContent('650,000');
    expect(within(headline).getByText('사용금액').nextElementSibling).toHaveTextContent('300,000');
    expect(within(headline).getByText('잔액').nextElementSibling).toHaveTextContent('350,000');
    expect(within(overview).getByText('₩150,000 / ₩150,000')).toBeInTheDocument();
    expect(within(overview).getByText('₩150,000 / ₩500,000')).toBeInTheDocument();
    expect(within(paymentFunding).getByText('추가 지출').closest('dt')?.nextElementSibling).toHaveTextContent('₩0');
    expect(within(paymentFunding).getByLabelText('수입·고정비 차액')).toHaveTextContent('-₩100,000');
    expect(within(paymentFunding).getByText('옮길 금액 합계').closest('div')?.querySelector('strong')).toHaveTextContent('₩0');
    view.unmount();

    await repo.addExtraSpending({ card: '현대카드', name: '추가 지출 2', amount: 400_000, spentOn: `${budgetMonth}-02` });
    renderDashboard(repo);
    const headline2 = await screen.findByRole('region', { name: '월별 자금 핵심 요약' });
    const paymentFunding2 = screen.getByRole('region', { name: '카드결제 이체금' });
    expect(within(headline2).getByText('사용금액').nextElementSibling).toHaveTextContent('700,000');
    expect(within(headline2).getByText('초과금액').nextElementSibling).toHaveTextContent('-50,000');
    expect(within(paymentFunding2).getByText('추가 지출').closest('dt')?.nextElementSibling).toHaveTextContent('₩0');
    expect(within(paymentFunding2).getByLabelText('수입·고정비 차액')).toHaveTextContent('-₩100,000');
    expect(within(paymentFunding2).getByText('옮길 금액 합계').closest('div')?.querySelector('strong')).toHaveTextContent('₩50,000');
  });

  it('switches to next month on left swipe and previous month on right swipe without split view', async () => {
    vi.spyOn(billing, 'defaultBudgetYearMonth').mockReturnValue('2026-11');

    const repo = createSeededMemoryRepository();
    await repo.setMonthlyMemo('2026-12', '11월 대시보드 메모');
    await repo.setMonthlyMemo('2027-01', '12월 대시보드 메모');
    renderDashboard(repo);

    expect(await screen.findByText('11월 대시보드 메모')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '기준월' })).toHaveValue('2026-11');
    expect(screen.queryByRole('region', { name: /분할 대시보드/ })).not.toBeInTheDocument();

    const main = screen.getByRole('main');
    fireEvent.touchStart(main, { touches: [{ clientX: 260, clientY: 200 }] });
    fireEvent.touchMove(main, { touches: [{ clientX: 190, clientY: 204 }] });
    expect(screen.getByText('2026년 12월 →')).toBeInTheDocument();
    fireEvent.touchEnd(main, { changedTouches: [{ clientX: 140, clientY: 205 }] });

    expect(await screen.findByText('12월 대시보드 메모')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '기준월' })).toHaveValue('2026-12');

    const updatedMain = screen.getByRole('main');
    fireEvent.touchStart(updatedMain, { touches: [{ clientX: 120, clientY: 200 }] });
    fireEvent.touchMove(updatedMain, { touches: [{ clientX: 200, clientY: 202 }] });
    expect(screen.getByText('← 2026년 11월')).toBeInTheDocument();
    fireEvent.touchEnd(updatedMain, { changedTouches: [{ clientX: 240, clientY: 204 }] });

    expect(await screen.findByText('11월 대시보드 메모')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '기준월' })).toHaveValue('2026-11');
  });

  it('ignores vertical scrolling and swipes started inside input controls', async () => {
    vi.spyOn(billing, 'defaultBudgetYearMonth').mockReturnValue('2026-11');

    renderDashboard(createSeededMemoryRepository());
    const select = await screen.findByRole('combobox', { name: '기준월' });
    expect(select).toHaveValue('2026-11');

    const main = screen.getByRole('main');
    fireEvent.touchStart(main, { touches: [{ clientX: 180, clientY: 300 }] });
    fireEvent.touchMove(main, { touches: [{ clientX: 195, clientY: 180 }] });
    fireEvent.touchEnd(main, { changedTouches: [{ clientX: 195, clientY: 120 }] });
    expect(screen.getByRole('combobox', { name: '기준월' })).toHaveValue('2026-11');

    const salaryInput = screen.getByRole('textbox', { name: '실제 월급' });
    fireEvent.touchStart(salaryInput, { touches: [{ clientX: 260, clientY: 200 }] });
    fireEvent.touchMove(salaryInput, { touches: [{ clientX: 180, clientY: 200 }] });
    fireEvent.touchEnd(salaryInput, { changedTouches: [{ clientX: 120, clientY: 200 }] });
    expect(screen.getByRole('combobox', { name: '기준월' })).toHaveValue('2026-11');
  });

  it('switches months across year boundaries with previous and next buttons', async () => {
    vi.spyOn(billing, 'defaultBudgetYearMonth').mockReturnValue('2026-12');

    const user = userEvent.setup();
    renderDashboard(createSeededMemoryRepository());
    expect(await screen.findByRole('combobox', { name: '기준월' })).toHaveValue('2026-12');

    await user.click(screen.getByRole('button', { name: '다음 달' }));
    expect(await screen.findByRole('combobox', { name: '기준월' })).toHaveValue('2027-01');

    await user.click(screen.getByRole('button', { name: '이전 달' }));
    expect(await screen.findByRole('combobox', { name: '기준월' })).toHaveValue('2026-12');
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
