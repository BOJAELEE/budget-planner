import { MONTHLY_EMERGENCY_AMOUNT, type DashboardScenario } from '../lib/calc';
import { ACCOUNT_NAMES } from '../types';
import { formatKRW } from '../lib/format';

export function BalanceUsage({ scenario }: { scenario: DashboardScenario }) {
  const projection = scenario.balanceProjection;
  const startingTotal = ACCOUNT_NAMES.reduce((sum, account) => sum + projection.startingBalances[account], 0);
  const remainingTotal = ACCOUNT_NAMES.reduce((sum, account) => sum + projection.balancesAfter[account], 0);
  const percentage = Math.round((scenario.emergencyRemaining / MONTHLY_EMERGENCY_AMOUNT) * 100);
  const coveredByAccounts = startingTotal - remainingTotal;

  return (
    <div className="space-y-2.5" aria-label="비상금">
      <div className="flex items-baseline justify-between gap-2 text-base">
        <span className="budget-label min-w-0 font-semibold">비상금</span>
        <span className="budget-balance font-semibold">잔액 {formatKRW(scenario.emergencyRemaining)} · {percentage}%</span>
      </div>
      <div className="budget-track h-3 overflow-hidden rounded-full" role="progressbar" aria-label="비상금 잔액" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
        <div className="h-full rounded-full bg-sage" style={{ width: `${percentage}%` }} />
      </div>
      <div className="budget-detail text-sm">사용 {formatKRW(scenario.emergencyUsed)} / 월 {formatKRW(MONTHLY_EMERGENCY_AMOUNT)}</div>
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
