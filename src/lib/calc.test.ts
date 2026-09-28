import { describe, it, expect } from 'vitest';
import {
  transferTotal, cardBaseline, incomeTotal, actualsTotal,
  totalBudget, remaining, extraCardSpending, categoryBreakdown,
  fixedCostsTotal, extraSpendingTotal, extraByCardFromSpendings, sortedExtraSpendings, sortedFixedCosts, displayPercentage, totalBudgetV2, remainingV2, flexibleFunds, flexibleFundsRemaining, emergencyCoverage, projectBalanceUsage, buildMonthlyBalanceSeries, calculateDashboardScenario,
} from './calc';
import type { FixedCost, Income, MonthlyCardActual, ExtraSpending } from '../types';

const fc = (over: Partial<FixedCost>): FixedCost => ({
  id: Math.random().toString(), yearMonth: '2026-07', paymentMethod: '신한카드', category: '구독',
  name: 'x', amount: 1000, variability: '고정', active: true, sortOrder: 0, ...over,
});

describe('calc', () => {
  const costs: FixedCost[] = [
    fc({ paymentMethod: '현대카드', amount: 54000, category: '교육비' }),
    fc({ paymentMethod: '신한카드', amount: 65747, category: '통신요금' }),
    fc({ paymentMethod: '삼성카드', amount: 10000, category: '구독' }),
    fc({ paymentMethod: '현금이체', amount: 150000, category: '교육비' }),
    fc({ paymentMethod: '현금이체(자동)', amount: 200000, category: '용돈' }),
    fc({ paymentMethod: '현금이체(자동)', amount: 100000, active: false, category: '저금' }), // 비활성 제외
  ];

  it('현금이체 합계는 활성 이체 항목만', () => {
    expect(transferTotal(costs)).toBe(350000);
  });
  it('카드 기준선은 해당 카드만', () => {
    expect(cardBaseline(costs, '현대카드')).toBe(54000);
    expect(cardBaseline(costs, '신한카드')).toBe(65747);
    expect(cardBaseline(costs, '삼성카드')).toBe(10000);
  });
  it('총 필요 예산 = 현금이체 합계 + 실제 카드값 합', () => {
    const actuals: MonthlyCardActual[] = [
      { id: '1', yearMonth: '2026-07', paymentMethod: '현대카드', actualAmount: 104000 },
      { id: '2', yearMonth: '2026-07', paymentMethod: '신한카드', actualAmount: 831816 },
    ];
    expect(actualsTotal(actuals)).toBe(935816);
    expect(totalBudget(costs, actuals)).toBe(350000 + 935816);
  });
  it('잔여금액 = 수입 - 총 필요 예산', () => {
    const incomes: Income[] = [{ id: 'a', yearMonth: '2026-07', type: '고정수입', name: '월급', amount: 1000000, active: true }];
    const actuals: MonthlyCardActual[] = [
      { id: '1', yearMonth: '2026-07', paymentMethod: '현대카드', actualAmount: 100000 },
    ];
    // 수입 1,000,000 - (이체 350,000 + 카드 100,000) = 550,000
    expect(remaining(costs, incomes, actuals)).toBe(550000);
  });
  it('고정비 외 카드지출 = 실제값 - 기준선', () => {
    expect(extraCardSpending(costs, '현대카드', 104000)).toBe(50000);
  });
  it('수입합계는 활성만', () => {
    expect(incomeTotal([
      { id: '1', yearMonth: '2026-07', type: '고정수입', name: '월급', amount: 100, active: true },
      { id: '2', yearMonth: '2026-07', type: '기타수입', name: 'x', amount: 999, active: false },
    ])).toBe(100);
  });
  it('카테고리별 합계는 금액 내림차순', () => {
    const r = categoryBreakdown(costs);
    expect(r[0].amount).toBeGreaterThanOrEqual(r[r.length - 1].amount);
    const 용돈 = r.find((x) => x.category === '용돈');
    expect(용돈?.amount).toBe(200000); // 비활성 저금 100000은 제외
    expect(r.find((x) => x.category === '저금')).toBeUndefined();
  });
});

const ex = (over: Partial<ExtraSpending>): ExtraSpending => ({
  id: Math.random().toString(), yearMonth: '2026-07', card: '현대카드',
  name: 'x', amount: 1000, spentOn: '2026-06-10', createdAt: new Date().toISOString(), isSettled: false, ...over,
});

describe('extra spending calc', () => {
  const costs: FixedCost[] = [
    fc({ paymentMethod: '현대카드', amount: 54000 }),
    fc({ paymentMethod: '현금이체', amount: 150000 }),
    fc({ paymentMethod: '현금이체(자동)', amount: 200000, active: false }), // 비활성 제외
  ];
  it('fixedCostsTotal은 활성 고정비 전체 합', () => {
    expect(fixedCostsTotal(costs)).toBe(204000);
  });
  it('extraSpendingTotal', () => {
    expect(extraSpendingTotal([ex({ amount: 30000 }), ex({ amount: 20000 })])).toBe(50000);
  });
  it('keeps settled records but excludes them from totals and card estimates', () => {
    const items = [ex({ amount: 30000 }), ex({ amount: 20000, isSettled: true })];
    expect(items).toHaveLength(2);
    expect(extraSpendingTotal(items)).toBe(30000);
    expect(extraByCardFromSpendings(items)['현대카드']).toBe(30000);
    expect(totalBudgetV2(costs, items)).toBe(234000);
  });
  it('sorts extras by amount and uses recency for ties', () => {
    const items = [
      ex({ id: 'old', amount: 10000, spentOn: '2026-06-10', createdAt: '2026-06-10T01:00:00.000Z' }),
      ex({ id: 'new', amount: 10000, spentOn: '2026-06-11', createdAt: '2026-06-11T01:00:00.000Z' }),
      ex({ id: 'high', amount: 20000, spentOn: '2026-06-09', createdAt: '2026-06-09T01:00:00.000Z' }),
    ];

    expect(sortedExtraSpendings(items, false).map((item) => item.id)).toEqual(['new', 'old', 'high']);
    expect(sortedExtraSpendings(items, true).map((item) => item.id)).toEqual(['high', 'new', 'old']);
  });
  it('clamps displayed percentages from zero through one hundred', () => {
    expect(displayPercentage(120, 100)).toBe(100);
    expect(displayPercentage(-10, 100)).toBe(0);
    expect(displayPercentage(100, 0)).toBe(0);
  });
  it('sorts fixed costs by amount or their configured order', () => {
    const items = [
      fc({ id: 'later', amount: 10000, sortOrder: 2 }),
      fc({ id: 'high', amount: 20000, sortOrder: 3 }),
      fc({ id: 'first', amount: 10000, sortOrder: 1 }),
    ];

    expect(sortedFixedCosts(items, false).map((item) => item.id)).toEqual(['first', 'later', 'high']);
    expect(sortedFixedCosts(items, true).map((item) => item.id)).toEqual(['high', 'first', 'later']);
  });
  it('extraByCardFromSpendings는 카드별 합, 없으면 0', () => {
    const r = extraByCardFromSpendings([
      ex({ card: '현대카드', amount: 30000 }),
      ex({ card: '현대카드', amount: 5000 }),
      ex({ card: '신한카드', amount: 7000 }),
    ]);
    expect(r['현대카드']).toBe(35000);
    expect(r['신한카드']).toBe(7000);
    expect(r['삼성카드']).toBe(0);
  });
  it('totalBudgetV2 = 고정비합 + 추가지출합', () => {
    expect(totalBudgetV2(costs, [ex({ amount: 100000 })])).toBe(304000);
  });
  it('remainingV2 = 수입 − totalBudgetV2', () => {
    const incomes: Income[] = [{ id: 'a', yearMonth: '2026-07', type: '고정수입', name: '월급', amount: 1000000, active: true }];
    expect(remainingV2(costs, incomes, [ex({ amount: 100000 })])).toBe(696000);
  });
});

describe('balance usage projection', () => {
  const balances = { '월급통장': 100000, '비상금통장': 200000, '여행통장': 300000 };

  it('uses the salary account first when it is sufficient', () => {
    const result = projectBalanceUsage(balances, 80000);
    expect(result.allocations).toEqual([{ accountName: '월급통장', amount: 80000 }]);
    expect(result.balancesAfter).toEqual({ '월급통장': 20000, '비상금통장': 200000, '여행통장': 300000 });
    expect(result.uncoveredAmount).toBe(0);
  });

  it('continues to the next account when a balance is insufficient', () => {
    const result = projectBalanceUsage(balances, 250000);
    expect(result.allocations).toEqual([
      { accountName: '월급통장', amount: 100000 },
      { accountName: '비상금통장', amount: 150000 },
    ]);
    expect(result.balancesAfter['비상금통장']).toBe(50000);
  });

  it('reports the amount that cannot be covered by all accounts', () => {
    const result = projectBalanceUsage(balances, 700000);
    expect(result.balancesAfter).toEqual({ '월급통장': 0, '비상금통장': 0, '여행통장': 0 });
    expect(result.uncoveredAmount).toBe(100000);
  });

  it('uses the monthly emergency allowance before account balances', () => {
    const balances = { '월급통장': 7160, '비상금통장': 411783, '여행통장': 260030 };
    const emergency = emergencyCoverage(1099546);
    const result = projectBalanceUsage(balances, emergency.accountUsage);

    expect(emergency).toEqual({ used: 500000, remaining: 0, accountUsage: 599546 });
    expect(result.uncoveredAmount).toBe(0);
    expect(emergencyCoverage(-100000)).toEqual({ used: 0, remaining: 500000, accountUsage: 0 });
  });
});

describe('flexible funds', () => {
  it('adds 150,000 won to the income remaining after all fixed costs', () => {
    expect(flexibleFunds(5610000, 5470000)).toBe(290000);
    expect(flexibleFundsRemaining(5610000, 5470000, 6950000)).toBe(-1190000);
    expect(flexibleFunds(500000, 650000)).toBe(0);
  });
});

describe('dashboard scenario comparison', () => {
  it('combines income after fixed costs with the monthly 150,000 won', () => {
    const balances = { '월급통장': 0, '비상금통장': 0, '여행통장': 0 };
    const scenario = calculateDashboardScenario(5470000, 1480000, 5610000, 5470000, balances);

    expect(scenario.flexibleAvailable).toBe(290000);
    expect(scenario.flexibleUsed).toBe(1480000);
    expect(scenario.flexibleRemaining).toBe(-1190000);
    expect(scenario.emergencyUsed).toBe(500000);
    expect(scenario.uncoveredAmount).toBe(690000);
    expect(scenario.balanceProjection.uncoveredAmount).toBe(0);
  });

  it('uses one opening balance for both card totals without mutating it', () => {
    const balances = { '월급통장': 100000, '비상금통장': 200000, '여행통장': 0 };
    const expected = calculateDashboardScenario(500000, 200000, 550000, 600000, balances);
    const actual = calculateDashboardScenario(500000, 300000, 550000, 600000, balances);

    expect(expected.totalBudget).toBe(700000);
    expect(actual.totalBudget).toBe(800000);
    expect(expected.shortage).toBe(150000);
    expect(actual.shortage).toBe(250000);
    expect(expected.flexibleAvailable).toBe(100000);
    expect(expected.flexibleUsed).toBe(100000);
    expect(actual.flexibleUsed).toBe(200000);
    expect(expected.emergencyUsed).toBe(0);
    expect(actual.emergencyUsed).toBe(100000);
    expect(expected.balanceProjection.balancesAfter).toEqual(balances);
    expect(actual.balanceProjection.balancesAfter).toEqual(balances);
    expect(balances).toEqual({ '월급통장': 100000, '비상금통장': 200000, '여행통장': 0 });
  });

  it('shows any shortfall after the monthly emergency reserve without drawing from accounts', () => {
    const balances = { '월급통장': 100000, '비상금통장': 200000, '여행통장': 0 };
    const expected = calculateDashboardScenario(500000, 900000, 550000, 600000, balances);
    const actual = calculateDashboardScenario(500000, 1100000, 550000, 600000, balances);

    expect(expected.emergencyUsed).toBe(500000);
    expect(expected.uncoveredAmount).toBe(200000);
    expect(expected.balanceProjection.balancesAfter).toEqual(balances);
    expect(actual.emergencyUsed).toBe(500000);
    expect(actual.uncoveredAmount).toBe(400000);
    expect(actual.balanceProjection.balancesAfter).toEqual(balances);
    expect(balances).toEqual({ '월급통장': 100000, '비상금통장': 200000, '여행통장': 0 });
  });

  it('treats an actual card bill below its fixed baseline as unused flexible funds', () => {
    const balances = { '월급통장': 0, '비상금통장': 0, '여행통장': 0 };
    const scenario = calculateDashboardScenario(500000, 50000, 650000, 600000, balances);

    expect(scenario.flexibleAvailable).toBe(200000);
    expect(scenario.flexibleUsed).toBe(-50000);
    expect(scenario.flexibleRemaining).toBe(250000);
    expect(scenario.emergencyUsed).toBe(0);
    expect(scenario.balanceProjection.uncoveredAmount).toBe(0);
  });
});

describe('monthly balance rollover', () => {
  it('carries the expected ending balance into the next month', () => {
    const result = buildMonthlyBalanceSeries([
      { id: 'salary', yearMonth: '2026-07', accountName: '월급통장', openingAmount: 100000, isManual: true },
      { id: 'reserve', yearMonth: '2026-07', accountName: '비상금통장', openingAmount: 200000, isManual: true },
      { id: 'travel', yearMonth: '2026-07', accountName: '여행통장', openingAmount: 300000, isManual: true },
    ], { '2026-08': 250000, '2026-09': 50000 }, '2026-09');

    expect(result.projections['2026-08'].balancesAfter).toEqual({ '월급통장': 0, '비상금통장': 50000, '여행통장': 300000 });
    expect(result.projections['2026-09'].startingBalances).toEqual({ '월급통장': 0, '비상금통장': 50000, '여행통장': 300000 });
    expect(result.projections['2026-09'].balancesAfter).toEqual({ '월급통장': 0, '비상금통장': 0, '여행통장': 300000 });
  });

  it('keeps a manually entered month as the next rollover baseline', () => {
    const result = buildMonthlyBalanceSeries([
      { id: 'july-salary', yearMonth: '2026-07', accountName: '월급통장', openingAmount: 100000, isManual: true },
      { id: 'aug-salary', yearMonth: '2026-08', accountName: '월급통장', openingAmount: 400000, isManual: true },
    ], { '2026-08': 90000, '2026-09': 100000, '2026-10': 50000 }, '2026-10');

    expect(result.projections['2026-09'].startingBalances['월급통장']).toBe(400000);
    expect(result.projections['2026-10'].startingBalances['월급통장']).toBe(300000);
  });
});
