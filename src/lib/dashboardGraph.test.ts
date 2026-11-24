import { describe, expect, it } from 'vitest';
import { dashboardGraphAmounts } from './dashboardGraph';

describe('dashboard graph breakdown', () => {
  it('separates fixed costs and additional spending within fixed costs plus both allowances when income > fixed costs', () => {
    expect(dashboardGraphAmounts(5_610_000, 5_460_000, 6_049_506)).toMatchObject({
      budgetCapacity: 6_110_000,
      budgetRemaining: 60_494,
      fixedSpent: 5_460_000,
      additionalSpent: 589_506,
      incomeMargin: 0,
      incomeMarginUsed: 0,
      flexibleBaseUsed: 150_000,
      emergencyUsed: 439_506,
      fundingCapacity: 650_000,
    });
  });

  it('shows a fixed-cost deficit consuming the 150,000 won and then the 500,000 won sections', () => {
    expect(dashboardGraphAmounts(400_000, 500_000, 650_000)).toMatchObject({
      budgetCapacity: 1_050_000,
      incomeMargin: 0,
      incomeMarginUsed: 0,
      flexibleBaseUsed: 150_000,
      emergencyUsed: 100_000,
      fundingCapacity: 650_000,
    });
  });

  it('caps displayed use at section limits without adding income surplus to the top dashboard', () => {
    expect(dashboardGraphAmounts(1_000_000, 900_000, 1_800_000)).toMatchObject({
      budgetCapacity: 1_550_000,
      budgetRemaining: -250_000,
      incomeMarginUsed: 0,
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
