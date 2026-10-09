import type { MonthlyMemo } from '../types';

export const MAX_MONTHLY_MEMO_LENGTH = 10000;

export function validateMonthlyMemo(value: unknown): MonthlyMemo {
  if (value === null || typeof value !== 'object') throw new Error('메모 형식이 올바르지 않습니다.');
  const memo = value as { yearMonth?: unknown; content?: unknown };
  if (
    typeof memo.yearMonth !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(memo.yearMonth) ||
    typeof memo.content !== 'string' || memo.content.length > MAX_MONTHLY_MEMO_LENGTH
  ) {
    throw new Error('메모의 청구월 또는 내용이 올바르지 않습니다.');
  }
  return { yearMonth: memo.yearMonth, content: memo.content };
}
