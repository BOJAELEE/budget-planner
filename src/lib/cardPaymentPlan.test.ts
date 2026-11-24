import { describe, expect, it } from 'vitest';
import { cardPaymentPlan, cardPaymentSalaryImpact, extraSpendingBeyondAllowance } from './cardPaymentPlan';
import { calculateDashboardScenario } from './calc';

describe('card payment funding plan', () => {
  it.each([
    { shortage: -10000, reserveUsed: 0, monthlyEmergencyUsed: 0, extraEmergencyNeeded: 0, totalNeeded: 0 },
    { shortage: 0, reserveUsed: 0, monthlyEmergencyUsed: 0, extraEmergencyNeeded: 0, totalNeeded: 0 },
    { shortage: 50000, reserveUsed: 50000, monthlyEmergencyUsed: 0, extraEmergencyNeeded: 0, totalNeeded: 0 },
    { shortage: 150000, reserveUsed: 150000, monthlyEmergencyUsed: 0, extraEmergencyNeeded: 0, totalNeeded: 0 },
    { shortage: 441268, reserveUsed: 150000, monthlyEmergencyUsed: 291268, extraEmergencyNeeded: 0, totalNeeded: 0 },
    { shortage: 650000, reserveUsed: 150000, monthlyEmergencyUsed: 500000, extraEmergencyNeeded: 0, totalNeeded: 0 },
    { shortage: 900000, reserveUsed: 150000, monthlyEmergencyUsed: 500000, extraEmergencyNeeded: 250000, totalNeeded: 250000 },
    { shortage: 1516084, reserveUsed: 150000, monthlyEmergencyUsed: 500000, extraEmergencyNeeded: 866084, totalNeeded: 866084 },
  ])('excludes salary reserve and 500,000 won auto-transfer emergency allowance for shortage $shortage', ({ shortage, ...expected }) => {
    const plan = cardPaymentPlan(shortage);
    expect(plan).toEqual(expected);
    expect(plan.reserveUsed + plan.monthlyEmergencyUsed + plan.extraEmergencyNeeded).toBe(Math.max(shortage, 0));
    expect(plan.extraEmergencyNeeded).toBe(plan.totalNeeded);
  });

  it('matches the existing uncovered amount and does not deduct account balances', () => {
    const balances = { 월급통장: 100000, 비상금통장: 200000, 여행통장: 300000 };
    const scenario = calculateDashboardScenario(5240496, 1393216, 5610000, 5540496, balances);
    const plan = cardPaymentPlan(scenario.shortage);
    expect(plan.reserveUsed).toBe(150000);
    expect(plan.monthlyEmergencyUsed).toBe(500000);
    expect(plan.totalNeeded).toBe(373712);
    expect(plan.extraEmergencyNeeded).toBe(scenario.uncoveredAmount);
    expect(plan.totalNeeded).toBe(scenario.uncoveredAmount);
    expect(scenario.balanceProjection.balancesAfter).toEqual(balances);
    expect(balances).toEqual({ 월급통장: 100000, 비상금통장: 200000, 여행통장: 300000 });
  });

  it('computes the transfer delta caused by salary variations against baseline salary', () => {
    expect(cardPaymentSalaryImpact(1_316_084, -1_316_084, 200_000)).toEqual({
      salaryDelta: 200_000,
      baselineTransferAmount: 866_084,
      transferDelta: -200_000,
    });
    expect(cardPaymentSalaryImpact(1_916_084, -1_916_084, -400_000)).toEqual({
      salaryDelta: -400_000,
      baselineTransferAmount: 866_084,
      transferDelta: 400_000,
    });
    expect(cardPaymentSalaryImpact(0, 500_000, 1_890_000)).toEqual({
      salaryDelta: 1_890_000,
      baselineTransferAmount: 740_000,
      transferDelta: -740_000,
    });
    expect(cardPaymentSalaryImpact(840_000, -840_000, -300_000)).toEqual({
      salaryDelta: -300_000,
      baselineTransferAmount: 0,
      transferDelta: 190_000,
    });
    expect(cardPaymentSalaryImpact(1_516_084, -1_516_084, 0)).toEqual({
      salaryDelta: 0,
      baselineTransferAmount: 866_084,
      transferDelta: 0,
    });
  });

  it('calculates additional spending beyond the combined 650,000 won allowance', () => {
    expect(extraSpendingBeyondAllowance(1_515_926)).toBe(865_926);
    expect(extraSpendingBeyondAllowance(650_000)).toBe(0);
    expect(extraSpendingBeyondAllowance(200_000)).toBe(0);
    expect(extraSpendingBeyondAllowance(-50_000)).toBe(0);
  });
});
