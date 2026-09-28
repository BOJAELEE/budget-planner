import { useState } from 'react';
import { useBudget } from '../hooks/useBudget';
import { CARD_METHODS } from '../types';
import { formatKRW } from '../lib/format';
import { defaultBillingYearMonth, formatYearMonth } from '../lib/billing';
import { displayPercentage, type DashboardScenario } from '../lib/calc';
import { AmountInput } from '../components/AmountInput';
import { BalanceUsage } from '../components/BalanceUsage';

type ScenarioView = 'expected' | 'actual';

export default function DashboardPage() {
  const [yearMonth, setYearMonth] = useState(defaultBillingYearMonth);
  const [scenarioView, setScenarioView] = useState<ScenarioView>('expected');
  const { loading, error, derived, availableMonths, setActual } = useBudget(yearMonth);

  if (loading) return <div className="p-8 text-center text-gray-400">불러오는 중입니다.</div>;
  if (error) return (
    <div className="p-6 m-4 rounded-2xl bg-white shadow-card text-sm">
      <div className="font-semibold text-neg mb-2">데이터를 불러오지 못했습니다.</div>
      <div className="text-gray-500 break-all">{error}</div>
    </div>
  );

  const enteredCardCount = CARD_METHODS.filter((card) => derived.enteredActualByCard[card] !== undefined).length;

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
      <ScenarioPanel
        title={scenarioView === 'expected' ? '예상 카드값 기준' : '실제 카드값 기준'}
        description={scenarioView === 'expected'
          ? '카드별 예상 금액으로 계산'
          : `실제값 ${enteredCardCount}/${CARD_METHODS.length}건 입력 · 미입력 카드는 예상값 적용`}
        variant={scenarioView}
        onVariantChange={setScenarioView}
        scenario={scenarioView === 'expected' ? derived.expectedScenario : derived.actualScenario}
        extraTotal={derived.extraTotal}
        incomeSum={derived.incomeSum}
      />

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

function ScenarioPanel({
  title, description, variant, onVariantChange, scenario, extraTotal, incomeSum,
}: {
  title: string;
  description: string;
  variant: ScenarioView;
  onVariantChange: (variant: ScenarioView) => void;
  scenario: DashboardScenario;
  extraTotal: number;
  incomeSum: number;
}) {
  return (
    <section className={`scenario-panel scenario-panel--${variant} space-y-3 rounded-2xl border p-3`} aria-label={`${title} 대시보드`}>
      <div className="flex items-start justify-between gap-2 px-1">
        <div className="min-w-0">
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <div className="flex shrink-0 rounded-xl border border-gray-200 bg-gray-100 p-0.5" role="group" aria-label="대시보드 기준">
          {(['expected', 'actual'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={variant === option}
              onClick={() => onVariantChange(option)}
              className={`min-h-9 rounded-lg px-2.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage ${variant === option ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
            >
              {option === 'expected' ? '예상' : '실제'}
            </button>
          ))}
        </div>
      </div>
      <section className="grid grid-cols-2 gap-2.5" aria-label={`${title} 요약`}>
        <SummaryCard items={[
          { label: '총필요 예산', amount: scenario.totalBudget },
          { label: '추가 지출', amount: extraTotal },
        ]} />
        <SummaryCard items={[
          { label: '수입', amount: incomeSum },
          { label: '부족금액', amount: scenario.shortage, amountClassName: scenario.shortage > 0 ? 'text-neg' : undefined },
        ]} />
        <SummaryCard items={[
          { label: '저축 금액', amount: scenario.flexibleRemaining, amountClassName: scenario.flexibleRemaining < 0 ? 'text-neg' : undefined },
          { label: '금월 잔고', amount: scenario.currentAccountBalance },
        ]} />
        <SummaryCard items={[
          { label: '미충당 금액', amount: scenario.balanceProjection.uncoveredAmount, amountClassName: scenario.balanceProjection.uncoveredAmount > 0 ? 'text-neg' : undefined },
          { label: '익월 잔고', amount: scenario.nextMonthBalance },
        ]} />
      </section>
      <section className="budget-overview rounded-2xl border p-4 shadow-card space-y-5" aria-label={`${title} 현황`}>
        <BudgetProgress
          label="예산"
          numerator={scenario.totalBudget}
          denominator={incomeSum}
          detail={`${formatKRW(scenario.totalBudget)} / ${formatKRW(incomeSum)}`}
          balance={scenario.remaining}
          colorClass="bg-sage"
        />
        <BudgetProgress
          label="여유 자금"
          numerator={scenario.flexibleUsed}
          denominator={scenario.flexibleAvailable}
          detail={`${formatKRW(scenario.flexibleUsed)} / ${formatKRW(scenario.flexibleAvailable)}`}
          balance={scenario.flexibleRemaining}
          colorClass="bg-aqua"
        />
        <BalanceUsage scenario={scenario} />
      </section>
    </section>
  );
}

function SummaryCard({ items }: {
  items: { label: string; amount: number; amountClassName?: string }[];
}) {
  return (
    <div className="flex min-w-0 flex-col justify-center gap-3 rounded-2xl bg-white p-3 shadow-card">
      {items.map((item) => (
        <div key={item.label}>
          <span className="block text-sm text-gray-500 whitespace-nowrap">{item.label}</span>
          <strong className={`scenario-summary-amount mt-0.5 block tracking-tight whitespace-nowrap ${item.amountClassName ?? 'text-gray-900'}`}>{formatKRW(item.amount)}</strong>
        </div>
      ))}
    </div>
  );
}

function BudgetProgress({
  label, numerator, denominator, detail, balance, colorClass,
}: {
  label: string;
  numerator: number;
  denominator: number;
  detail: string;
  balance: number;
  colorClass: string;
}) {
  const percentage = denominator <= 0 && balance < 0 ? 100 : displayPercentage(numerator, denominator);
  const isAlert = balance < 0;
  const width = percentage;

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 text-base">
        <span className="budget-label min-w-0 whitespace-nowrap font-semibold">{label}</span>
        <span className="ml-auto flex shrink-0 items-baseline gap-3 text-right">
          <span className={balance < 0 ? 'font-semibold text-neg' : 'budget-balance font-semibold'}>잔액 {formatKRW(balance)}</span>
          <span className={isAlert ? 'font-semibold text-neg' : 'budget-percentage'}>{Math.round(percentage)}%</span>
        </span>
      </div>
      <div className="budget-track h-3 overflow-hidden rounded-full"
        role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percentage)}>
        <div className={`h-full rounded-full ${isAlert ? 'bg-neg' : colorClass}`} style={{ width: `${width}%` }} />
      </div>
      <div className={isAlert ? 'text-sm text-neg' : 'budget-detail text-sm'}>{detail}</div>
    </div>
  );
}
