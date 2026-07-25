import type { Repository } from '../data/repository';
import { defaultBillingYearMonth, spentOnFromCreatedAt } from './billing';

export async function exportData(repo: Repository): Promise<string> {
  const [fixedCosts, incomeTemplates, incomes, actuals, extraSpendings, accountBalances, balanceSettlements] = await Promise.all([
    repo.listFixedCosts(), repo.listIncomeTemplates(), repo.listAllIncomes(), repo.listAllActuals(), repo.listAllExtraSpendings(),
    repo.listAccountBalances(), repo.listAllBalanceSettlements(),
  ]);
  return JSON.stringify({ version: 4, fixedCosts, incomeTemplates, incomes, actuals, extraSpendings, accountBalances, balanceSettlements }, null, 2);
}

export async function importData(repo: Repository, json: string): Promise<void> {
  const parsed = JSON.parse(json) as {
    fixedCosts?: unknown; incomeTemplates?: unknown; incomes?: unknown; actuals?: unknown; extraSpendings?: unknown;
    accountBalances?: unknown; balanceSettlements?: unknown;
  };
  // 삭제 전에 반드시 유효성 검증 (형식이 잘못된 파일이 기존 데이터를 지우지 않도록)
  if (
    parsed === null || typeof parsed !== 'object' ||
    !Array.isArray(parsed.fixedCosts) ||
    !Array.isArray(parsed.incomes) ||
    (parsed.actuals !== undefined && !Array.isArray(parsed.actuals)) ||
    (parsed.extraSpendings !== undefined && !Array.isArray(parsed.extraSpendings)) ||
    (parsed.accountBalances !== undefined && !Array.isArray(parsed.accountBalances)) ||
    (parsed.balanceSettlements !== undefined && !Array.isArray(parsed.balanceSettlements))
  ) {
    throw new Error('백업 파일 형식이 올바르지 않습니다.');
  }
  const data = parsed as {
    fixedCosts: any[]; incomeTemplates?: any[]; incomes: any[]; actuals?: any[]; extraSpendings?: any[];
    accountBalances?: any[]; balanceSettlements?: any[];
  };

  // 기존 데이터 제거
  for (const f of await repo.listFixedCosts()) await repo.deleteFixedCost(f.id);
  for (const i of await repo.listAllIncomes()) await repo.deleteIncome(i.id);
  for (const template of await repo.listIncomeTemplates()) await repo.deleteIncomeTemplate(template.id);
  await repo.deleteAllActuals();
  await repo.deleteAllExtraSpendings();
  // 복원 (id 제외하고 재삽입)
  for (const f of data.fixedCosts ?? []) {
    const { id, ...rest } = f; await repo.addFixedCost(rest);
  }
  const templates = new Map<string, string>();
  for (const template of data.incomeTemplates ?? []) {
    const { id, ...rest } = template;
    const created = await repo.addIncomeTemplate(rest);
    templates.set(id, created.id);
  }
  for (const i of data.incomes ?? []) {
    if (data.incomeTemplates === undefined && (i.name === '월급' || i.name === '아동수당')) {
      await repo.addIncomeTemplate({ name: i.name, defaultAmount: i.amount, active: i.active });
      continue;
    }
    const { id, templateId, ...rest } = i;
    await repo.addIncome({
      ...rest,
      yearMonth: typeof rest.yearMonth === 'string' ? rest.yearMonth : defaultBillingYearMonth(),
      type: rest.type ?? '기타수입',
      templateId: templateId ? templates.get(templateId) : undefined,
    });
  }
  for (const a of data.actuals ?? []) {
    await repo.setActual(a.yearMonth, a.paymentMethod, a.actualAmount);
  }
  for (const e of data.extraSpendings ?? []) {
    await repo.addExtraSpending({
      card: e.card,
      name: e.name,
      amount: e.amount,
      spentOn: typeof e.spentOn === 'string' ? e.spentOn : spentOnFromCreatedAt(e.createdAt),
    });
  }
  if (data.accountBalances !== undefined && data.balanceSettlements !== undefined) {
    await repo.replaceBalanceData(data.accountBalances, data.balanceSettlements);
  }
}
