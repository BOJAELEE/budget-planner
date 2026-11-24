import { useState } from 'react';
import { AmountInput } from '../components/AmountInput';
import { BackupButton } from '../components/BackupButton';
import { MonthBar } from '../components/MonthBar';
import { useBudget } from '../hooks/useBudget';
import { useHorizontalSwipe } from '../hooks/useHorizontalSwipe';
import { ACCOUNT_NAMES } from '../types';
import { dateInKorea, formatYearMonth, nextYearMonth, previousYearMonth } from '../lib/billing';
import { formatKRW } from '../lib/format';

export default function BalancePage() {
  const [balanceYearMonth, setBalanceYearMonth] = useState(() => dateInKorea().slice(0, 7));
  const billingYearMonth = nextYearMonth(balanceYearMonth);
  const { loading, error, derived, availableMonths, setMonthlyAccountBalance } = useBudget(billingYearMonth);
  const availableBalanceMonths = [...new Set([
    balanceYearMonth,
    previousYearMonth(balanceYearMonth),
    nextYearMonth(balanceYearMonth),
    ...availableMonths.map((month) => previousYearMonth(month)),
  ])].sort((a, b) => b.localeCompare(a));

  const { handlers: swipeHandlers, swipe } = useHorizontalSwipe({
    onSwipeLeft: () => setBalanceYearMonth((current) => nextYearMonth(current)),
    onSwipeRight: () => setBalanceYearMonth((current) => previousYearMonth(current)),
  });

  if (loading) return <main className="p-4 text-center text-gray-400">불러오는 중입니다.</main>;

  const totalBalance = ACCOUNT_NAMES.reduce(
    (sum, account) => sum + derived.balanceProjection.startingBalances[account],
    0,
  );

  return (
    <main
      className="dashboard-swipe-area p-4 space-y-4"
      style={swipe.offsetX !== 0 ? { transform: `translateX(${swipe.offsetX}px)` } : undefined}
      {...swipeHandlers}
    >
      {swipe.direction !== null && (
        <div
          role="status"
          aria-live="polite"
          className={`dashboard-swipe-pill ${swipe.ready ? 'dashboard-swipe-pill--ready' : ''}`}
        >
          {swipe.direction === 'prev'
            ? `← ${formatYearMonth(previousYearMonth(balanceYearMonth))}`
            : `${formatYearMonth(nextYearMonth(balanceYearMonth))} →`}
        </div>
      )}

      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-[#111827]">잔고</h1>
          <span className="text-xs font-medium text-[#6b7280]">직접 입력한 달은 그대로 유지</span>
        </div>
        <MonthBar
          value={balanceYearMonth}
          options={availableBalanceMonths}
          onChange={setBalanceYearMonth}
          selectAriaLabel="잔고 월"
          rightSlot={<BackupButton />}
        />
      </div>

      {error && <p className="rounded-xl bg-white p-3 text-sm text-neg">{error}</p>}

      <section className="rounded-2xl border border-[#e4e4e7] bg-brand-soft px-4 py-3.5 flex items-center justify-between gap-2" aria-label="총 보유 잔고">
        <div>
          <span className="block text-xs font-semibold text-[#6b7280]">{formatYearMonth(balanceYearMonth)} 총 보유 잔고</span>
          <b className="mt-0.5 block text-xl font-extrabold tabular-nums text-[#111827]">{formatKRW(totalBalance)}</b>
        </div>
        <span className="rounded-full border border-[#e4e4e7] bg-white px-2.5 py-1 text-xs font-bold text-[#111827]">
          {ACCOUNT_NAMES.length}개 계좌
        </span>
      </section>

      <section className="rounded-2xl border border-[#e4e4e7] bg-white p-4 shadow-card space-y-3" aria-label="월 시작 잔액 입력">
        <h2 className="text-sm font-bold text-[#4b5563]">{formatYearMonth(balanceYearMonth)} 계좌별 잔고</h2>
        <div className="divide-y divide-[#e4e4e7]">
          {ACCOUNT_NAMES.map((account) => (
            <div key={account} className="flex min-h-[56px] items-center justify-between gap-4 py-2 first:pt-0 last:pb-0">
              <label className="font-semibold text-sm text-[#111827]">{account}</label>
              <AmountInput
                value={derived.balanceProjection.startingBalances[account]}
                ariaLabel={`${account} 시작 잔액`}
                onCommit={(amount) => void setMonthlyAccountBalance(account, amount)}
                className="w-40 text-right font-bold tabular-nums"
              />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
