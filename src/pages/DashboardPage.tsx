import { useState } from 'react';
import { useBudget } from '../hooks/useBudget';
import { CARD_METHODS } from '../types';
import { formatKRW } from '../lib/format';
import { defaultBillingYearMonth, formatYearMonth } from '../lib/billing';
import { displayPercentage } from '../lib/calc';
import { AmountInput } from '../components/AmountInput';
import { BalanceUsage } from '../components/BalanceUsage';

export default function DashboardPage() {
  const [yearMonth, setYearMonth] = useState(defaultBillingYearMonth);
  const { loading, error, derived, availableMonths, setActual } = useBudget(yearMonth);

  if (loading) return <div className="p-8 text-center text-gray-400">불러오는 중입니다.</div>;
  if (error) return (
    <div className="p-6 m-4 rounded-2xl bg-white shadow-card text-sm">
      <div className="font-semibold text-neg mb-2">데이터를 불러오지 못했습니다.</div>
      <div className="text-gray-500 break-all">{error}</div>
    </div>
  );

  const shortage = derived.shortage;
  const budgetRemaining = derived.incomeSum - derived.totalBudget;
  const reserveLivingRemaining = derived.savings.reserveLiving - shortage;
  const savingsAfterShortage = derived.savings.totalSavings - shortage;
  const currentAccountBalance = Math.max(
    0,
    Object.values(derived.balanceProjection.balancesAfter).reduce((sum, amount) => sum + amount, 0),
  );
  const nextMonthBalance = Math.max(0, currentAccountBalance + savingsAfterShortage);

  return (
    <main className="p-4 space-y-4">
      <label className="block text-base font-medium text-gray-600">
        청구월
        <select
          className="mt-1 block w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-base text-gray-900"
          value={yearMonth}
          onChange={(event) => setYearMonth(event.target.value)}
        >
          {availableMonths.map((month) => <option key={month} value={month}>{formatYearMonth(month)}</option>)}
        </select>
      </label>
      <section className="grid grid-cols-2 gap-3" aria-label="대시보드 요약">
        <SummaryCard items={[
          { label: '총필요 예산', amount: derived.totalBudget },
          { label: '추가 지출', amount: derived.extraTotal },
        ]} />
        <SummaryCard items={[
          { label: '수입', amount: derived.incomeSum },
          { label: '부족금액', amount: shortage, amountClassName: 'text-neg' },
        ]} />
        <SummaryCard items={[
          { label: '저축 금액', amount: savingsAfterShortage, amountClassName: savingsAfterShortage < 0 ? 'text-neg' : undefined },
          { label: '금월 잔고', amount: currentAccountBalance },
        ]} />
        <SummaryCard items={[
          { label: '미충당 금액', amount: derived.balanceProjection.uncoveredAmount, amountClassName: 'text-neg' },
          { label: '익월 잔고', amount: nextMonthBalance },
        ]} />
      </section>

      <section
        className="budget-overview rounded-2xl border p-5 shadow-card space-y-5"
        aria-label="예산과 저축 현황"
      >
        <BudgetProgress
          label="예산"
          numerator={derived.totalBudget}
          denominator={derived.incomeSum}
          detail={`${formatKRW(derived.totalBudget)} / ${formatKRW(derived.incomeSum)}`}
          balance={budgetRemaining}
          colorClass="bg-sage"
        />
        <BudgetProgress
          label="예비금 사용"
          numerator={shortage}
          denominator={derived.savings.reserveLiving}
          detail={`${formatKRW(shortage)} / ${formatKRW(derived.savings.reserveLiving)}`}
          balance={reserveLivingRemaining}
          colorClass="bg-aqua"
        />
        <BudgetProgress
          label="저축 사용"
          numerator={shortage}
          denominator={derived.savings.totalSavings}
          detail={`${formatKRW(shortage)} / ${formatKRW(derived.savings.totalSavings)}`}
          balance={savingsAfterShortage}
          colorClass="bg-mist"
        />
        <BudgetProgress
          label="저축 잔액"
          numerator={savingsAfterShortage}
          denominator={derived.savings.totalSavings}
          detail={`${formatKRW(savingsAfterShortage)} / ${formatKRW(derived.savings.totalSavings)}`}
          subdetail={`여행 저금 ${formatKRW(derived.savings.travelSaving)} · 예비 생활비 ${formatKRW(derived.savings.reserveLiving)}`}
          balance={savingsAfterShortage}
          colorClass="bg-mint"
        />
        <BalanceUsage projection={derived.balanceProjection} />
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-card" aria-label="카드별 예산">
        <table aria-label="카드별 예산" className="card-budget-table w-full table-fixed border-collapse text-center text-sm">
          <colgroup>
            <col className="w-[15%]" />
            <col className="w-[24%]" />
            <col className="w-[21%]" />
            <col className="w-[20%]" />
            <col className="w-[20%]" />
          </colgroup>
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th scope="col" className="border-b border-r border-gray-200 px-1 py-3 font-semibold">카드</th>
              <th scope="col" className="border-b border-r border-gray-200 px-1 py-3 font-semibold">실제 카드값</th>
              <th scope="col" className="border-b border-r border-gray-200 px-1 py-3 font-semibold">예상 카드값</th>
              <th scope="col" className="extra-before-cell border-b border-r border-gray-200 px-1 py-3 font-semibold">고정금액</th>
              <th scope="col" className="extra-header border-b border-gray-200 px-1 py-3 font-semibold">추가지출</th>
            </tr>
          </thead>
          <tbody>
            {CARD_METHODS.map((card) => {
              const fixed = derived.cardBaselines[card];
              const extra = derived.extraByCard[card];
              const actual = derived.actualByCard[card];
              const expected = derived.expectedByCard[card];
              return (
                <tr key={card}>
                  <th scope="row" className="border-b border-r border-gray-200 px-1 py-3 font-medium">{card.replace('카드', '')}</th>
                  <td className="actual-card-cell border-b border-r border-gray-200 px-1 py-2">
                    <AmountInput
                      value={actual}
                      ariaLabel={`${card} 실제 카드값`}
                      commitUnchanged={false}
                      className="actual-card-input"
                      onCommit={(amount) => void setActual(card, amount)}
                    />
                  </td>
                  <td className="border-b border-r border-gray-200 px-1 py-3 font-semibold">{formatKRW(expected)}</td>
                  <td className="extra-before-cell border-b border-r border-gray-200 px-1 py-3">{formatKRW(fixed)}</td>
                  <td className="extra-cell border-b border-gray-200 px-1 py-3">{formatKRW(extra)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <th scope="row" className="border-r border-gray-200 px-1 py-3 font-semibold">합계</th>
              <td className="border-r border-gray-200 px-1 py-3 font-bold">{formatKRW(derived.actualCardTotal)}</td>
              <td className="border-r border-gray-200 px-1 py-3 font-bold">{formatKRW(derived.expectedCardTotal)}</td>
              <td className="extra-before-cell border-r border-gray-200 px-1 py-3 font-semibold">{formatKRW(derived.cardFixedTotal)}</td>
              <td className="extra-cell px-1 py-3 font-semibold">{formatKRW(derived.cardExtraTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </section>
    </main>
  );
}

function SummaryCard({ items }: {
  items: { label: string; amount: number; amountClassName?: string }[];
}) {
  return (
    <div className="flex flex-col justify-center gap-3 rounded-2xl bg-white p-4 shadow-card">
      {items.map((item) => (
        <div key={item.label}>
          <span className="block text-sm text-gray-500 whitespace-nowrap">{item.label}</span>
          <strong className={`mt-0.5 block text-lg tracking-tight whitespace-nowrap ${item.amountClassName ?? 'text-gray-900'}`}>{formatKRW(item.amount)}</strong>
        </div>
      ))}
    </div>
  );
}

function BudgetProgress({
  label, numerator, denominator, detail, subdetail, balance, colorClass,
}: {
  label: string;
  numerator: number;
  denominator: number;
  detail: string;
  subdetail?: string;
  balance: number;
  colorClass: string;
}) {
  const rawPercentage = denominator > 0 ? (numerator / denominator) * 100 : 0;
  const percentage = displayPercentage(numerator, denominator);
  const isAlert = rawPercentage > 100 || numerator < 0;
  const width = percentage;

  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-2 text-base">
        <span className="budget-label min-w-0 font-semibold">{label}</span>
        <span className="flex shrink-0 items-baseline gap-3 text-right">
          <span className={balance < 0 ? 'font-semibold text-neg' : 'budget-balance font-semibold'}>잔액 {formatKRW(balance)}</span>
          <span className={isAlert ? 'font-semibold text-neg' : 'budget-percentage'}>{Math.round(percentage)}%</span>
        </span>
      </div>
      <div className="budget-track h-3 overflow-hidden rounded-full">
        <div className={`h-full rounded-full ${isAlert ? 'bg-neg' : colorClass}`} style={{ width: `${width}%` }} />
      </div>
      <div className={isAlert ? 'text-sm text-neg' : 'budget-detail text-sm'}>{detail}</div>
      {subdetail && <div className="budget-detail text-sm">{subdetail}</div>}
    </div>
  );
}
