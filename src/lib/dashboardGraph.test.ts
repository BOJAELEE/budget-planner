import { describe, expect, it } from 'vitest';
import { dashboardGraphAmounts } from './dashboardGraph';

describe('dashboard graph breakdown', () => {
  it('separates fixed costs and additional spending within income plus both allowances', () => {
    expect(dashboardGraphAmounts(5_610_000, 5_460_000, 6_049_506)).toMatchObject({
      budgetCapacity: 6_260_000,
      budgetRemaining: 210_494,
      fixedSpent: 5_460_000,
      additionalSpent: 589_506,
      incomeMargin: 150_000,
      incomeMarginUsed: 150_000,
      flexibleBaseUsed: 150_000,
      emergencyUsed: 289_506,
      fundingCapacity: 800_000,
    });
  });

  it('shows a fixed-cost deficit consuming the 150,000 won and then the 500,000 won sections', () => {
    expect(dashboardGraphAmounts(400_000, 500_000, 650_000)).toMatchObject({
      budgetCapacity: 1_050_000,
      incomeMargin: 0,
      incomeMarginUsed: 0,
      flexibleBaseUsed: 150_000,
      emergencyUsed: 100_000,
    });
  });

  it('caps displayed use at section limits and leaves account shortages to the existing calculation', () => {
    expect(dashboardGraphAmounts(1_000_000, 900_000, 1_800_000)).toMatchObject({
      budgetCapacity: 1_650_000,
      budgetRemaining: -150_000,
      incomeMarginUsed: 100_000,
      flexibleBaseUsed: 150_000,
      emergencyUsed: 500_000,
    });
  });

  it('does not show a negative-width additional segment when actual card spending is below fixed costs', () => {
    expect(dashboardGraphAmounts(1_000_000, 900_000, 800_000)).toMatchObject({
      fixedSpent: 800_000,
      additionalSpent: 0,
      incomeMarginUsed: 0,
      flexibleBaseUsed: 0,
      emergencyUsed: 0,
    });
  });
});
