import { MONTHLY_EMERGENCY_AMOUNT } from './calc';
import { dateInKorea, formatYearMonth, shiftYearMonth } from './billing';

export const MONTHLY_EMERGENCY_RESERVE_BALANCE_KEY = 'budgetPlanner.monthlyEmergencyReserveBalance';
export const MONTHLY_EMERGENCY_TRANSFER_CUTOFF_DAY = 28;

export function loadMonthlyEmergencyReserveBalance(): number | null {
  try {
    const raw = localStorage.getItem(MONTHLY_EMERGENCY_RESERVE_BALANCE_KEY);
    if (raw === null || raw.trim() === '') return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
  } catch {
    return null;
  }
}

export function saveMonthlyEmergencyReserveBalance(amount: number): boolean {
  try {
    const normalized = Math.max(0, Math.round(Number.isFinite(amount) ? amount : 0));
    localStorage.setItem(MONTHLY_EMERGENCY_RESERVE_BALANCE_KEY, String(normalized));
    return true;
  } catch {
    return false;
  }
}

export type EmergencyReserveCoverage = {
  coveredUntilYearMonth: string | null;
  coveredMonths: number;
  isAfterTransfer: boolean;
  label: string;
};

/**
 * Calculates through which month the 500,000 won monthly emergency reserve account is funded.
 * Days 1-27 include this month's pending transfer; days 28+ assume this month's transfer already ran.
 */
export function calculateEmergencyReserveCoverage(
  balanceAmount: number,
  date: Date = new Date(),
): EmergencyReserveCoverage {
  const [year, month, day] = dateInKorea(date).split('-').map(Number);
  const currentYearMonth = `${year}-${String(month).padStart(2, '0')}`;
  const isAfterTransfer = day >= MONTHLY_EMERGENCY_TRANSFER_CUTOFF_DAY;
  const coveredMonths = Math.floor(Math.max(balanceAmount, 0) / MONTHLY_EMERGENCY_AMOUNT);

  if (!isAfterTransfer && coveredMonths === 0) {
    return {
      coveredUntilYearMonth: null,
      coveredMonths: 0,
      isAfterTransfer: false,
      label: '이번 달 충당금 부족',
    };
  }

  const offset = isAfterTransfer ? coveredMonths : coveredMonths - 1;
  const coveredUntilYearMonth = shiftYearMonth(currentYearMonth, offset);
  return {
    coveredUntilYearMonth,
    coveredMonths,
    isAfterTransfer,
    label: `${formatYearMonth(coveredUntilYearMonth)} 충당금까지`,
  };
}
