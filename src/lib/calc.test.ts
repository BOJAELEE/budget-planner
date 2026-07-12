import { describe, it, expect } from 'vitest';
import {
  transferTotal, cardBaseline, incomeTotal, actualsTotal,
  totalBudget, remaining, extraCardSpending, categoryBreakdown,
  fixedCostsTotal, extraSpendingTotal, extraByCardFromSpendings, totalBudgetV2, remainingV2,
} from './calc';
import type { FixedCost, Income, MonthlyCardActual, ExtraSpending } from '../types';

const fc = (over: Partial<FixedCost>): FixedCost => ({
  id: Math.random().toString(), paymentMethod: '신한카드', category: '구독',
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
    const incomes: Income[] = [{ id: 'a', name: '월급', amount: 1000000, active: true }];
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
      { id: '1', name: '월급', amount: 100, active: true },
      { id: '2', name: 'x', amount: 999, active: false },
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
  name: 'x', amount: 1000, createdAt: new Date().toISOString(), ...over,
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
    const incomes: Income[] = [{ id: 'a', name: '월급', amount: 1000000, active: true }];
    expect(remainingV2(costs, incomes, [ex({ amount: 100000 })])).toBe(696000);
  });
});
