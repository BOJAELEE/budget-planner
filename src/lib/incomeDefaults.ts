import type { IncomeTemplate } from '../types';

const CHILD_ALLOWANCE_INCREASE_MONTH = '2026-08';
const CHILD_ALLOWANCE_INCREASED_AMOUNT = 210000;

export function defaultIncomeAmount(template: IncomeTemplate, yearMonth: string): number {
  if (template.name === '아동수당' && yearMonth >= CHILD_ALLOWANCE_INCREASE_MONTH) {
    return CHILD_ALLOWANCE_INCREASED_AMOUNT;
  }
  return template.defaultAmount;
}
