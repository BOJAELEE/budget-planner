import { describe, expect, it } from 'vitest';
import { isSwimmingPaymentMonth } from './swimmingSchedule';

describe('swimming payment schedule', () => {
  it.each([
    [2026, [5, 6, 8, 9, 11, 12]],
    [2027, [2, 3, 5, 6, 8, 9, 11, 12]],
    [2028, [2, 3, 5, 6, 8, 9, 11, 12]],
    [2030, [2, 3, 5, 6, 8, 9, 11, 12]],
  ] as const)('continues the two-on one-off cycle through %i', (year, expectedMonths) => {
    const dueMonths = Array.from({ length: 12 }, (_, index) => index + 1)
      .filter((month) => isSwimmingPaymentMonth(`${year}-${String(month).padStart(2, '0')}`));
    expect(dueMonths).toEqual(expectedMonths);
  });

  it.each(['2026-04', '2026-07', '2026-10', '2027-01', '2027-04', '2028-01'])('does not mark the break month %s', (month) => {
    expect(isSwimmingPaymentMonth(month)).toBe(false);
  });

  it.each(['2025-12', '2026-01', '2026-02', '2026-03'])('does not mark dates before the agreed schedule %s', (month) => {
    expect(isSwimmingPaymentMonth(month)).toBe(false);
  });

  it.each(['', '2026-00', '2026-13', '2026-5', '2026-05-01', 'invalid'])('rejects an invalid year-month %s', (month) => {
    expect(isSwimmingPaymentMonth(month)).toBe(false);
  });
});
