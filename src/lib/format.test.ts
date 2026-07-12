import { describe, it, expect } from 'vitest';
import { formatKRW, parseAmount } from './format';

describe('format', () => {
  it('원화 천단위 콤마', () => {
    expect(formatKRW(5838945)).toBe('₩5,838,945');
    expect(formatKRW(0)).toBe('₩0');
  });
  it('음수는 마이너스 접두', () => {
    expect(formatKRW(-94868)).toBe('-₩94,868');
  });
  it('parseAmount는 콤마·기호 제거', () => {
    expect(parseAmount('₩1,174,893')).toBe(1174893);
    expect(parseAmount('1,174,893')).toBe(1174893);
    expect(parseAmount('')).toBe(0);
    expect(parseAmount('abc')).toBe(0);
  });
});
