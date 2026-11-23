import { MONTHLY_EMERGENCY_AMOUNT, MONTHLY_FLEXIBLE_BASE, displayPercentage } from '../lib/calc';
import { dashboardGraphAmounts } from '../lib/dashboardGraph';
import { formatKRW } from '../lib/format';

export function BalanceUsage({ graph }: {
  graph: ReturnType<typeof dashboardGraphAmounts>;
}) {
  const sources = [
    { key: 'base', label: '월급 여유 자금', capacity: MONTHLY_FLEXIBLE_BASE, used: graph.flexibleBaseUsed },
    { key: 'emergency', label: '월간 비상금', capacity: MONTHLY_EMERGENCY_AMOUNT, used: graph.emergencyUsed },
  ] as const;
  const capacityTotal = MONTHLY_FLEXIBLE_BASE + MONTHLY_EMERGENCY_AMOUNT;
  const usedTotal = sources.reduce((sum, source) => sum + source.used, 0);
  const percentage = Math.round(displayPercentage(usedTotal, capacityTotal));

  return (
    <div className="space-y-2.5" aria-label="예비 자금">
      <div className="flex items-baseline justify-between gap-2 text-base">
        <span className="budget-label min-w-0 font-semibold">예비 자금</span>
        <span className="budget-balance font-semibold">{percentage}%</span>
      </div>
      <div className="budget-track funding-track flex h-3 overflow-hidden rounded-full" role="progressbar" aria-label="예비 자금 사용" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}
        aria-valuetext={`${formatKRW(usedTotal)} / ${formatKRW(capacityTotal)}`}>
        {sources.filter((source) => source.capacity > 0).map((source) => (
          <div key={source.key} className={`funding-segment funding-segment--${source.key} h-full min-w-0`} style={{ flexGrow: source.capacity, flexBasis: 0 }}
            title={`${source.label}: 사용 ${formatKRW(source.used)} / ${formatKRW(source.capacity)}`}>
            <div className="funding-fill h-full" style={{ width: `${displayPercentage(source.used, source.capacity)}%` }} />
          </div>
        ))}
      </div>
      <div className="budget-detail text-sm">사용 {formatKRW(usedTotal)} / 가용 {formatKRW(capacityTotal)}</div>
      <div className="funding-source-list space-y-1 text-sm" aria-label="자금 구간별 사용">
        {sources.map((source) => (
          <div key={source.key} className="flex items-baseline justify-between gap-2">
            <span className="whitespace-nowrap"><i className={`budget-legend-dot funding-fill--${source.key}`} />{source.label}</span>
            <span className="text-right tabular-nums">{formatKRW(source.used)} / {formatKRW(source.capacity)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
