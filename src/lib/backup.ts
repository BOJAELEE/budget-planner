import type { Repository } from '../data/repository';

export async function exportData(repo: Repository): Promise<string> {
  const [fixedCosts, incomes, actuals] = await Promise.all([
    repo.listFixedCosts(), repo.listIncomes(), repo.listAllActuals(),
  ]);
  return JSON.stringify({ version: 1, fixedCosts, incomes, actuals }, null, 2);
}

export async function importData(repo: Repository, json: string): Promise<void> {
  const parsed = JSON.parse(json) as {
    fixedCosts?: unknown; incomes?: unknown; actuals?: unknown;
  };
  // 삭제 전에 반드시 유효성 검증 (형식이 잘못된 파일이 기존 데이터를 지우지 않도록)
  if (
    parsed === null || typeof parsed !== 'object' ||
    !Array.isArray(parsed.fixedCosts) ||
    !Array.isArray(parsed.incomes) ||
    (parsed.actuals !== undefined && !Array.isArray(parsed.actuals))
  ) {
    throw new Error('백업 파일 형식이 올바르지 않습니다.');
  }
  const data = parsed as { fixedCosts: any[]; incomes: any[]; actuals?: any[] };

  // 기존 데이터 제거
  for (const f of await repo.listFixedCosts()) await repo.deleteFixedCost(f.id);
  for (const i of await repo.listIncomes()) await repo.deleteIncome(i.id);
  await repo.deleteAllActuals();
  // 복원 (id 제외하고 재삽입)
  for (const f of data.fixedCosts ?? []) {
    const { id, ...rest } = f; await repo.addFixedCost(rest);
  }
  for (const i of data.incomes ?? []) {
    const { id, ...rest } = i; await repo.addIncome(rest);
  }
  for (const a of data.actuals ?? []) {
    await repo.setActual(a.yearMonth, a.paymentMethod, a.actualAmount);
  }
}
