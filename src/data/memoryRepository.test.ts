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
  it('고정수입은 월별 수정 이력을 유지하고 다음 달 기본값은 보존한다', async () => {
    const repo = createSeededMemoryRepository();
    const salary = (await repo.listIncomeTemplates()).find((item) => item.name === '월급');
    expect(salary).toBeDefined();
    if (!salary) throw new Error('월급 고정수입이 없습니다.');

    await repo.setFixedIncome('2026-07', salary.id, 5200000);

    const july = await repo.listIncomes('2026-07');
    const august = await repo.listIncomes('2026-08');
    expect(july.find((item) => item.name === '월급')?.amount).toBe(5200000);
    expect(august.find((item) => item.name === '월급')?.amount).toBe(5400000);
  });
  it('추가지출 CRUD + 월 필터', async () => {
    const repo = createSeededMemoryRepository();
    const a = await repo.addExtraSpending({ card: '현대카드', name: '코스트코', amount: 120000, spentOn: '2026-06-10' });
    await repo.addExtraSpending({ card: '신한카드', name: '지난달', amount: 5000, spentOn: '2026-05-10' });
    expect(await repo.listExtraSpendings('2026-07')).toHaveLength(1);
    expect(await repo.listAllExtraSpendings()).toHaveLength(2);
    await repo.updateExtraSpending(a.id, { amount: 130000 });
    expect((await repo.listExtraSpendings('2026-07'))[0].amount).toBe(130000);
    await repo.updateExtraSpending(a.id, { spentOn: '2026-06-20' });
    expect(await repo.listExtraSpendings('2026-07')).toHaveLength(0);
    expect(await repo.listExtraSpendings('2026-08')).toHaveLength(1);
    await repo.deleteExtraSpending(a.id);
    expect(await repo.listExtraSpendings('2026-07')).toHaveLength(0);
    await repo.deleteAllExtraSpendings();
    expect(await repo.listAllExtraSpendings()).toHaveLength(0);
  });
});
