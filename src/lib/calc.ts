import type { FixedCost, Income, MonthlyCardActual, ExtraSpending, CardMethod, Category } from '../types';
import { TRANSFER_METHODS, CARD_METHODS } from '../types';

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

export function extraSpendingTotal(items: ExtraSpending[]): number {
  return items.reduce((a, x) => a + x.amount, 0);
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
