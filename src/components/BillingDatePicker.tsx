import { useState } from 'react';
import type { CardMethod } from '../types';
import { billingCutoffDay } from '../lib/billing';

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];

type CalendarMonth = { year: number; month: number };

const toDateParts = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
};

const toIsoDate = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const shiftMonth = ({ year, month }: CalendarMonth, delta: number): CalendarMonth => {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
};

export function BillingDatePicker({
  card, value, onChange, ariaLabel = '사용일',
}: {
  card: CardMethod;
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}) {
  const selected = toDateParts(value);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<CalendarMonth>({ year: selected.year, month: selected.month });
  const cutoffDay = billingCutoffDay(card);
  const firstWeekday = new Date(Date.UTC(visibleMonth.year, visibleMonth.month - 1, 1)).getUTCDay();
  const lastDay = new Date(Date.UTC(visibleMonth.year, visibleMonth.month, 0)).getUTCDate();
  const cells = Array.from({ length: firstWeekday + lastDay }, (_, index) => index - firstWeekday + 1);

  const selectDate = (day: number) => {
    onChange(toIsoDate(visibleMonth.year, visibleMonth.month, day));
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        className="flex min-h-[44px] w-full items-center justify-between rounded-xl border border-[#e4e4e7] bg-white px-3 py-2 text-left text-sm font-semibold text-[#111827]"
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <span>{value}</span>
        <span aria-hidden="true" className="text-base leading-none text-[#6b7280]">▣</span>
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-[#e4e4e7] bg-white p-3 shadow-card" role="dialog" aria-label="사용일 달력">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" className="rounded-lg px-2.5 py-1 text-lg text-[#4b5563] hover:bg-[#f4f4f5]" aria-label="이전 달" onClick={() => setVisibleMonth((month) => shiftMonth(month, -1))}>‹</button>
            <strong className="text-[#111827]">{visibleMonth.year}년 {visibleMonth.month}월</strong>
            <button type="button" className="rounded-lg px-2.5 py-1 text-lg text-[#4b5563] hover:bg-[#f4f4f5]" aria-label="다음 달" onClick={() => setVisibleMonth((month) => shiftMonth(month, 1))}>›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-[#6b7280]">
            {weekdayLabels.map((label) => <span key={label} className="py-1">{label}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-sm">
            {cells.map((day, index) => day < 1 ? <span key={`blank-${index}`} /> : (
              <button
                key={day}
                type="button"
                onClick={() => selectDate(day)}
                className={`aspect-square rounded-lg font-medium transition ${
                  day === cutoffDay ? 'border-2 border-[#d97706] bg-[#fef3c7] text-[#92400e] font-bold' : 'text-[#111827] hover:bg-[#f4f4f5]'
                } ${
                  selected.year === visibleMonth.year && selected.month === visibleMonth.month && selected.day === day
                    ? 'bg-brand text-white hover:bg-brand' : ''
                }`}
              >
                {day}
              </button>
            ))}
          </div>
          <p className="mt-3 rounded-lg bg-[#fef3c7] px-2.5 py-1.5 text-xs font-semibold text-[#92400e]">{card} 마감일: 매월 {cutoffDay}일 포함</p>
        </div>
      )}
    </div>
  );
}
