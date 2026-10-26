const SWIMMING_PAYMENT_START_MONTH = 2026 * 12 + 4;
const SWIMMING_PAYMENT_CYCLE_MONTHS = 3;
const SWIMMING_PAYMENT_MONTHS_PER_CYCLE = 2;

/** Two payment months followed by one break month, starting in May 2026. */
export function isSwimmingPaymentMonth(yearMonth: string): boolean {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(yearMonth);
  if (!match) return false;
  const elapsedMonths = Number(match[1]) * 12 + Number(match[2]) - 1 - SWIMMING_PAYMENT_START_MONTH;
  return elapsedMonths >= 0 && elapsedMonths % SWIMMING_PAYMENT_CYCLE_MONTHS < SWIMMING_PAYMENT_MONTHS_PER_CYCLE;
}
