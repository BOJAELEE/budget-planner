import { MONTHLY_EMERGENCY_AMOUNT, MONTHLY_FLEXIBLE_BASE } from './calc';

/** Presentation-only breakdown for the top dashboard; excludes income-over-fixed-cost surplus. */
export function dashboardGraphAmounts(income: number, fixedCosts: number, totalBudget: number) {
  const effectiveBase = Math.min(income, fixedCosts);
  const budgetCapacity = Math.max(effectiveBase, 0) + MONTHLY_FLEXIBLE_BASE + MONTHLY_EMERGENCY_AMOUNT;
  const spent = Math.max(totalBudget, 0);
  const fixedSpent = Math.min(Math.max(fixedCosts, 0), spent);
  const additionalSpent = spent - fixedSpent;
  const reserveUsed = Math.max(totalBudget - effectiveBase, 0);
  const flexibleBaseUsed = Math.min(MONTHLY_FLEXIBLE_BASE, reserveUsed);
  const emergencyUsed = Math.min(MONTHLY_EMERGENCY_AMOUNT, Math.max(reserveUsed - MONTHLY_FLEXIBLE_BASE, 0));

  return {
    budgetCapacity,
    budgetRemaining: budgetCapacity - totalBudget,
    fixedSpent,
    additionalSpent,
    incomeMargin: 0,
    incomeMarginUsed: 0,
    flexibleBaseUsed,
    emergencyUsed,
    fundingCapacity: MONTHLY_FLEXIBLE_BASE + MONTHLY_EMERGENCY_AMOUNT,
  };
}
