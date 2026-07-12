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
});
