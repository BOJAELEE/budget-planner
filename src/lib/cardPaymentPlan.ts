import { MONTHLY_EMERGENCY_AMOUNT, MONTHLY_FLEXIBLE_BASE } from './calc';

/** The income margin is already in the payment account, so only split its shortfall. */
export function cardPaymentPlan(shortageAmount: number) {
  const totalNeeded = Math.max(shortageAmount, 0);
  const savingsUsed = Math.min(totalNeeded, MONTHLY_FLEXIBLE_BASE);
  const monthlyEmergencyUsed = Math.min(totalNeeded - savingsUsed, MONTHLY_EMERGENCY_AMOUNT);
  const extraEmergencyNeeded = totalNeeded - savingsUsed - monthlyEmergencyUsed;

  return { savingsUsed, monthlyEmergencyUsed, extraEmergencyNeeded, totalNeeded };
}
