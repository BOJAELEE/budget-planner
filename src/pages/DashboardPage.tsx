import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBudget } from '../hooks/useBudget';
import { CARD_METHODS } from '../types';
import { formatKRW } from '../lib/format';
import { defaultBillingYearMonth, formatYearMonth } from '../lib/billing';
import { displayPercentage } from '../lib/calc';

export default function DashboardPage() {
  const [yearMonth, setYearMonth] = useState(defaultBillingYearMonth);
  const { loading, error, derived, availableMonths } = useBudget(yearMonth);

  if (loading) return <div className="p-8 text-center text-gray-400">불러오는 중입니다.</div>;
  if (error) return (
    <div className="p-6 m-4 rounded-2xl bg-white shadow-card text-sm">
      <div className="font-semibold text-neg mb-2">데이터를 불러오지 못했습니다.</div>
      <div className="text-gray-500 break-all">{error}</div>
    </div>
  );

  const shortage = Math.max(derived.totalBudget - derived.incomeSum, 0);
  const budgetRemaining = derived.incomeSum - derived.totalBudget;
  const reserveLivingRemaining = derived.savings.reserveLiving - shortage;
  const savingsAfterShortage = derived.savings.totalSavings - shortage;

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
      <section className="grid grid-cols-2 gap-3" aria-label="월간 예산 요약">
        <SummaryLink label="고정금액" amount={derived.fixedTotal} to="/fixed" ariaLabel="고정금액 관리" />
        <SummaryLink label="추가지출" amount={derived.extraTotal} to="/extra" ariaLabel="추가지출 관리" />
        <SummaryLink label="현재예산" amount={derived.incomeSum} to="/income" ariaLabel="수입 관리">
        </SummaryLink>
        <SummaryCard label="총필요 예산" amount={derived.totalBudget}>
          {shortage > 0 && <span className="text-sm font-semibold text-neg">부족금액 {formatKRW(shortage)}</span>}
        </SummaryCard>
      </section>

      <section
        className="budget-overview rounded-2xl border p-5 shadow-card space-y-5"
        aria-label="예산과 저축 현황"
      >
        <BudgetProgress
          label="월간 예산"
          numerator={derived.totalBudget}
          denominator={derived.incomeSum}
          detail={`${formatKRW(derived.totalBudget)} / ${formatKRW(derived.incomeSum)}`}
          balance={budgetRemaining}
          colorClass="bg-sage"
        />
        <BudgetProgress
          label="예비 생활비 사용"
          numerator={shortage}
          denominator={derived.savings.reserveLiving}
          detail={`${formatKRW(shortage)} / ${formatKRW(derived.savings.reserveLiving)}`}
          balance={reserveLivingRemaining}
          colorClass="bg-aqua"
        />
        <BudgetProgress
          label="전체 저축 사용"
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
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-card" aria-label="카드별 예산">
        <table aria-label="카드별 예산" className="card-budget-table w-full table-fixed border-collapse text-center text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th scope="col" className="border-b border-r border-gray-200 px-1 py-3 font-semibold">카드</th>
              <th scope="col" className="border-b border-r border-gray-200 px-1 py-3 font-semibold">합계</th>
              <th scope="col" className="extra-before-cell border-b border-r border-gray-200 px-1 py-3 font-semibold">고정금액</th>
              <th scope="col" className="extra-header border-b border-gray-200 px-1 py-3 font-semibold">추가지출</th>
            </tr>
          </thead>
          <tbody>
            {CARD_METHODS.map((card) => {
              const fixed = derived.cardBaselines[card];
              const extra = derived.extraByCard[card];
              return (
                <tr key={card}>
                  <th scope="row" className="border-b border-r border-gray-200 px-1 py-3 font-medium">{card}</th>
                  <td className="border-b border-r border-gray-200 px-1 py-3 font-semibold">{formatKRW(fixed + extra)}</td>
                  <td className="extra-before-cell border-b border-r border-gray-200 px-1 py-3">{formatKRW(fixed)}</td>
                  <td className="extra-cell border-b border-gray-200 px-1 py-3">{formatKRW(extra)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <th scope="row" className="border-r border-gray-200 px-1 py-3 font-semibold">총합계</th>
              <td className="border-r border-gray-200 px-1 py-3 font-bold">{formatKRW(derived.totalBudget)}</td>
              <td className="extra-before-cell border-r border-gray-200 px-1 py-3 font-semibold">{formatKRW(derived.fixedTotal)}</td>
              <td className="extra-cell px-1 py-3 font-semibold">{formatKRW(derived.extraTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </section>
    </main>
  );
}

function SummaryLink({
  label, amount, to, ariaLabel, children,
}: {
  label: string;
  amount: number;
  to: string;
  ariaLabel: string;
  children?: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      aria-label={ariaLabel}
      className="rounded-2xl bg-white p-4 shadow-card transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
    >
      <span className="block text-base text-gray-500">{label}</span>
      <strong className="mt-1 block text-xl tracking-tight text-gray-900">{formatKRW(amount)}</strong>
      {children && <span className="mt-1 block text-sm">{children}</span>}
    </Link>
  );
}

function SummaryCard({ label, amount, children }: { label: string; amount: number; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card">
      <div className="text-base text-gray-500">{label}</div>
      <strong className="mt-1 block text-xl tracking-tight text-gray-900">{formatKRW(amount)}</strong>
      {children && <span className="mt-1 block text-sm">{children}</span>}
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
