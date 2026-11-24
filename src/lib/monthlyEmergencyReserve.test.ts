import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MONTHLY_EMERGENCY_RESERVE_BALANCE_KEY,
  calculateEmergencyReserveCoverage,
  emergencyReserveStatusForMonth,
  loadMonthlyEmergencyReserveRecord,
  saveMonthlyEmergencyReserveRecord,
} from './monthlyEmergencyReserve';

describe('calculateEmergencyReserveCoverage', () => {
  it('treats days 1-27 as before this month 500,000 transfer', () => {
    const beforeTransfer = new Date('2026-11-24T12:00:00+09:00');
    expect(calculateEmergencyReserveCoverage(1_500_000, beforeTransfer)).toEqual({
      coveredUntilYearMonth: '2027-01',
      coveredMonths: 3,
      isAfterTransfer: false,
      label: '2027년 1월 충당금까지',
    });

    expect(calculateEmergencyReserveCoverage(500_000, beforeTransfer)).toEqual({
      coveredUntilYearMonth: '2026-11',
      coveredMonths: 1,
      isAfterTransfer: false,
      label: '2026년 11월 충당금까지',
    });

    expect(calculateEmergencyReserveCoverage(400_000, beforeTransfer)).toEqual({
      coveredUntilYearMonth: null,
      coveredMonths: 0,
      isAfterTransfer: false,
      label: '충당 못하는 달',
    });
  });

  it('treats day 28+ as after this month 500,000 transfer', () => {
    const afterTransfer = new Date('2026-11-28T09:00:00+09:00');
    expect(calculateEmergencyReserveCoverage(1_500_000, afterTransfer)).toEqual({
      coveredUntilYearMonth: '2027-02',
      coveredMonths: 3,
      isAfterTransfer: true,
      label: '2027년 2월 충당금까지',
    });

    expect(calculateEmergencyReserveCoverage(0, afterTransfer)).toEqual({
      coveredUntilYearMonth: '2026-11',
      coveredMonths: 0,
      isAfterTransfer: true,
      label: '2026년 11월 충당금까지',
    });
  });
});

describe('monthly emergency reserve record persistence & month status', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('saves and loads anchored record so passing days do not shift coverage forward', () => {
    const nov24 = new Date('2026-11-24T12:00:00+09:00');
    const saved = saveMonthlyEmergencyReserveRecord(1_500_000, nov24);
    expect(saved).toEqual({
      balance: 1_500_000,
      updatedOn: '2026-11-24',
      coveredUntilYearMonth: '2027-01',
    });

    const feb01 = new Date('2027-02-01T12:00:00+09:00');
    expect(loadMonthlyEmergencyReserveRecord(feb01)).toEqual({
      balance: 1_500_000,
      updatedOn: '2026-11-24',
      coveredUntilYearMonth: '2027-01',
    });
  });

  it('migrates legacy numeric localStorage strings and returns null on invalid values', () => {
    localStorage.setItem(MONTHLY_EMERGENCY_RESERVE_BALANCE_KEY, '1000000');
    const nov24 = new Date('2026-11-24T12:00:00+09:00');
    expect(loadMonthlyEmergencyReserveRecord(nov24)).toEqual({
      balance: 1_000_000,
      updatedOn: '2026-11-24',
      coveredUntilYearMonth: '2026-12',
    });

    localStorage.setItem(MONTHLY_EMERGENCY_RESERVE_BALANCE_KEY, 'not-a-number');
    expect(loadMonthlyEmergencyReserveRecord(nov24)).toBeNull();
  });

  it('reports 충당 못하는 달 when viewed month exceeds coveredUntilYearMonth or coverage is null', () => {
    expect(emergencyReserveStatusForMonth(null, '2026-11')).toBeNull();

    expect(
      emergencyReserveStatusForMonth(
        { balance: 200_000, updatedOn: '2026-11-24', coveredUntilYearMonth: null },
        '2026-11',
      ),
    ).toEqual({
      isUncovered: true,
      label: '충당 못하는 달',
      detail: null,
    });

    const record = { balance: 1_500_000, updatedOn: '2026-11-24', coveredUntilYearMonth: '2027-01' };
    expect(emergencyReserveStatusForMonth(record, '2027-01')).toEqual({
      isUncovered: false,
      label: '2027년 1월 충당금까지',
      detail: null,
    });
    expect(emergencyReserveStatusForMonth(record, '2027-02')).toEqual({
      isUncovered: true,
      label: '충당 못하는 달',
      detail: '2027년 1월까지',
    });
  });
});
