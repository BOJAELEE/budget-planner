import { MONTHLY_EMERGENCY_AMOUNT, MONTHLY_FLEXIBLE_BASE } from './calc';

/**
 * Income margin and the 150,000 won reserve remain in the salary (card-payment) account
 * after cash transfers, and the 500,000 won monthly emergency allowance is auto-transferred on the 26th.
 * Therefore, only the extra shortfall beyond both allowances needs to be manually transferred.
 */
export function cardPaymentPlan(shortageAmount: number) {
  const totalShortage = Math.max(shortageAmount, 0);
  const reserveUsed = Math.min(totalShortage, MONTHLY_FLEXIBLE_BASE);
  const monthlyEmergencyUsed = Math.min(totalShortage - reserveUsed, MONTHLY_EMERGENCY_AMOUNT);
  const extraEmergencyNeeded = totalShortage - reserveUsed - monthlyEmergencyUsed;
  const totalNeeded = extraEmergencyNeeded;

  return { reserveUsed, monthlyEmergencyUsed, extraEmergencyNeeded, totalNeeded };
}

export function cardPaymentSalaryImpact(
  shortageAmount: number,
  remainingAmount: number,
  salaryDelta: number,
) {
  const currentPlan = cardPaymentPlan(shortageAmount);
  const baselineShortage = Math.max(-(remainingAmount - salaryDelta), 0);
  const baselinePlan = cardPaymentPlan(baselineShortage);
  return {
    salaryDelta,
    baselineTransferAmount: baselinePlan.totalNeeded,
    transferDelta: currentPlan.totalNeeded - baselinePlan.totalNeeded,
  };
}
