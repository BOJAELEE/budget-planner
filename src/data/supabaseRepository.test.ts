import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupabaseRepository } from './supabaseRepository';

const db = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('../lib/supabase', () => ({ getSupabase: () => db }));

function memoQuery() {
  return {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(), not: vi.fn(), order: vi.fn(), maybeSingle: vi.fn(), single: vi.fn(),
  };
}

describe('SupabaseRepository monthly memos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads only the selected billing month and treats a missing row as an empty memo', async () => {
    const query = memoQuery();
    query.maybeSingle.mockResolvedValueOnce({ data: { year_month: '2026-11', content: '첫 줄\n둘째 줄' }, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    db.from.mockReturnValue(query);
    const repo = new SupabaseRepository();
    expect(await repo.getMonthlyMemo('2026-11')).toBe('첫 줄\n둘째 줄');
    expect(query.eq).toHaveBeenCalledWith('year_month', '2026-11');
    expect(await repo.getMonthlyMemo('2026-12')).toBe('');
    expect(db.from).toHaveBeenCalledWith('monthly_memos');
  });

  it('upserts on the billing month and reports write failures', async () => {
    const query = memoQuery();
    query.single.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: new Error('write failed') });
    db.from.mockReturnValue(query);
    const repo = new SupabaseRepository();
    await repo.setMonthlyMemo('2026-11', '수정 내용');
    expect(query.upsert).toHaveBeenCalledWith({ year_month: '2026-11', content: '수정 내용' }, { onConflict: 'year_month' });
    await expect(repo.setMonthlyMemo('2026-11', '재시도')).rejects.toThrow('write failed');
    const callsBefore = db.from.mock.calls.length;
    await expect(repo.setMonthlyMemo('2026-13', '오류')).rejects.toThrow();
    expect(db.from).toHaveBeenCalledTimes(callsBefore);
  });

  it('exports mapped rows and rejects invalid database content', async () => {
    const query = memoQuery();
    query.order.mockResolvedValueOnce({ data: [{ year_month: '2026-11', content: '메모' }], error: null })
      .mockResolvedValueOnce({ data: [{ year_month: '2026-13', content: '오류' }], error: null });
    db.from.mockReturnValue(query);
    const repo = new SupabaseRepository();
    expect(await repo.listMonthlyMemos()).toEqual([{ yearMonth: '2026-11', content: '메모' }]);
    await expect(repo.listMonthlyMemos()).rejects.toThrow();
  });

  it('scopes backup replacement deletion to the memo table', async () => {
    const query = memoQuery();
    query.not.mockResolvedValue({ error: null });
    db.from.mockReturnValue(query);
    await new SupabaseRepository().deleteAllMonthlyMemos();
    expect(db.from).toHaveBeenCalledWith('monthly_memos');
    expect(query.not).toHaveBeenCalledWith('year_month', 'is', null);
  });
});
