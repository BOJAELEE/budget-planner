import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRepository } from '../data/RepositoryContext';
import type { FixedCost, Income, ExtraSpending, CardMethod } from '../types';
import { CARD_METHODS } from '../types';
import {
  transferTotal, cardBaseline, incomeTotal, categoryBreakdown,
  fixedCostsTotal, extraSpendingTotal, extraByCardFromSpendings, totalBudgetV2, remainingV2,
} from '../lib/calc';

export function useBudget(yearMonth: string) {
  const repo = useRepository();
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [extras, setExtras] = useState<ExtraSpending[]>([]);
  const [allExtras, setAllExtras] = useState<ExtraSpending[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fc, inc, ex, allEx] = await Promise.all([
        repo.listFixedCosts(), repo.listIncomes(), repo.listExtraSpendings(yearMonth), repo.listAllExtraSpendings(),
      ]);
      setFixedCosts(fc); setIncomes(inc); setExtras(ex); setAllExtras(allEx);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [repo, yearMonth]);

  useEffect(() => { void reload(); }, [reload]);

  const derived = useMemo(() => {
    const cardBaselines = Object.fromEntries(
      CARD_METHODS.map((c) => [c, cardBaseline(fixedCosts, c)]),
    ) as Record<CardMethod, number>;
    return {
      transferSum: transferTotal(fixedCosts),
      cardBaselines,
      extraByCard: extraByCardFromSpendings(extras),
      fixedTotal: fixedCostsTotal(fixedCosts),
      extraTotal: extraSpendingTotal(extras),
      totalBudget: totalBudgetV2(fixedCosts, extras),
      incomeSum: incomeTotal(incomes),
      remaining: remainingV2(fixedCosts, incomes, extras),
      breakdown: categoryBreakdown(fixedCosts),
    };
  }, [fixedCosts, incomes, extras]);

  const availableMonths = useMemo(() => (
    [...new Set([yearMonth, ...allExtras.map((extra) => extra.yearMonth)])].sort((a, b) => b.localeCompare(a))
  ), [allExtras, yearMonth]);

  return { fixedCosts, incomes, extras, loading, error, reload, derived, availableMonths };
}
