import { useState } from 'react';
import { formatKRW, parseAmount } from '../lib/format';
import {
  calculateEmergencyReserveCoverage,
  loadMonthlyEmergencyReserveBalance,
  saveMonthlyEmergencyReserveBalance,
} from '../lib/monthlyEmergencyReserve';
import { isSwimmingPaymentMonth } from '../lib/swimmingSchedule';

export function DashboardQuickStrip({ yearMonth }: { yearMonth: string }) {
  const [balance, setBalance] = useState<number | null>(loadMonthlyEmergencyReserveBalance);
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [saveFailed, setSaveFailed] = useState(false);

  const isDue = isSwimmingPaymentMonth(yearMonth);
  const year = yearMonth.slice(0, 4);
  const coverage = balance !== null ? calculateEmergencyReserveCoverage(balance) : null;

  const toggleEditing = () => {
    if (editing) {
      setEditing(false);
      return;
    }
    setDraftText(balance !== null && balance > 0 ? balance.toLocaleString('ko-KR') : '');
    setEditing(true);
  };

  const handleSave = () => {
    const nextAmount = parseAmount(draftText);
    setBalance(nextAmount);
    setSaveFailed(!saveMonthlyEmergencyReserveBalance(nextAmount));
    setEditing(false);
  };

  return (
    <section
      className="rounded-2xl border border-[#e4e4e7] bg-white px-3 py-2.5 shadow-card space-y-2.5"
      aria-label="수영회비 및 월간 비상금 요약"
    >
      <div role="region" aria-label={`${year}년 수영회비 납부 일정`} className="flex items-center gap-2">
        <span
          className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-bold whitespace-nowrap ${
            isDue
              ? 'border border-[#fcd34d] bg-[#fef3c7] text-[#92400e]'
              : 'border border-[#e4e4e7] bg-[#f4f4f5] text-[#6b7280]'
          }`}
        >
          {isDue ? '수영 납부월' : '수영 미납부'}
        </span>
        <ol className="swimming-schedule-months flex-1 min-w-0" aria-label="12개월 납부 일정">
          {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => {
            const due = isSwimmingPaymentMonth(`${year}-${String(month).padStart(2, '0')}`);
            return (
              <li
                key={month}
                className={due ? 'swimming-month swimming-month--due' : 'swimming-month'}
                aria-label={`${year}년 ${month}월 ${due ? '수영회비 해당 월말에 납부' : '납부 일정 없음'}`}
              >
                <span aria-hidden="true">{month}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <div role="region" aria-label="월간 비상금 충당 현황" className="border-t border-[#e4e4e7] pt-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 rounded-md border border-[#e4e4e7] bg-[#f4f4f5] px-2 py-0.5 text-[11px] font-bold text-[#374151]">
              월간 비상금
            </span>
            {coverage === null ? (
              <span className="truncate text-sm font-medium text-[#6b7280]">잔액을 입력하세요</span>
            ) : (
              <strong
                className={`truncate text-sm font-bold ${
                  coverage.coveredUntilYearMonth === null ? 'text-neg' : 'text-[#111827]'
                }`}
              >
                {coverage.label}
              </strong>
            )}
          </div>
          <button
            type="button"
            aria-label="월간 비상금 잔액 입력"
            aria-expanded={editing}
            onClick={toggleEditing}
            className="min-h-[34px] shrink-0 rounded-lg border border-[#d4d4d8] bg-white px-2.5 text-xs font-bold text-[#111827] hover:bg-[#f4f4f5]"
          >
            {editing ? '닫기' : balance === null ? '잔액 입력' : '잔액 수정'}
          </button>
        </div>

        {editing && (
          <form
            className="space-y-2 rounded-xl border border-[#e4e4e7] bg-[#fafafa] p-2.5"
            onSubmit={(event) => {
              event.preventDefault();
              handleSave();
            }}
          >
            <div className="flex items-center gap-2">
              <input
                inputMode="numeric"
                aria-label="월간 비상금 통장 잔액"
                placeholder={formatKRW(0)}
                value={draftText}
                autoFocus
                onChange={(event) => setDraftText(event.target.value)}
                className="min-h-[38px] min-w-0 flex-1 rounded-xl border border-[#d4d4d8] bg-white px-3 py-1.5 text-right text-sm font-bold tabular-nums text-[#111827]"
              />
              <button
                type="submit"
                className="min-h-[38px] shrink-0 rounded-xl bg-brand px-3.5 py-1.5 text-xs font-bold text-white"
              >
                저장
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="min-h-[38px] shrink-0 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-gray-600"
              >
                취소
              </button>
            </div>
            <p className="text-[11px] text-[#6b7280]">50만 원/월 · 매월 28일 이체 반영</p>
          </form>
        )}

        {saveFailed && <p role="status" className="text-xs text-gray-600">브라우저에 저장하지 못했습니다.</p>}
      </div>
    </section>
  );
}
