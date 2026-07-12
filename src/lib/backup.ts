import type { Repository } from '../data/repository';

export async function exportData(repo: Repository): Promise<string> {
  const [fixedCosts, incomes, actuals] = await Promise.all([
    repo.listFixedCosts(), repo.listIncomes(), repo.listAllActuals(),
  ]);
  return JSON.stringify({ version: 1, fixedCosts, incomes, actuals }, null, 2);
}

export async function importData(repo: Repository, json: string): Promise<void> {
  const parsed = JSON.parse(json) as {
    fixedCosts: any[]; incomes: any[]; actuals: any[];
  };
  // 기존 데이터 제거
  for (const f of await repo.listFixedCosts()) await repo.deleteFixedCost(f.id);
  for (const i of await repo.listIncomes()) await repo.deleteIncome(i.id);
  // 복원 (id 제외하고 재삽입)
  for (const f of parsed.fixedCosts) {
    const { id, ...rest } = f; await repo.addFixedCost(rest);
  }
  for (const i of parsed.incomes) {
    const { id, ...rest } = i; await repo.addIncome(rest);
  }
  for (const a of parsed.actuals ?? []) {
    await repo.setActual(a.yearMonth, a.paymentMethod, a.actualAmount);
  }
}
