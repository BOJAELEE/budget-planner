import { useEffect, useState } from 'react';
import { useRepository } from '../data/RepositoryContext';
import type { FixedCost, Income } from '../types';
import { fixedCostsTotal, incomeTotal } from '../lib/calc';
import { HistoryChart } from '../components/HistoryChart';
import { formatKRW } from '../lib/format';

export default function HistoryPage() {
  const repo = useRepository();
  const [rows, setRows] = useState<{ yearMonth: string; totalBudget: number; remaining: number }[]>([]);

  useEffect(() => {
    (async () => {
      const [fc, inc, extras] = await Promise.all([
        repo.listFixedCosts(), repo.listIncomes(), repo.listAllExtraSpendings(),
      ]);
      const fixedTotal = fixedCostsTotal(fc as FixedCost[]);
      const income = incomeTotal(inc as Income[]);
      const byMonth = new Map<string, number>();
      extras.forEach((e) => {
        byMonth.set(e.yearMonth, (byMonth.get(e.yearMonth) ?? 0) + e.amount);
      });
      const result = [...byMonth.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([yearMonth, extraSum]) => {
          const totalBudget = fixedTotal + extraSum;
          return { yearMonth, totalBudget, remaining: income - totalBudget };
        });
      setRows(result);
    })();
  }, [repo]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">월 히스토리</h1>
      {rows.length === 0 ? (
        <p className="text-gray-400 text-sm">아직 데이터가 없습니다. 추가지출을 기록하면 월별로 쌓입니다.</p>
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
