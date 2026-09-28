import { MONTHLY_EMERGENCY_AMOUNT, MONTHLY_FLEXIBLE_BASE, displayPercentage, type DashboardScenario } from '../lib/calc';
import { dashboardGraphAmounts } from '../lib/dashboardGraph';
import { ACCOUNT_NAMES } from '../types';
import { formatKRW } from '../lib/format';

export function BalanceUsage({ scenario, graph }: {
  scenario: DashboardScenario;
  graph: ReturnType<typeof dashboardGraphAmounts>;
}) {
  const projection = scenario.balanceProjection;
  const startingTotal = ACCOUNT_NAMES.reduce((sum, account) => sum + projection.startingBalances[account], 0);
  const remainingTotal = ACCOUNT_NAMES.reduce((sum, account) => sum + projection.balancesAfter[account], 0);
  const coveredByAccounts = startingTotal - remainingTotal;
  const sources = [
    { key: 'income', label: '여유 자금', capacity: graph.incomeMargin, used: graph.incomeMarginUsed },
    { key: 'base', label: '15만 원', capacity: MONTHLY_FLEXIBLE_BASE, used: graph.flexibleBaseUsed },
    { key: 'emergency', label: '50만 원', capacity: MONTHLY_EMERGENCY_AMOUNT, used: graph.emergencyUsed },
  ] as const;
  const usedTotal = sources.reduce((sum, source) => sum + source.used, 0);
  const percentage = Math.round(displayPercentage(usedTotal, graph.fundingCapacity));

  return (
    <div className="space-y-2.5" aria-label="자금 사용">
      <div className="flex items-baseline justify-between gap-2 text-base">
        <span className="budget-label min-w-0 font-semibold">자금 사용</span>
        <span className="budget-balance font-semibold">{percentage}%</span>
      </div>
      <div className="budget-track funding-track flex h-3 overflow-hidden rounded-full" role="progressbar" aria-label="자금 사용" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}
        aria-valuetext={`${formatKRW(usedTotal)} / ${formatKRW(graph.fundingCapacity)}`}>
        {sources.filter((source) => source.capacity > 0).map((source) => (
          <div key={source.key} className={`funding-segment funding-segment--${source.key} h-full min-w-0`} style={{ flexGrow: source.capacity, flexBasis: 0 }}
            title={`${source.label}: 사용 ${formatKRW(source.used)} / ${formatKRW(source.capacity)}`}>
            <div className="funding-fill h-full" style={{ width: `${displayPercentage(source.used, source.capacity)}%` }} />
          </div>
        ))}
      </div>
      <div className="budget-detail text-sm">사용 {formatKRW(usedTotal)} / 가용 {formatKRW(graph.fundingCapacity)}</div>
      <div className="funding-source-list space-y-1 text-sm" aria-label="자금 구간별 사용">
        {sources.map((source) => (
          <div key={source.key} className="flex items-baseline justify-between gap-2">
            <span className="whitespace-nowrap"><i className={`budget-legend-dot funding-fill--${source.key}`} />{source.label}</span>
            <span className="text-right tabular-nums">{formatKRW(source.used)} / {formatKRW(source.capacity)}</span>
          </div>
        ))}
      </div>
      {graph.incomeMargin === 0 && <p className="budget-detail text-sm">수입보다 고정비가 커서 여유 자금 구간은 0원입니다.</p>}
      <details className="text-sm text-gray-500">
        <summary className="cursor-pointer">통장 추가 충당 {formatKRW(coveredByAccounts)} · 남은 통장 잔고 {formatKRW(remainingTotal)}</summary>
        <div className="mt-2 space-y-1">
          {ACCOUNT_NAMES.map((account) => {
            const used = projection.startingBalances[account] - projection.balancesAfter[account];
            return <div key={account} className="flex justify-between gap-2"><span>{account}</span><span className="text-right">시작 {formatKRW(projection.startingBalances[account])} · 사용 {formatKRW(used)} · 잔액 {formatKRW(projection.balancesAfter[account])}</span></div>;
          })}
        </div>
      </details>
      {projection.uncoveredAmount > 0 && <p className="text-sm font-semibold text-neg">미충당 금액 {formatKRW(projection.uncoveredAmount)}</p>}
    </div>
  );
}
