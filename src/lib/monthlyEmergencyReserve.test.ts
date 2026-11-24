import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MONTHLY_EMERGENCY_RESERVE_BALANCE_KEY,
  calculateEmergencyReserveCoverage,
  loadMonthlyEmergencyReserveBalance,
  saveMonthlyEmergencyReserveBalance,
} from './monthlyEmergencyReserve';

describe('monthlyEmergencyReserve', () => {
  afterEach(() => {
    localStorage.removeItem(MONTHLY_EMERGENCY_RESERVE_BALANCE_KEY);
    vi.restoreAllMocks();
  });

  it('includes the current month before the 28th transfer cutoff', () => {
    const nov24 = new Date('2026-11-24T05:00:00.000Z');
    const nov27 = new Date('2026-11-27T14:00:00.000Z');

    expect(calculateEmergencyReserveCoverage(0, nov24)).toEqual({
      coveredUntilYearMonth: null,
      coveredMonths: 0,
      isAfterTransfer: false,
      label: '이번 달 충당금 부족',
    });
    expect(calculateEmergencyReserveCoverage(499_999, nov24).label).toBe('이번 달 충당금 부족');
    expect(calculateEmergencyReserveCoverage(500_000, nov24).label).toBe('2026년 11월 충당금까지');
    expect(calculateEmergencyReserveCoverage(1_500_000, nov24).label).toBe('2027년 1월 충당금까지');
    expect(calculateEmergencyReserveCoverage(1_999_999, nov27).label).toBe('2027년 1월 충당금까지');
  });

  it('starts counting from next month on and after the 28th transfer cutoff', () => {
    const nov28 = new Date('2026-11-28T00:00:00.000Z');
    const nov30 = new Date('2026-11-30T12:00:00.000Z');

    expect(calculateEmergencyReserveCoverage(0, nov28)).toEqual({
      coveredUntilYearMonth: '2026-11',
      coveredMonths: 0,
      isAfterTransfer: true,
      label: '2026년 11월 충당금까지',
    });
    expect(calculateEmergencyReserveCoverage(500_000, nov28).label).toBe('2026년 12월 충당금까지');
    // After 500,000 won transfers on Nov 28, 1,500,000 -> 1,000,000 still covers through 2027-01.
    expect(calculateEmergencyReserveCoverage(1_000_000, nov28).label).toBe('2027년 1월 충당금까지');
    expect(calculateEmergencyReserveCoverage(1_500_000, nov30).label).toBe('2027년 2월 충당금까지');
  });

  it('rolls across year boundaries cleanly around December 27 and 28', () => {
    const dec27 = new Date('2026-12-27T12:00:00.000Z');
    const dec28 = new Date('2026-12-28T12:00:00.000Z');

    expect(calculateEmergencyReserveCoverage(1_000_000, dec27).label).toBe('2027년 1월 충당금까지');
    expect(calculateEmergencyReserveCoverage(500_000, dec28).label).toBe('2027년 1월 충당금까지');
  });

  it('persists balance in localStorage and falls back safely when storage fails', () => {
    expect(loadMonthlyEmergencyReserveBalance()).toBeNull();
    expect(saveMonthlyEmergencyReserveBalance(1_500_000)).toBe(true);
    expect(loadMonthlyEmergencyReserveBalance()).toBe(1_500_000);

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(saveMonthlyEmergencyReserveBalance(2_000_000)).toBe(false);

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(loadMonthlyEmergencyReserveBalance()).toBeNull();
  });
});
