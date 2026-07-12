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

export interface FixedCost {
  id: string;
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
  name: string;
  amount: number;
  active: boolean;
}

export interface MonthlyCardActual {
  id: string;
  yearMonth: string; // "2026-07"
  paymentMethod: CardMethod;
  actualAmount: number;
}

export function isCardMethod(m: PaymentMethod): m is CardMethod {
  return (CARD_METHODS as readonly string[]).includes(m);
}
