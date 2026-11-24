import { useEffect, useState } from 'react';
import { useRepository } from '../data/RepositoryContext';
import {
  MONTHLY_EMERGENCY_AMOUNT, MONTHLY_FLEXIBLE_BASE,
  extraSpendingTotal, fixedCostsTotal, incomeTotal,
} from '../lib/calc';
import { BackupButton } from '../components/BackupButton';
import { HistoryChart } from '../components/HistoryChart';
import { formatKRW, formatSignedKRW } from '../lib/format';
import { budgetMonthFromBillingMonth, formatYearMonth } from '../lib/billing';

type HistoryRow = {
  yearMonth: string;
  totalBudget: number;
  extraSpending: number;
  incomeSum: number;
  reserveBalance: number;
};

export default function HistoryPage() {
  const repo = useRepository();
  const [rows, setRows] = useState<HistoryRow[]>([]);

  useEffect(() => {
    (async () => {
      const [fixedCosts, extras, incomes] = await Promise.all([
        repo.listAllFixedCosts(), repo.listAllExtraSpendings(), repo.listAllIncomes(),
      ]);
      const byMonth = new Map<string, number>();
      extras.forEach((e) => {
        const displayMonth = budgetMonthFromBillingMonth(e.yearMonth);
        byMonth.set(displayMonth, (byMonth.get(displayMonth) ?? 0) + extraSpendingTotal([e]));
      });
      const months = [...new Set([
        ...byMonth.keys(),
        ...incomes.map((income) => income.yearMonth),
        ...fixedCosts.map((fixedCost) => fixedCost.yearMonth),
      ])];
      const result = months
        .sort((a, b) => a.localeCompare(b))
        .map((yearMonth) => {
          const extraSum = byMonth.get(yearMonth) ?? 0;
          const fixedSum = fixedCostsTotal(fixedCosts.filter((item) => item.yearMonth === yearMonth));
          const incomeSum = incomeTotal(incomes.filter((item) => item.yearMonth === yearMonth));
          const totalBudget = fixedSum + extraSum;
          const reserveBalance = Math.min(incomeSum, fixedSum) + MONTHLY_FLEXIBLE_BASE + MONTHLY_EMERGENCY_AMOUNT - totalBudget;
          return { yearMonth, totalBudget, extraSpending: extraSum, incomeSum, reserveBalance };
        });
      setRows(result);
    })();
  }, [repo]);

  const newestFirstRows = [...rows].reverse();

  return (
    <main className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-[#111827]">월 히스토리</h1>
          <p className="text-xs text-[#6b7280]">최신 월부터 순서대로 표시됩니다.</p>
        </div>
        <BackupButton />
      </div>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-[#e4e4e7] bg-white px-4 py-6 text-center text-gray-500 text-sm">
          아직 데이터가 없습니다. 추가지출을 기록하면 월별로 쌓입니다.
        </p>
      ) : (
        <>
          <section className="rounded-2xl border border-[#e4e4e7] bg-white shadow-card p-4">
            <h2 className="mb-2 text-sm font-bold text-[#111827]">예산 · 추가지출 추이</h2>
            <HistoryChart data={rows} />
          </section>
          <div className="space-y-2">
            {newestFirstRows.map((r) => (
              <div
                key={r.yearMonth}
                className="flex items-center justify-between gap-2 rounded-2xl border border-[#e4e4e7] bg-white shadow-card px-4 py-3 text-sm"
              >
                <div>
                  <span className="block font-bold text-[#111827]">{formatYearMonth(r.yearMonth)}</span>
                  <span className="mt-0.5 block text-xs text-[#6b7280] tabular-nums">
                    예산 {formatKRW(r.totalBudget)} · 추가지출 {formatKRW(r.extraSpending)}
                  </span>
                </div>
                {r.incomeSum > 0 && (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${
                      r.reserveBalance < 0
                        ? 'bg-[#fee2e2] text-neg'
                        : 'bg-[#dcfce7] text-pos'
                    }`}
                  >
                    {r.reserveBalance < 0 ? `${formatSignedKRW(r.reserveBalance)} 초과` : `${formatSignedKRW(r.reserveBalance)} 여유`}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
