import { describe, expect, it } from 'vitest';
import { MAX_MONTHLY_MEMO_LENGTH, validateMonthlyMemo } from './monthlyMemo';

describe('monthly memo validation', () => {
  it('preserves line breaks, whitespace and empty content', () => {
    expect(validateMonthlyMemo({ yearMonth: '2026-11', content: '  메모\n다음 줄  ' }).content).toBe('  메모\n다음 줄  ');
    expect(validateMonthlyMemo({ yearMonth: '2026-11', content: '' }).content).toBe('');
  });
  it.each([null, {}, { yearMonth: '2026-13', content: '' }, { yearMonth: '2026-1', content: '' },
    { yearMonth: '2026-11', content: 1 }, { yearMonth: '2026-11', content: '가'.repeat(MAX_MONTHLY_MEMO_LENGTH + 1) },
  ])('rejects invalid input %j', (input) => {
    expect(() => validateMonthlyMemo(input)).toThrow();
  });
});
