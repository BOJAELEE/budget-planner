import { MONTHLY_EMERGENCY_AMOUNT } from './calc';
import { dateInKorea, formatYearMonth, shiftYearMonth } from './billing';

export const MONTHLY_EMERGENCY_RESERVE_BALANCE_KEY = 'budgetPlanner.monthlyEmergencyReserveBalance';
export const MONTHLY_EMERGENCY_TRANSFER_CUTOFF_DAY = 28;

export type EmergencyReserveCoverage = {
  coveredUntilYearMonth: string | null;
  coveredMonths: number;
  isAfterTransfer: boolean;
  label: string;
};

export type MonthlyEmergencyReserveRecord = {
  balance: number;
  updatedOn: string;
  coveredUntilYearMonth: string | null;
};

export type EmergencyReserveMonthStatus = {
  isUncovered: boolean;
  label: string;
  detail: string | null;
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
      label: '충당 못하는 달',
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

function isYearMonth(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}$/.test(value);
}

/**
 * Loads the anchored monthly emergency reserve record from localStorage,
 * migrating legacy plain-number entries transparently.
 */
export function loadMonthlyEmergencyReserveRecord(date: Date = new Date()): MonthlyEmergencyReserveRecord | null {
  try {
    const raw = localStorage.getItem(MONTHLY_EMERGENCY_RESERVE_BALANCE_KEY);
    if (raw === null || raw.trim() === '') return null;

    if (raw.trim().startsWith('{')) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (typeof parsed.balance !== 'number' || !Number.isFinite(parsed.balance) || parsed.balance < 0) {
        return null;
      }
      const balance = Math.round(parsed.balance);
      const coveredUntilYearMonth =
        parsed.coveredUntilYearMonth === null
          ? null
          : isYearMonth(parsed.coveredUntilYearMonth)
            ? parsed.coveredUntilYearMonth
            : calculateEmergencyReserveCoverage(balance, date).coveredUntilYearMonth;
      const updatedOn =
        typeof parsed.updatedOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.updatedOn)
          ? parsed.updatedOn
          : dateInKorea(date);

      return {
        balance,
        updatedOn,
        coveredUntilYearMonth,
      };
    }

    const legacyBalance = Number(raw);
    if (!Number.isFinite(legacyBalance) || legacyBalance < 0) return null;
    const normalized = Math.round(legacyBalance);
    return {
      balance: normalized,
      updatedOn: dateInKorea(date),
      coveredUntilYearMonth: calculateEmergencyReserveCoverage(normalized, date).coveredUntilYearMonth,
    };
  } catch {
    return null;
  }
}

/**
 * Persists the balance along with the anchored coveredUntilYearMonth at save time
 * so future calendar months do not push coverage forward automatically.
 */
export function saveMonthlyEmergencyReserveRecord(
  amount: number,
  date: Date = new Date(),
): MonthlyEmergencyReserveRecord | null {
  try {
    const normalized = Math.max(0, Math.round(Number.isFinite(amount) ? amount : 0));
    const updatedOn = dateInKorea(date);
    const coverage = calculateEmergencyReserveCoverage(normalized, date);
    const record: MonthlyEmergencyReserveRecord = {
      balance: normalized,
      updatedOn,
      coveredUntilYearMonth: coverage.coveredUntilYearMonth,
    };
    localStorage.setItem(MONTHLY_EMERGENCY_RESERVE_BALANCE_KEY, JSON.stringify(record));
    return record;
  } catch {
    return null;
  }
}

/**
 * Evaluates whether the viewed month is covered by the saved reserve record.
 */
export function emergencyReserveStatusForMonth(
  record: MonthlyEmergencyReserveRecord | null,
  viewedYearMonth: string,
): EmergencyReserveMonthStatus | null {
  if (!record) return null;

  if (record.coveredUntilYearMonth === null) {
    return {
      isUncovered: true,
      label: '충당 못하는 달',
      detail: null,
    };
  }

  if (viewedYearMonth > record.coveredUntilYearMonth) {
    return {
      isUncovered: true,
      label: '충당 못하는 달',
      detail: `${formatYearMonth(record.coveredUntilYearMonth)}까지`,
    };
  }

  return {
    isUncovered: false,
    label: `${formatYearMonth(record.coveredUntilYearMonth)} 충당금까지`,
    detail: null,
  };
}
