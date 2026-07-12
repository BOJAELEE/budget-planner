import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRepository } from '../data/RepositoryContext';
import type { FixedCost, Income, MonthlyCardActual, CardMethod } from '../types';
import { CARD_METHODS } from '../types';
import {
  transferTotal, cardBaseline, incomeTotal, totalBudget, remaining,
  extraCardSpending, categoryBreakdown,
} from '../lib/calc';

export function useBudget(yearMonth: string) {
  const repo = useRepository();
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [actuals, setActuals] = useState<MonthlyCardActual[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [fc, inc, act] = await Promise.all([
      repo.listFixedCosts(), repo.listIncomes(), repo.listActuals(yearMonth),
    ]);
    setFixedCosts(fc); setIncomes(inc); setActuals(act); setLoading(false);
  }, [repo, yearMonth]);

  useEffect(() => { void reload(); }, [reload]);

  const derived = useMemo(() => {
    const cardBaselines = Object.fromEntries(
      CARD_METHODS.map((c) => [c, cardBaseline(fixedCosts, c)]),
    ) as Record<CardMethod, number>;
    const actualByCard = Object.fromEntries(
      CARD_METHODS.map((c) => [c, actuals.find((a) => a.paymentMethod === c)?.actualAmount ?? 0]),
    ) as Record<CardMethod, number>;
    const extraByCard = Object.fromEntries(
      CARD_METHODS.map((c) => [c, extraCardSpending(fixedCosts, c, actualByCard[c])]),
    ) as Record<CardMethod, number>;
    return {
      transferSum: transferTotal(fixedCosts),
      cardBaselines,
      actualByCard,
      extraByCard,
      totalBudget: totalBudget(fixedCosts, actuals),
      incomeSum: incomeTotal(incomes),
      remaining: remaining(fixedCosts, incomes, actuals),
      breakdown: categoryBreakdown(fixedCosts),
    };
  }, [fixedCosts, incomes, actuals]);

  return { fixedCosts, incomes, actuals, loading, reload, derived };
}
