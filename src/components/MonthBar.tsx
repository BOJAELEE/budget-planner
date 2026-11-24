import type { ReactNode } from 'react';
import { formatYearMonth, nextYearMonth, previousYearMonth } from '../lib/billing';

export function MonthBar({
  value,
  options,
  onChange,
  selectId,
  selectAriaLabel = '기준월',
  rightSlot,
}: {
  value: string;
  options: string[];
  onChange: (month: string) => void;
  selectId?: string;
  selectAriaLabel?: string;
  rightSlot?: ReactNode;
}) {
  const monthOptions = [...new Set([value, ...options])].sort((a, b) => b.localeCompare(a));

  return (
    <div className="dashboard-month-switcher">
      <button
        type="button"
        className="dashboard-month-step"
        aria-label="이전 달"
        onClick={() => onChange(previousYearMonth(value))}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
      <select
        id={selectId}
        aria-label={selectAriaLabel}
        className="min-w-0 flex-1 h-[42px] rounded-xl border border-[#d4d4d8] bg-white px-3 text-base font-bold text-[#111827]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {monthOptions.map((month) => (
          <option key={month} value={month}>
            {formatYearMonth(month)}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="dashboard-month-step"
        aria-label="다음 달"
        onClick={() => onChange(nextYearMonth(value))}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
      {rightSlot}
    </div>
  );
}
