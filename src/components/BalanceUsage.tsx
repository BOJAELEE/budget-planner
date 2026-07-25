import type { BalanceProjection, } from '../lib/calc';
import { ACCOUNT_NAMES } from '../types';
import { formatKRW } from '../lib/format';

const colors = ['#8fae9a', '#7ca7ad', '#d5ae67'];

export function BalanceUsage({
  projection, confirmed, hasPreviousSettlement, onConfirm, busy,
}: {
  projection: BalanceProjection;
  confirmed: boolean;
  hasPreviousSettlement: boolean;
  onConfirm: () => void;
  busy: boolean;
}) {
  const total = ACCOUNT_NAMES.reduce((sum, account) => sum + projection.startingBalances[account], 0);
  return (
    <section className="rounded-2xl bg-white p-4 shadow-card space-y-3" aria-label="잔고 사용">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold">잔고 사용</h2>
          <p className="text-sm text-gray-500">사용 예정 {formatKRW(ACCOUNT_NAMES.reduce((sum, account) => sum + projection.allocations.filter((item) => item.accountName === account).reduce((inner, item) => inner + item.amount, 0), 0) + projection.uncoveredAmount)}</p>
        </div>
        <span className={confirmed ? 'rounded-full bg-brand-soft px-2 py-1 text-xs font-semibold' : 'rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700'}>
          {confirmed ? '확정' : '미확정'}
        </span>
      </div>

      {total > 0 ? (
        <div className="flex h-7 overflow-hidden rounded-full bg-gray-100" aria-label="통장별 잔고 사용 누적 그래프">
          {ACCOUNT_NAMES.map((account, index) => {
            const start = projection.startingBalances[account];
            const remaining = projection.balancesAfter[account];
            const used = start - remaining;
            return (
              <div key={account} className="relative border-r border-white last:border-r-0" style={{ width: `${(start / total) * 100}%`, background: '#e5ebe4' }} title={`${account}: 사용 ${formatKRW(used)}, 잔액 ${formatKRW(remaining)}`}>
                <div className="h-full" style={{ width: `${start === 0 ? 0 : (used / start) * 100}%`, background: colors[index] }} />
              </div>
            );
          })}
        </div>
      ) : <div className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-500">통장 잔고를 입력하면 사용 예정 금액을 표시합니다.</div>}

      <div className="space-y-1.5 text-sm">
        {ACCOUNT_NAMES.map((account) => {
          const used = projection.startingBalances[account] - projection.balancesAfter[account];
          return <div key={account} className="flex justify-between gap-3"><span>{account}</span><span className="text-right text-gray-600">사용 {formatKRW(used)} · 잔액 {formatKRW(projection.balancesAfter[account])}</span></div>;
        })}
      </div>
      {projection.uncoveredAmount > 0 && <p className="text-sm font-semibold text-neg">미충당 금액 {formatKRW(projection.uncoveredAmount)}</p>}
      <button className="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={busy} onClick={onConfirm}>
        {busy ? '처리 중…' : hasPreviousSettlement ? '확정 내용 갱신' : '잔고 사용 확정'}
      </button>
    </section>
  );
}
