export const CARD_METHODS = ['현대카드', '신한카드', '삼성카드'] as const;
export const TRANSFER_METHODS = ['현금이체', '현금이체(자동)'] as const;
export const PAYMENT_METHODS = [...CARD_METHODS, ...TRANSFER_METHODS] as const;

export type CardMethod = (typeof CARD_METHODS)[number];
export type TransferMethod = (typeof TRANSFER_METHODS)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const CATEGORIES = [
  '보험', '교육비', '통신요금', '공과금', '구독', '보험&구독',
  '계비', '용돈', '저금', '대출', '생활비', '기타',
] as const;
export type Category = (typeof CATEGORIES)[number];

export type Variability = '고정' | '변동';

export const INCOME_TYPES = ['고정수입', '변동수입', '기타수입'] as const;
export type IncomeType = (typeof INCOME_TYPES)[number];

export const ACCOUNT_NAMES = ['월급통장', '비상금통장', '여행통장'] as const;
export type AccountName = (typeof ACCOUNT_NAMES)[number];

export interface MonthlyAccountBalance {
  id: string;
  /** Balance month. This opening amount is applied to the following billing month. */
  yearMonth: string;
  accountName: AccountName;
  openingAmount: number;
  isManual: boolean;
}

export interface BalanceAllocation {
  accountName: AccountName;
  amount: number;
}

export interface FixedCost {
  id: string;
  /** Input month. This fixed cost is applied to the following billing month. */
  yearMonth: string;
  paymentMethod: PaymentMethod;
  category: Category;
  name: string;
  amount: number;
  variability: Variability;
  active: boolean;
  sortOrder: number;
}

export interface Income {
  id: string;
  yearMonth: string;
  type: IncomeType;
  name: string;
  amount: number;
  active: boolean;
  templateId?: string;
}

export interface IncomeTemplate {
  id: string;
  name: string;
  defaultAmount: number;
  active: boolean;
}

export interface MonthlyCardActual {
  id: string;
  yearMonth: string; // "2026-07"
  paymentMethod: CardMethod;
  actualAmount: number;
}

export interface ExtraSpending {
  id: string;
  yearMonth: string; // 청구월, "2026-07"
  card: CardMethod;
  name: string;
  amount: number;
  spentOn: string; // 실제 사용일, "2026-07-01"
  createdAt: string; // ISO timestamp, 자동 기록
}

export function isCardMethod(m: PaymentMethod): m is CardMethod {
  return (CARD_METHODS as readonly string[]).includes(m);
}
