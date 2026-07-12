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
});
