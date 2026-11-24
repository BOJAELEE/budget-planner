import { useEffect, useState } from 'react';
import { useRepository } from '../data/RepositoryContext';
import { isSwimmingPaymentMonth } from '../lib/swimmingSchedule';
import { SwimmingSchedule } from './SwimmingSchedule';
import { MonthlyMemoCard } from './MonthlyMemoCard';

export function DashboardQuickStrip({
  yearMonth,
  billingMonth,
  open,
  onToggle,
}: {
  yearMonth: string;
  billingMonth: string;
  open?: boolean;
  onToggle?: () => void;
}) {
  const repo = useRepository();
  const [internalOpen, setInternalOpen] = useState(false);
  const [memoText, setMemoText] = useState('');
  const isOpen = open ?? internalOpen;
  const handleToggle = onToggle ?? (() => setInternalOpen((current) => !current));

  useEffect(() => {
    let cancelled = false;
    repo.getMonthlyMemo(billingMonth).then((value) => {
      if (!cancelled) setMemoText(value);
    }).catch(() => {
      if (!cancelled) setMemoText('');
    });
    return () => { cancelled = true; };
  }, [repo, billingMonth]);

  const isDue = isSwimmingPaymentMonth(yearMonth);
  const firstLine = memoText.trim().split('\n')[0]?.trim() || '이번 달 메모 없음';

  return (
    <section className="space-y-2" aria-label="메모 및 수영 일정 요약">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-label="메모 및 수영회비 일정"
        onClick={handleToggle}
        className="flex w-full min-h-[44px] items-center justify-between gap-2 rounded-xl border border-[#e4e4e7] bg-white px-3 py-2 text-left shadow-card transition hover:bg-[#fafafa]"
      >
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <span
            className={`shrink-0 rounded-md px-2 py-0.5 font-bold ${
              isDue
                ? 'border border-[#fcd34d] bg-[#fef3c7] text-[#92400e]'
                : 'border border-[#e4e4e7] bg-[#f4f4f5] text-[#6b7280]'
            }`}
          >
            {isDue ? '수영 납부월' : '수영 미납부'}
          </span>
          <span className="truncate font-medium text-[#4b5563]">{firstLine}</span>
        </div>
        <span className="shrink-0 text-xs font-bold text-[#111827]">{isOpen ? '접기 ▲' : '열기 ▼'}</span>
      </button>
      {isOpen && (
        <div className="space-y-3 rounded-2xl border border-[#e4e4e7] bg-white p-3 shadow-card">
          <SwimmingSchedule yearMonth={yearMonth} />
          <MonthlyMemoCard
            key={billingMonth}
            yearMonth={billingMonth}
            displayYearMonth={yearMonth}
            onSaved={setMemoText}
          />
        </div>
      )}
    </section>
  );
}
