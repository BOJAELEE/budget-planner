import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { RepositoryProvider } from '../data/RepositoryContext';
import { createSeededMemoryRepository } from '../data/memoryRepository';
import { useBudget } from './useBudget';
import type { ReactNode } from 'react';

describe('useBudget', () => {
  it('시드 로드 후 파생값 계산', async () => {
    const repo = createSeededMemoryRepository();
    await repo.setActual('2026-07', '현대카드', 104000);
    await repo.setActual('2026-07', '신한카드', 900000);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <RepositoryProvider repo={repo}>{children}</RepositoryProvider>
    );
    const { result } = renderHook(() => useBudget('2026-07'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.derived.transferSum).toBe(4664052);
    expect(result.current.derived.incomeSum).toBe(5505000);
    // 현대카드 시드 기준선(크런치랩스 54,000 + 고속도로 통행료 50,000 = 104,000)과
    // 실제값(104,000)이 동일하므로 기준선 초과분(extra)은 0.
    expect(result.current.derived.extraByCard['현대카드']).toBe(0);
    // 신한카드 시드 기준선은 831,816원 — 실제값 900,000원과의 차액(68,184)이
    // extraByCard에 반영되는지 확인 (0이 아닌 케이스 검증).
    expect(result.current.derived.extraByCard['신한카드']).toBe(68184);
  });
});
