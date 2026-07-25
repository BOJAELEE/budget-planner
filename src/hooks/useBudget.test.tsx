import { describe, it, expect } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { RepositoryProvider } from '../data/RepositoryContext';
import { createSeededMemoryRepository, MemoryRepository } from '../data/memoryRepository';
import { useBudget } from './useBudget';
import type { ReactNode } from 'react';

describe('useBudget', () => {
  it('uses the previous month income and balance for the selected billing month', async () => {
    const repo = new MemoryRepository();
    await repo.addIncome({
      yearMonth: '2026-07', type: '기타수입', name: '이월 수입', amount: 123456, active: true,
    });
    await repo.setMonthlyAccountBalance('2026-07', '월급통장', 654321);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <RepositoryProvider repo={repo}>{children}</RepositoryProvider>
    );

    const { result } = renderHook(() => useBudget('2026-08'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.derived.incomeYearMonth).toBe('2026-07');
    expect(result.current.derived.incomeSum).toBe(123456);
    expect(result.current.derived.balanceYearMonth).toBe('2026-07');
    expect(result.current.derived.balanceProjection.startingBalances['월급통장']).toBe(654321);
  });

  it('시드 + 추가지출 로드 후 파생값 계산(V2)', async () => {
    const repo = createSeededMemoryRepository();
    await repo.addExtraSpending({ card: '현대카드', name: '코스트코', amount: 100000, spentOn: '2026-07-10' });
    await repo.addExtraSpending({ card: '신한카드', name: '외식', amount: 50000, spentOn: '2026-07-10' });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <RepositoryProvider repo={repo}>{children}</RepositoryProvider>
    );
    const { result } = renderHook(() => useBudget('2026-08'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    // 전체 고정비 합계 = 현금이체 4,664,052 + 카드기준선(현대 104,000 + 신한 831,816) = 5,599,868
    expect(result.current.derived.transferSum).toBe(4664052);
    expect(result.current.derived.fixedTotal).toBe(5599868);
    expect(result.current.derived.incomeSum).toBe(5505000);
    // 추가지출 합계 150,000 → 총 필요 예산 5,749,868, 잔여 = 5,505,000 − 5,749,868 = −244,868
    expect(result.current.derived.extraTotal).toBe(150000);
    expect(result.current.derived.totalBudget).toBe(5749868);
    expect(result.current.derived.remaining).toBe(-244868);
    // 카드별 추가지출
    expect(result.current.derived.extraByCard['현대카드']).toBe(100000);
    expect(result.current.derived.extraByCard['신한카드']).toBe(50000);
    expect(result.current.derived.extraByCard['삼성카드']).toBe(0);
    expect(result.current.derived.cardFixedTotal).toBe(935816);
    expect(result.current.derived.cardExtraTotal).toBe(150000);
    expect(result.current.derived.expectedCardTotal).toBe(1085816);
    expect(result.current.derived.actualCardTotal).toBe(1085816);
    expect(result.current.derived.enteredActualByCard['현대카드']).toBeUndefined();
    await act(async () => { await result.current.setActual('현대카드', 200000); });
    expect(result.current.derived.expectedByCard['현대카드']).toBe(204000);
    expect(result.current.derived.actualByCard['현대카드']).toBe(200000);
    expect(result.current.derived.actualCardTotal).toBe(1081816);
    expect(result.current.derived.totalBudget).toBe(5745868);
    expect(result.current.derived.remaining).toBe(-240868);
    expect(result.current.availableMonths).toContain('2026-08');
  });
});
