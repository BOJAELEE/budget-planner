export function formatKRW(n: number): string {
  const sign = n < 0 ? '-' : '';
  return `${sign}₩${Math.abs(Math.round(n)).toLocaleString('ko-KR')}`;
}

export function parseAmount(input: string): number {
  const cleaned = input.replace(/[^0-9-]/g, '');
  const n = parseInt(cleaned, 10);
  return Number.isNaN(n) ? 0 : n;
}
