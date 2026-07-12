import { describe, it, expect } from 'vitest';
import { SEED_FIXED_COSTS, SEED_INCOMES } from './seedData';
import { PAYMENT_METHODS, CATEGORIES } from '../types';

describe('시드 데이터', () => {
  it('고정비 39개', () => {
    expect(SEED_FIXED_COSTS).toHaveLength(39);
  });
  it('모든 고정비의 결제수단·카테고리가 유효', () => {
    for (const fc of SEED_FIXED_COSTS) {
      expect(PAYMENT_METHODS).toContain(fc.paymentMethod);
      expect(CATEGORIES).toContain(fc.category);
      expect(fc.amount).toBeGreaterThan(0);
    }
  });
  it('현금이체 합계 = 4,664,052', () => {
    const sum = SEED_FIXED_COSTS
      .filter((f) => f.paymentMethod === '현금이체' || f.paymentMethod === '현금이체(자동)')
      .reduce((a, f) => a + f.amount, 0);
    expect(sum).toBe(4664052);
  });
  it('수입 2개, 합계 5,505,000', () => {
    expect(SEED_INCOMES).toHaveLength(2);
    expect(SEED_INCOMES.reduce((a, i) => a + i.amount, 0)).toBe(5505000);
  });
});
