import { describe, it, expect } from 'vitest';
import { exportData, importData } from './backup';
import { createSeededMemoryRepository, MemoryRepository } from '../data/memoryRepository';

describe('backup', () => {
  it('내보낸 JSON을 새 저장소로 복원하면 동일 개수', async () => {
    const src = createSeededMemoryRepository();
    await src.setActual('2026-07', '현대카드', 104000);
    const json = await exportData(src);

    const dst = new MemoryRepository();
    await importData(dst, json);
    expect(await dst.listFixedCosts()).toHaveLength(39);
    expect(await dst.listIncomes()).toHaveLength(2);
    expect(await dst.listAllActuals()).toHaveLength(1);
  });

  it('형식이 잘못된 백업 파일은 거부하고 기존 데이터를 보존한다', async () => {
    const repo = createSeededMemoryRepository();
    await repo.setActual('2026-05', '현대카드', 111);

    await expect(importData(repo, '{"version":1}')).rejects.toThrow();

    expect(await repo.listFixedCosts()).toHaveLength(39);
    expect(await repo.listIncomes()).toHaveLength(2);
    expect(await repo.listAllActuals()).toHaveLength(1);
  });

  it('복원은 실제값을 완전히 교체한다 (deleteAllActuals)', async () => {
    const src = createSeededMemoryRepository();
    await src.setActual('2026-05', '현대카드', 111);

    const other = createSeededMemoryRepository();
    await other.setActual('2026-07', '현대카드', 104000);
    const json = await exportData(other);

    await importData(src, json);

    const actuals = await src.listAllActuals();
    expect(actuals.find((a) => a.yearMonth === '2026-05')).toBeUndefined();
    expect(actuals.find((a) => a.yearMonth === '2026-07')).toBeDefined();
    expect(actuals).toHaveLength(1);
  });

  it('백업에 추가지출 포함 (교체 복원)', async () => {
    const src = createSeededMemoryRepository();
    await src.addExtraSpending({ card: '현대카드', name: '코스트코', amount: 120000, spentOn: '2026-06-10' });
    const json = await exportData(src);

    const dst = createSeededMemoryRepository();
    await dst.addExtraSpending({ card: '신한카드', name: '옛날', amount: 999, spentOn: '2025-12-10' });
    await importData(dst, json);

    const extras = await dst.listAllExtraSpendings();
    expect(extras).toHaveLength(1);
    expect(extras[0].name).toBe('코스트코');
    expect(extras[0].amount).toBe(120000);
    expect(extras[0].spentOn).toBe('2026-06-10');
  });

  it('imports legacy extras with a billing month calculated from the created time', async () => {
    const repo = new MemoryRepository();
    await importData(repo, JSON.stringify({
      version: 1,
      fixedCosts: [],
      incomes: [],
      extraSpendings: [{
        yearMonth: '2026-07', card: '현대카드', name: '기존 항목', amount: 1000,
        createdAt: '2026-07-20T01:00:00.000Z',
      }],
    }));

    const [extra] = await repo.listAllExtraSpendings();
    expect(extra.spentOn).toBe('2026-07-20');
    expect(extra.yearMonth).toBe('2026-09');
  });
});
