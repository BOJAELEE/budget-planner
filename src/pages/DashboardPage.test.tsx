import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { RepositoryProvider } from '../data/RepositoryContext';
import { createSeededMemoryRepository } from '../data/memoryRepository';
import DashboardPage from './DashboardPage';

describe('DashboardPage', () => {
  it('카드별 고정금액과 추가지출, 예산 요약을 표시한다', async () => {
    const yearMonth = new Date().toISOString().slice(0, 7);
    const previousMonth = new Date(`${yearMonth}-01T00:00:00Z`);
    previousMonth.setUTCMonth(previousMonth.getUTCMonth() - 1);
    const spentOn = `${previousMonth.toISOString().slice(0, 7)}-01`;
    const repo = createSeededMemoryRepository();
    await repo.addExtraSpending({ card: '현대카드', name: '식비', amount: 100000, spentOn });
    await repo.addExtraSpending({ card: '신한카드', name: '외식', amount: 50000, spentOn });

    renderDashboard(repo);

    await waitFor(() => expect(screen.getByRole('table', { name: '카드별 예산' })).toBeInTheDocument());

    expect(screen.getAllByText('₩5,599,868')).toHaveLength(2);
    expect(screen.getAllByText('₩150,000')).toHaveLength(2);
    expect(screen.getAllByText('₩5,749,868')).toHaveLength(2);
    expect(screen.getByText('₩5,505,000')).toBeInTheDocument();
    expect(screen.getByText('부족금액 ₩244,868')).toBeInTheDocument();
    expect(screen.getByLabelText('청구월')).toHaveValue(yearMonth);
    expect(screen.getByRole('row', { name: /현대카드/ })).toHaveTextContent('₩204,000');
    expect(screen.getByRole('row', { name: /신한카드/ })).toHaveTextContent('₩881,816');
    expect(screen.getByRole('row', { name: /총합계/ })).toHaveTextContent('₩5,749,868');
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

    await waitFor(() => expect(screen.getByRole('row', { name: /현대카드/ })).toHaveTextContent('₩105,000'));
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
