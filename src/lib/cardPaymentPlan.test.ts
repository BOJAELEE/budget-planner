import { describe, expect, it } from 'vitest';
import { cardPaymentPlan } from './cardPaymentPlan';
import { calculateDashboardScenario } from './calc';

describe('card payment funding plan', () => {
  it.each([
    { shortage: -10000, savingsUsed: 0, monthlyEmergencyUsed: 0, extraEmergencyNeeded: 0 },
    { shortage: 0, savingsUsed: 0, monthlyEmergencyUsed: 0, extraEmergencyNeeded: 0 },
    { shortage: 50000, savingsUsed: 50000, monthlyEmergencyUsed: 0, extraEmergencyNeeded: 0 },
    { shortage: 150000, savingsUsed: 150000, monthlyEmergencyUsed: 0, extraEmergencyNeeded: 0 },
    { shortage: 441268, savingsUsed: 150000, monthlyEmergencyUsed: 291268, extraEmergencyNeeded: 0 },
    { shortage: 650000, savingsUsed: 150000, monthlyEmergencyUsed: 500000, extraEmergencyNeeded: 0 },
    { shortage: 900000, savingsUsed: 150000, monthlyEmergencyUsed: 500000, extraEmergencyNeeded: 250000 },
  ])('splits a shortfall of $shortage without including available income twice', ({ shortage, ...parts }) => {
    const plan = cardPaymentPlan(shortage);
    expect(plan).toEqual({ ...parts, totalNeeded: Math.max(shortage, 0) });
    expect(plan.savingsUsed + plan.monthlyEmergencyUsed + plan.extraEmergencyNeeded).toBe(plan.totalNeeded);
  });

  it('matches the existing uncovered amount and does not deduct account balances', () => {
    const balances = { 월급통장: 100000, 비상금통장: 200000, 여행통장: 300000 };
    const scenario = calculateDashboardScenario(5240496, 1393216, 5610000, 5540496, balances);
    const plan = cardPaymentPlan(scenario.shortage);
    expect(plan.totalNeeded).toBe(1023712);
    expect(plan.extraEmergencyNeeded).toBe(scenario.uncoveredAmount);
    expect(scenario.balanceProjection.balancesAfter).toEqual(balances);
    expect(balances).toEqual({ 월급통장: 100000, 비상금통장: 200000, 여행통장: 300000 });
  });
});
