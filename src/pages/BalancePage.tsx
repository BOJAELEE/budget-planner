import { useCallback, useEffect, useState } from 'react';
import { AmountInput } from '../components/AmountInput';
import { useRepository } from '../data/RepositoryContext';
import type { AccountBalance, BalanceSettlement } from '../types';
import { formatKRW } from '../lib/format';

export default function BalancePage() {
  const repo = useRepository();
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [settlements, setSettlements] = useState<BalanceSettlement[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [nextBalances, nextSettlements] = await Promise.all([repo.listAccountBalances(), repo.listAllBalanceSettlements()]);
      setBalances(nextBalances); setSettlements(nextSettlements); setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [repo]);

  useEffect(() => { void reload(); }, [reload]);

  const update = async (balance: AccountBalance, amount: number) => {
    try {
      await repo.updateAccountBalance(balance.accountName, amount);
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <main className="p-4 space-y-4">
      <div><h1 className="text-xl font-bold">잔고</h1><p className="mt-1 text-sm text-gray-500">통장 잔액을 직접 입력하세요. 확정된 부족금액은 이 잔액에서 차감되어 다음 달로 이월됩니다.</p></div>
      {error && <p className="rounded-xl bg-white p-3 text-sm text-neg">{error}</p>}
      <section className="rounded-2xl bg-white p-4 shadow-card space-y-3" aria-label="통장 잔고 입력">
        {balances.map((balance) => (
          <div key={balance.accountName} className="flex items-center justify-between gap-4">
            <label className="font-medium" htmlFor={`balance-${balance.accountName}`}>{balance.accountName}</label>
            <AmountInput value={balance.amount} ariaLabel={`${balance.accountName} 잔액`} onCommit={(amount) => void update(balance, amount)} className="w-40 text-right" />
          </div>
        ))}
      </section>
      <section className="space-y-2" aria-label="잔고 사용 확정 이력">
        <h2 className="font-bold">확정 이력</h2>
        {settlements.length === 0 ? <p className="rounded-2xl bg-white p-4 text-sm text-gray-500 shadow-card">아직 확정된 잔고 사용 이력이 없습니다.</p> : settlements.map((settlement) => (
          <div key={settlement.id} className="rounded-2xl bg-white p-4 text-sm shadow-card">
            <div className="flex justify-between gap-3"><strong>{settlement.yearMonth}</strong><span>부족금액 {formatKRW(settlement.shortageAmount)}</span></div>
            <p className="mt-2 text-gray-500">{settlement.allocations.length === 0 ? '통장 잔고 차감 없음' : settlement.allocations.map((allocation) => `${allocation.accountName} ${formatKRW(allocation.amount)}`).join(' · ')}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
