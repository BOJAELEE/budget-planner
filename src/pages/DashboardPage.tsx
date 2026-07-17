import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBudget } from '../hooks/useBudget';
import { CARD_METHODS } from '../types';
import { formatKRW } from '../lib/format';
import { formatYearMonth } from '../lib/billing';

const nowYearMonth = () => new Date().toISOString().slice(0, 7);

export default function DashboardPage() {
  const [yearMonth, setYearMonth] = useState(nowYearMonth());
  const { loading, error, derived, availableMonths } = useBudget(yearMonth);

  if (loading) return <div className="p-8 text-center text-gray-400">불러오는 중입니다.</div>;
  if (error) return (
    <div className="p-6 m-4 rounded-2xl bg-white shadow-card text-sm">
      <div className="font-semibold text-neg mb-2">데이터를 불러오지 못했습니다.</div>
      <div className="text-gray-500 break-all">{error}</div>
    </div>
  );

  const shortage = Math.max(derived.totalBudget - derived.incomeSum, 0);
  const savingsAfterShortage = derived.savings.totalSavings - shortage;

  return (
    <main className="p-4 space-y-4">
      <label className="block text-sm font-medium text-gray-600">
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
        className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-950 via-slate-800 to-sky-950 p-4 shadow-card space-y-4"
        aria-label="예산과 저축 현황"
      >
        <BudgetProgress
          label="월간 예산"
          numerator={derived.totalBudget}
          denominator={derived.incomeSum}
          detail={`${formatKRW(derived.totalBudget)} / ${formatKRW(derived.incomeSum)}`}
          colorClass="bg-violet-400"
        />
        <BudgetProgress
          label="예비 생활비 사용"
          numerator={shortage}
          denominator={derived.savings.reserveLiving}
          detail={`${formatKRW(shortage)} / ${formatKRW(derived.savings.reserveLiving)}`}
          colorClass="bg-cyan-400"
        />
        <BudgetProgress
          label="전체 저축 사용"
          numerator={shortage}
          denominator={derived.savings.totalSavings}
          detail={`${formatKRW(shortage)} / ${formatKRW(derived.savings.totalSavings)}`}
          colorClass="bg-sky-400"
        />
        <BudgetProgress
          label="저축 잔액"
          numerator={savingsAfterShortage}
          denominator={derived.savings.totalSavings}
          detail={`${formatKRW(savingsAfterShortage)} / ${formatKRW(derived.savings.totalSavings)}`}
          subdetail={`여행 저금 ${formatKRW(derived.savings.travelSaving)} · 예비 생활비 ${formatKRW(derived.savings.reserveLiving)}`}
          colorClass="bg-emerald-300"
        />
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-card" aria-label="카드별 예산">
        <table aria-label="카드별 예산" className="w-full table-fixed border-collapse text-center text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th scope="col" className="border-b border-r border-gray-200 px-1 py-3 font-semibold">카드</th>
              <th scope="col" className="border-b border-r border-gray-200 px-1 py-3 font-semibold">합계</th>
              <th scope="col" className="border-b border-r border-gray-200 px-1 py-3 font-semibold">고정금액</th>
              <th scope="col" className="border-b border-gray-200 px-1 py-3 font-semibold">추가지출</th>
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
                  <td className="border-b border-r border-gray-200 px-1 py-3">{formatKRW(fixed)}</td>
                  <td className="border-b border-gray-200 px-1 py-3">{formatKRW(extra)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <th scope="row" className="border-r border-gray-200 px-1 py-3 font-semibold">총합계</th>
              <td className="border-r border-gray-200 px-1 py-3 font-bold">{formatKRW(derived.totalBudget)}</td>
              <td className="border-r border-gray-200 px-1 py-3 font-semibold">{formatKRW(derived.fixedTotal)}</td>
              <td className="px-1 py-3 font-semibold">{formatKRW(derived.extraTotal)}</td>
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
      <span className="block text-sm text-gray-500">{label}</span>
      <strong className="mt-1 block text-lg text-gray-900">{formatKRW(amount)}</strong>
      {children && <span className="mt-1 block">{children}</span>}
    </Link>
  );
}

function SummaryCard({ label, amount, children }: { label: string; amount: number; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card">
      <div className="text-sm text-gray-500">{label}</div>
      <strong className="mt-1 block text-lg text-gray-900">{formatKRW(amount)}</strong>
      {children && <span className="mt-1 block">{children}</span>}
    </div>
  );
}

function BudgetProgress({
  label, numerator, denominator, detail, subdetail, colorClass,
}: {
  label: string;
  numerator: number;
  denominator: number;
  detail: string;
  subdetail?: string;
  colorClass: string;
}) {
  const percentage = denominator > 0 ? (numerator / denominator) * 100 : 0;
  const isAlert = percentage > 100 || numerator < 0;
  const width = Math.min(Math.max(percentage, 0), 100);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-semibold text-white">{label}</span>
        <span className={isAlert ? 'font-semibold text-neg' : 'text-slate-200'}>{Math.round(percentage)}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-600/80">
        <div className={`h-full rounded-full ${isAlert ? 'bg-neg' : colorClass}`} style={{ width: `${width}%` }} />
      </div>
      <div className={isAlert ? 'text-xs text-neg' : 'text-xs text-slate-300'}>{detail}</div>
      {subdetail && <div className="text-xs text-slate-400">{subdetail}</div>}
    </div>
  );
}
