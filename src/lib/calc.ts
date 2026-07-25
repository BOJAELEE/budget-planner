import type { FixedCost, Income, MonthlyCardActual, ExtraSpending, CardMethod, Category, AccountName, BalanceAllocation, MonthlyAccountBalance } from '../types';
import { TRANSFER_METHODS, CARD_METHODS, ACCOUNT_NAMES } from '../types';

const activeAmount = (items: { amount: number; active: boolean }[]) =>
  items.filter((i) => i.active).reduce((a, i) => a + i.amount, 0);

export function transferTotal(fixedCosts: FixedCost[]): number {
  return activeAmount(
    fixedCosts.filter((f) => (TRANSFER_METHODS as readonly string[]).includes(f.paymentMethod)),
  );
}

export function cardBaseline(fixedCosts: FixedCost[], card: CardMethod): number {
  return activeAmount(fixedCosts.filter((f) => f.paymentMethod === card));
}

export function incomeTotal(incomes: Income[]): number {
  return activeAmount(incomes);
}

export function actualsTotal(actuals: MonthlyCardActual[]): number {
  return actuals.reduce((a, x) => a + x.actualAmount, 0);
}

export function totalBudget(fixedCosts: FixedCost[], actuals: MonthlyCardActual[]): number {
  return transferTotal(fixedCosts) + actualsTotal(actuals);
}

export function remaining(
  fixedCosts: FixedCost[], incomes: Income[], actuals: MonthlyCardActual[],
): number {
  return incomeTotal(incomes) - totalBudget(fixedCosts, actuals);
}

export function extraCardSpending(
  fixedCosts: FixedCost[], card: CardMethod, actualAmount: number,
): number {
  return actualAmount - cardBaseline(fixedCosts, card);
}

export function fixedCostsTotal(fixedCosts: FixedCost[]): number {
  return activeAmount(fixedCosts);
}

export function savingsTotals(fixedCosts: FixedCost[]) {
  let travelSaving = 0;
  let reserveLiving = 0;

  for (const cost of fixedCosts) {
    if (!cost.active) continue;
    const normalizedName = cost.name.replace(/\s/g, '');
    if (normalizedName.includes('여행저금')) travelSaving += cost.amount;
    if (normalizedName.includes('예비생활비')) reserveLiving += cost.amount;
  }

  return {
    travelSaving,
    reserveLiving,
    totalSavings: travelSaving + reserveLiving,
  };
}

export function extraSpendingTotal(items: ExtraSpending[]): number {
  return items.reduce((a, x) => a + x.amount, 0);
}

export function sortedExtraSpendings(items: ExtraSpending[], sortByAmount: boolean): ExtraSpending[] {
  return [...items].sort((a, b) => {
    if (sortByAmount && a.amount !== b.amount) return b.amount - a.amount;
    return b.spentOn.localeCompare(a.spentOn) || b.createdAt.localeCompare(a.createdAt);
  });
}

export function sortedFixedCosts(items: FixedCost[], sortByAmount: boolean): FixedCost[] {
  return [...items].sort((a, b) => {
    if (sortByAmount && a.amount !== b.amount) return b.amount - a.amount;
    return a.sortOrder - b.sortOrder || a.id.localeCompare(b.id);
  });
}

export function displayPercentage(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.min(Math.max((numerator / denominator) * 100, 0), 100);
}

export function extraByCardFromSpendings(items: ExtraSpending[]): Record<CardMethod, number> {
  const r = Object.fromEntries(CARD_METHODS.map((c) => [c, 0])) as Record<CardMethod, number>;
  for (const it of items) r[it.card] += it.amount;
  return r;
}

export function totalBudgetV2(fixedCosts: FixedCost[], extras: ExtraSpending[]): number {
  return fixedCostsTotal(fixedCosts) + extraSpendingTotal(extras);
}

export function remainingV2(
  fixedCosts: FixedCost[], incomes: Income[], extras: ExtraSpending[],
): number {
  return incomeTotal(incomes) - totalBudgetV2(fixedCosts, extras);
}

export function categoryBreakdown(
  fixedCosts: FixedCost[],
): { category: Category; amount: number }[] {
  const map = new Map<Category, number>();
  for (const f of fixedCosts) {
    if (!f.active) continue;
    map.set(f.category, (map.get(f.category) ?? 0) + f.amount);
  }
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export type BalanceProjection = {
  startingBalances: Record<AccountName, number>;
  balancesAfter: Record<AccountName, number>;
  allocations: BalanceAllocation[];
  uncoveredAmount: number;
};

export function projectBalanceUsage(
  balances: Record<AccountName, number>,
  shortageAmount: number,
  previousAllocations: BalanceAllocation[] = [],
): BalanceProjection {
  const startingBalances = Object.fromEntries(
    ACCOUNT_NAMES.map((accountName) => [accountName, Math.max(0, balances[accountName] ?? 0)]),
  ) as Record<AccountName, number>;

  for (const allocation of previousAllocations) {
    startingBalances[allocation.accountName] += Math.max(0, allocation.amount);
  }

  const balancesAfter = { ...startingBalances };
  const allocations: BalanceAllocation[] = [];
  let remainingAmount = Math.max(0, shortageAmount);

  for (const accountName of ACCOUNT_NAMES) {
    const amount = Math.min(balancesAfter[accountName], remainingAmount);
    if (amount > 0) allocations.push({ accountName, amount });
    balancesAfter[accountName] -= amount;
    remainingAmount -= amount;
  }

  return { startingBalances, balancesAfter, allocations, uncoveredAmount: remainingAmount };
}

function addMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(Date.UTC(year, month, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function buildMonthlyBalanceSeries(
  records: MonthlyAccountBalance[],
  shortagesByMonth: Record<string, number>,
  throughMonth: string,
) {
  const manualByMonth = new Map<string, Record<AccountName, number>>();
  const allMonths = new Set<string>([throughMonth, ...Object.keys(shortagesByMonth)]);
  for (const record of records) {
    // A balance entered for July is the opening balance used by the August billing month.
    allMonths.add(addMonth(record.yearMonth));
    if (!record.isManual) continue;
    const current = manualByMonth.get(record.yearMonth) ?? Object.fromEntries(
      ACCOUNT_NAMES.map((accountName) => [accountName, 0]),
    ) as Record<AccountName, number>;
    current[record.accountName] = Math.max(0, record.openingAmount);
    manualByMonth.set(record.yearMonth, current);
  }
  const firstMonth = [...allMonths].sort((a, b) => a.localeCompare(b))[0];
  const lastMonth = [...allMonths].sort((a, b) => b.localeCompare(a))[0];
  const projections: Record<string, BalanceProjection> = {};
  const automaticBalances: MonthlyAccountBalance[] = [];
  let opening = Object.fromEntries(ACCOUNT_NAMES.map((accountName) => [accountName, 0])) as Record<AccountName, number>;

  for (let month = firstMonth; month <= lastMonth; month = addMonth(month)) {
    const [year, monthNumber] = month.split('-').map(Number);
    const sourceDate = new Date(Date.UTC(year, monthNumber - 2, 1));
    const sourceMonth = `${sourceDate.getUTCFullYear()}-${String(sourceDate.getUTCMonth() + 1).padStart(2, '0')}`;
    const manual = manualByMonth.get(sourceMonth);
    if (manual) opening = { ...manual };
    else {
      automaticBalances.push(...ACCOUNT_NAMES.map((accountName, index) => ({
        id: `auto-${sourceMonth}-${index}`,
        yearMonth: sourceMonth,
        accountName,
        openingAmount: opening[accountName],
        isManual: false,
      })));
    }
    const projection = projectBalanceUsage(opening, shortagesByMonth[month] ?? 0);
    projections[month] = projection;
    opening = projection.balancesAfter;
  }

  return { projections, automaticBalances };
}
