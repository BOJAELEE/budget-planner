import { MONTHLY_EMERGENCY_AMOUNT, MONTHLY_FLEXIBLE_BASE } from './calc';

/** Presentation-only breakdown; persisted monthly balance calculations stay in calc.ts. */
export function dashboardGraphAmounts(income: number, fixedCosts: number, totalBudget: number) {
  const budgetCapacity = Math.max(income, 0) + MONTHLY_FLEXIBLE_BASE + MONTHLY_EMERGENCY_AMOUNT;
  const spent = Math.max(totalBudget, 0);
  const fixedSpent = Math.min(Math.max(fixedCosts, 0), spent);
  const additionalSpent = spent - fixedSpent;
  const incomeMargin = Math.max(income - fixedCosts, 0);
  const incomeMarginUsed = Math.min(incomeMargin, Math.max(totalBudget - fixedCosts, 0));
  const flexibleBaseUsed = Math.min(MONTHLY_FLEXIBLE_BASE, Math.max(totalBudget - income, 0));
  const emergencyUsed = Math.min(MONTHLY_EMERGENCY_AMOUNT, Math.max(totalBudget - income - MONTHLY_FLEXIBLE_BASE, 0));

  return {
    budgetCapacity,
    budgetRemaining: budgetCapacity - totalBudget,
    fixedSpent,
    additionalSpent,
    incomeMargin,
    incomeMarginUsed,
    flexibleBaseUsed,
    emergencyUsed,
    fundingCapacity: incomeMargin + MONTHLY_FLEXIBLE_BASE + MONTHLY_EMERGENCY_AMOUNT,
  };
}
