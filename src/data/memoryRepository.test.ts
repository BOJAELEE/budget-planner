import { describe, it, expect } from 'vitest';
import { createSeededMemoryRepository } from './memoryRepository';

describe('MemoryRepository', () => {
  it('시드 고정비 39개 로드', async () => {
    const repo = createSeededMemoryRepository();
    expect(await repo.listFixedCosts()).toHaveLength(39);
  });
  it('고정비 추가/수정/삭제', async () => {
    const repo = createSeededMemoryRepository();
    const added = await repo.addFixedCost({
      paymentMethod: '삼성카드', category: '구독', name: '테스트',
      amount: 5000, variability: '고정', active: true, sortOrder: 99,
    });
    expect((await repo.listFixedCosts())).toHaveLength(40);
    await repo.updateFixedCost(added.id, { amount: 6000 });
    const found = (await repo.listFixedCosts()).find((f) => f.id === added.id);
    expect(found?.amount).toBe(6000);
    await repo.deleteFixedCost(added.id);
    expect(await repo.listFixedCosts()).toHaveLength(39);
  });
  it('카드별 실제값 upsert (같은 월·카드는 덮어쓰기)', async () => {
    const repo = createSeededMemoryRepository();
    await repo.setActual('2026-07', '현대카드', 104000);
    await repo.setActual('2026-07', '현대카드', 120000);
    const list = await repo.listActuals('2026-07');
    expect(list).toHaveLength(1);
    expect(list[0].actualAmount).toBe(120000);
  });
});
