import { useState } from 'react';
import { AmountInput } from '../components/AmountInput';
import { useBudget } from '../hooks/useBudget';
import { ACCOUNT_NAMES } from '../types';
import { defaultBillingYearMonth, formatYearMonth } from '../lib/billing';
import { formatKRW } from '../lib/format';

export default function BalancePage() {
  const [yearMonth, setYearMonth] = useState(defaultBillingYearMonth);
  const { loading, error, derived, availableMonths, setMonthlyAccountBalance } = useBudget(yearMonth);

  if (loading) return <main className="p-4 text-center text-gray-400">불러오는 중입니다.</main>;

  return (
    <main className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold">잔고</h1>
        <p className="mt-1 text-sm text-gray-500">월 시작 잔액을 직접 입력하세요. 직접 입력한 달은 보호되고, 다음 달부터 예상 사용액이 자동 이월됩니다.</p>
      </div>
      {error && <p className="rounded-xl bg-white p-3 text-sm text-neg">{error}</p>}
      <label className="block text-base font-medium text-gray-600">
        기준 월
        <select className="mt-1 block w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-base" value={yearMonth} onChange={(event) => setYearMonth(event.target.value)}>
          {availableMonths.map((month) => <option key={month} value={month}>{formatYearMonth(month)}</option>)}
        </select>
      </label>
      <section className="rounded-2xl bg-white p-4 shadow-card space-y-3" aria-label="월 시작 잔액 입력">
        <h2 className="font-bold">{formatYearMonth(yearMonth)} 시작 잔액</h2>
        {ACCOUNT_NAMES.map((account) => (
          <div key={account} className="flex items-center justify-between gap-4">
            <label className="font-medium">{account}</label>
            <AmountInput
              value={derived.balanceProjection.startingBalances[account]}
              ariaLabel={`${account} 시작 잔액`}
              onCommit={(amount) => void setMonthlyAccountBalance(account, amount)}
              className="w-40 text-right"
            />
          </div>
        ))}
      </section>
      <section className="rounded-2xl bg-white p-4 shadow-card space-y-2" aria-label="예상 사용 후 잔액">
        <h2 className="font-bold">예상 사용 후 잔액</h2>
        {ACCOUNT_NAMES.map((account) => <div key={account} className="flex justify-between text-sm"><span>{account}</span><span>{formatKRW(derived.balanceProjection.balancesAfter[account])}</span></div>)}
        {derived.balanceProjection.uncoveredAmount > 0 && <p className="text-sm font-semibold text-neg">미충당 금액 {formatKRW(derived.balanceProjection.uncoveredAmount)}</p>}
      </section>
    </main>
  );
}
