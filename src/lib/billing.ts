import type { CardMethod } from '../types';

const BILLING_CUTOFF_DAY: Record<CardMethod, number> = {
  현대카드: 19,
  신한카드: 16,
  삼성카드: 19,
};

export function billingCutoffDay(card: CardMethod): number {
  return BILLING_CUTOFF_DAY[card];
}

export function billingMonthFor(card: CardMethod, spentOn: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(spentOn);
  if (!match) throw new Error('사용일은 YYYY-MM-DD 형식이어야 합니다.');

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error('유효하지 않은 사용일입니다.');
  }

  const offset = day <= billingCutoffDay(card) ? 1 : 2;
  const billingDate = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${billingDate.getUTCFullYear()}-${String(billingDate.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function dateInKorea(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

/** The billing month selected when opening the dashboard or extra-spending page. */
export function defaultBillingYearMonth(date: Date = new Date()): string {
  const [year, month, day] = dateInKorea(date).split('-').map(Number);
  const billingDate = new Date(Date.UTC(year, month - 1 + (day >= 2 ? 1 : 0), 1));
  return `${billingDate.getUTCFullYear()}-${String(billingDate.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function spentOnFromCreatedAt(createdAt: string | undefined): string {
  const date = createdAt ? new Date(createdAt) : new Date();
  return Number.isNaN(date.getTime()) ? dateInKorea() : dateInKorea(date);
}

export function formatYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  return `${year}년 ${Number(month)}월`;
}
