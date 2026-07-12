import { useEffect, useState } from 'react';
import { useRepository } from '../data/RepositoryContext';
import type { FixedCost, Income, MonthlyCardActual } from '../types';
import { transferTotal, incomeTotal } from '../lib/calc';
import { HistoryChart } from '../components/HistoryChart';
import { formatKRW } from '../lib/format';

export default function HistoryPage() {
  const repo = useRepository();
  const [rows, setRows] = useState<{ yearMonth: string; totalBudget: number; remaining: number }[]>([]);

  useEffect(() => {
    (async () => {
      const [fc, inc, acts] = await Promise.all([
        repo.listFixedCosts(), repo.listIncomes(), repo.listAllActuals(),
      ]);
      const transfer = transferTotal(fc as FixedCost[]);
      const income = incomeTotal(inc as Income[]);
      const byMonth = new Map<string, number>();
      (acts as MonthlyCardActual[]).forEach((a) => {
        byMonth.set(a.yearMonth, (byMonth.get(a.yearMonth) ?? 0) + a.actualAmount);
      });
      const result = [...byMonth.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([yearMonth, cardSum]) => {
          const totalBudget = transfer + cardSum;
          return { yearMonth, totalBudget, remaining: income - totalBudget };
        });
      setRows(result);
    })();
  }, [repo]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">월 히스토리</h1>
      {rows.length === 0 ? (
        <p className="text-gray-400 text-sm">아직 데이터가 없습니다. 이번달 카드값을 입력하면 쌓입니다.</p>
      ) : (
        <>
          <div className="rounded-2xl bg-white shadow-card p-4"><HistoryChart data={rows} /></div>
          {rows.map((r) => (
            <div key={r.yearMonth} className="flex justify-between rounded-xl bg-white shadow-card px-3 py-2 text-sm">
              <span className="font-medium">{r.yearMonth}</span>
              <span>예산 {formatKRW(r.totalBudget)} · 잔여{' '}
                <b className={r.remaining < 0 ? 'text-neg' : 'text-pos'}>{formatKRW(r.remaining)}</b>
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
