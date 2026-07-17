import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { RepositoryProvider } from '../data/RepositoryContext';
import { createSeededMemoryRepository } from '../data/memoryRepository';
import DashboardPage from './DashboardPage';

describe('DashboardPage', () => {
  it('카드별 고정금액과 추가지출, 예산 요약을 표시한다', async () => {
    const yearMonth = new Date().toISOString().slice(0, 7);
    const repo = createSeededMemoryRepository();
    await repo.addExtraSpending({ yearMonth, card: '현대카드', name: '식비', amount: 100000 });
    await repo.addExtraSpending({ yearMonth, card: '신한카드', name: '외식', amount: 50000 });

    renderDashboard(repo);

    await waitFor(() => expect(screen.getByRole('table', { name: '카드별 예산' })).toBeInTheDocument());

    expect(screen.getAllByText('₩5,599,868')).toHaveLength(2);
    expect(screen.getAllByText('₩150,000')).toHaveLength(2);
    expect(screen.getAllByText('₩5,749,868')).toHaveLength(2);
    expect(screen.getByText('₩5,505,000')).toBeInTheDocument();
    expect(screen.getByText('부족금액 ₩244,868')).toBeInTheDocument();
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
