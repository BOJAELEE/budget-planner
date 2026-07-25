import { useEffect, useState } from 'react';
import { useRepository } from '../data/RepositoryContext';
import type { FixedCost } from '../types';
import { fixedCostsTotal } from '../lib/calc';
import { HistoryChart } from '../components/HistoryChart';
import { formatKRW } from '../lib/format';

export default function HistoryPage() {
  const repo = useRepository();
  const [rows, setRows] = useState<{ yearMonth: string; totalBudget: number; extraSpending: number }[]>([]);

  useEffect(() => {
    (async () => {
      const [fc, extras, incomes] = await Promise.all([
        repo.listFixedCosts(), repo.listAllExtraSpendings(), repo.listAllIncomes(),
      ]);
      const fixedTotal = fixedCostsTotal(fc as FixedCost[]);
      const byMonth = new Map<string, number>();
      extras.forEach((e) => {
        byMonth.set(e.yearMonth, (byMonth.get(e.yearMonth) ?? 0) + e.amount);
      });
      const months = [...new Set([...byMonth.keys(), ...incomes.map((income) => income.yearMonth)])];
      const result = await Promise.all(months
        .sort((a, b) => a.localeCompare(b))
        .map(async (yearMonth) => {
          const extraSum = byMonth.get(yearMonth) ?? 0;
          const totalBudget = fixedTotal + extraSum;
          return { yearMonth, totalBudget, extraSpending: extraSum };
        }));
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
          <section className="rounded-2xl bg-white shadow-card p-4">
            <h2 className="mb-2 font-bold">예산 · 추가지출</h2>
            <HistoryChart data={rows} />
          </section>
          {rows.map((r) => (
            <div key={r.yearMonth} className="flex justify-between rounded-xl bg-white shadow-card px-3 py-2 text-sm">
              <span className="font-medium">{r.yearMonth}</span>
              <span>예산 {formatKRW(r.totalBudget)} · 추가지출 {formatKRW(r.extraSpending)}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
