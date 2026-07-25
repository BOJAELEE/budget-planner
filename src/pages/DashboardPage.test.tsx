import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { RepositoryProvider } from '../data/RepositoryContext';
import { createSeededMemoryRepository } from '../data/memoryRepository';
import { defaultBillingYearMonth } from '../lib/billing';
import DashboardPage from './DashboardPage';

describe('DashboardPage', () => {
  it('카드별 고정금액과 추가지출, 예산 요약을 표시한다', async () => {
    const yearMonth = defaultBillingYearMonth();
    const spendingMonth = new Date(`${yearMonth}-01T00:00:00Z`);
    spendingMonth.setUTCMonth(spendingMonth.getUTCMonth() - 1);
    const spentOn = `${spendingMonth.toISOString().slice(0, 7)}-01`;
    const repo = createSeededMemoryRepository();
    await repo.addExtraSpending({ card: '현대카드', name: '식비', amount: 100000, spentOn });
    await repo.addExtraSpending({ card: '신한카드', name: '외식', amount: 50000, spentOn });

    renderDashboard(repo);

    await waitFor(() => expect(screen.getByRole('table', { name: '카드별 예산' })).toBeInTheDocument());

    expect(screen.getByRole('columnheader', { name: '실제 카드값' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '예상 카드값' })).toBeInTheDocument();
    expect(screen.getAllByText('₩5,599,868')).toHaveLength(1);
    expect(screen.getAllByText('₩150,000')).toHaveLength(2);
    expect(screen.getAllByText('₩5,749,868')).toHaveLength(1);
    expect(screen.getByText('₩5,505,000')).toBeInTheDocument();
    expect(screen.getByText('부족금액 ₩244,868')).toBeInTheDocument();
    expect(screen.getByLabelText('청구월')).toHaveValue(yearMonth);
    expect(screen.getByRole('row', { name: /현대/ })).toHaveTextContent('₩204,000');
    expect(screen.getByRole('row', { name: /신한/ })).toHaveTextContent('₩881,816');
    expect(screen.getByRole('row', { name: /합계/ })).toHaveTextContent('₩1,085,816');
    expect(screen.getByRole('region', { name: '예산과 저축 현황' })).toHaveTextContent('예비금 사용');
    expect(screen.getByText('잔액 -₩244,868')).toBeInTheDocument();
    expect(screen.getByLabelText('통장 사용')).toBeInTheDocument();
  });

  it('입력한 실제 카드값으로 총 필요 예산을 계산한다', async () => {
    const user = userEvent.setup();
    renderDashboard(createSeededMemoryRepository());

    const cardRow = await screen.findByRole('row', { name: /현대/ });
    const actualAmountInput = within(cardRow).getByRole('textbox', { name: '현대카드 실제 카드값' });
    await user.clear(actualAmountInput);
    await user.type(actualAmountInput, '200000');
    await user.tab();

    await waitFor(() => expect(screen.getByText('₩5,695,868')).toBeInTheDocument());
    const updatedCardRow = screen.getByRole('row', { name: /현대/ });
    expect(within(updatedCardRow).getByRole('textbox', { name: '현대카드 실제 카드값' })).toHaveValue('200,000');
    expect(updatedCardRow).toHaveTextContent('₩104,000');
  });

  it('실제 카드값을 수정하지 않으면 예상 카드값을 계속 사용한다', async () => {
    const user = userEvent.setup();
    const repo = createSeededMemoryRepository();
    renderDashboard(repo);

    const cardRow = await screen.findByRole('row', { name: /현대/ });
    await user.click(within(cardRow).getByRole('textbox', { name: '현대카드 실제 카드값' }));
    await user.tab();

    expect(await repo.listActuals(defaultBillingYearMonth())).toEqual([]);
  });

  it('관리 타일은 대응하는 화면으로 연결한다', async () => {
    renderDashboard(createSeededMemoryRepository());
    await waitFor(() => expect(screen.getByRole('link', { name: '고정금액 관리' })).toBeInTheDocument());

    expect(screen.getByRole('link', { name: '고정금액 관리' })).toHaveAttribute('href', '/fixed');
    expect(screen.getByRole('link', { name: '추가지출 관리' })).toHaveAttribute('href', '/extra');
    expect(screen.getByRole('link', { name: '수입 관리' })).toHaveAttribute('href', '/income');
  });

  it('기록된 청구월을 선택해 해당 월의 추가지출을 표시한다', async () => {
    const repo = createSeededMemoryRepository();
    await repo.addExtraSpending({ card: '현대카드', name: '지난 지출', amount: 1000, spentOn: '2025-01-10' });
    const user = userEvent.setup();

    renderDashboard(repo);
    const monthSelect = await screen.findByLabelText('청구월');
    expect(screen.getByRole('option', { name: '2025년 2월' })).toBeInTheDocument();

    await user.selectOptions(monthSelect, '2025-02');

    await waitFor(() => expect(screen.getByRole('row', { name: /현대/ })).toHaveTextContent('₩1,000'));
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
