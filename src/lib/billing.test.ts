import { describe, expect, it } from 'vitest';
import { billingCutoffDay, billingMonthFor, defaultBillingYearMonth, spentOnFromCreatedAt } from './billing';

describe('billingMonthFor', () => {
  it.each([
    ['현대카드', '2026-07-18', '2026-08'],
    ['현대카드', '2026-07-19', '2026-08'],
    ['현대카드', '2026-07-20', '2026-09'],
    ['신한카드', '2026-07-15', '2026-08'],
    ['신한카드', '2026-07-16', '2026-08'],
    ['신한카드', '2026-07-17', '2026-09'],
    ['삼성카드', '2026-07-18', '2026-08'],
    ['삼성카드', '2026-07-19', '2026-08'],
    ['삼성카드', '2026-07-20', '2026-09'],
  ] as const)('%s %s 사용분은 %s 청구월이다', (card, spentOn, expected) => {
    expect(billingMonthFor(card, spentOn)).toBe(expected);
  });

  it('연도 경계를 넘는 청구월을 계산한다', () => {
    expect(billingMonthFor('현대카드', '2026-12-20')).toBe('2027-02');
  });
});

describe('billingCutoffDay', () => {
  it('returns the selected card cutoff day', () => {
    expect(billingCutoffDay('현대카드')).toBe(19);
    expect(billingCutoffDay('신한카드')).toBe(16);
    expect(billingCutoffDay('삼성카드')).toBe(19);
  });
});

describe('spentOnFromCreatedAt', () => {
  it('기존 기록시각을 한국 시간의 사용일로 변환한다', () => {
    expect(spentOnFromCreatedAt('2026-06-30T15:30:00.000Z')).toBe('2026-07-01');
  });
});

describe('defaultBillingYearMonth', () => {
  it.each([
    ['2026-07-01T12:00:00.000Z', '2026-07'],
    ['2026-07-02T12:00:00.000Z', '2026-08'],
    ['2026-07-31T12:00:00.000Z', '2026-08'],
    ['2026-12-02T12:00:00.000Z', '2027-01'],
  ])('uses the next billing month from the second day: %s', (date, expected) => {
    expect(defaultBillingYearMonth(new Date(date))).toBe(expected);
  });
});
