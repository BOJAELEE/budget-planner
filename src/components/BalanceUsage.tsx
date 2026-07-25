import type { BalanceProjection } from '../lib/calc';
import { ACCOUNT_NAMES } from '../types';
import { formatKRW } from '../lib/format';

const colors = ['#8fae9a', '#7ca7ad', '#d5ae67'];

export function BalanceUsage({ projection }: { projection: BalanceProjection }) {
  const startingTotal = ACCOUNT_NAMES.reduce((sum, account) => sum + projection.startingBalances[account], 0);
  const remainingTotal = ACCOUNT_NAMES.reduce((sum, account) => sum + projection.balancesAfter[account], 0);
  const percentage = startingTotal === 0 ? 0 : Math.round((remainingTotal / startingTotal) * 100);

  return (
    <div className="space-y-2.5" aria-label="통장 사용">
      <div className="flex items-baseline justify-between gap-2 text-base">
        <span className="budget-label min-w-0 font-semibold">통장 사용</span>
        <span className={projection.uncoveredAmount > 0 ? 'font-semibold text-neg' : 'budget-balance font-semibold'}>잔액 {formatKRW(remainingTotal)} · {percentage}%</span>
      </div>
      <div className="budget-track flex h-3 overflow-hidden rounded-full">
        {startingTotal > 0 && ACCOUNT_NAMES.map((account, index) => (
          <div
            key={account}
            className="h-full"
            style={{ width: `${(projection.balancesAfter[account] / startingTotal) * 100}%`, background: colors[index] }}
            title={`${account} 잔액 ${formatKRW(projection.balancesAfter[account])}`}
          />
        ))}
      </div>
      <div className="budget-detail text-sm">{formatKRW(remainingTotal)} / {formatKRW(startingTotal)}</div>
      <div className="space-y-1 text-sm text-gray-500">
        {ACCOUNT_NAMES.map((account) => {
          const used = projection.startingBalances[account] - projection.balancesAfter[account];
          return <div key={account} className="flex justify-between gap-3"><span>{account}</span><span>시작 {formatKRW(projection.startingBalances[account])} · 사용 {formatKRW(used)} · 잔액 {formatKRW(projection.balancesAfter[account])}</span></div>;
        })}
      </div>
      {projection.uncoveredAmount > 0 && <p className="text-sm font-semibold text-neg">미충당 금액 {formatKRW(projection.uncoveredAmount)}</p>}
    </div>
  );
}
