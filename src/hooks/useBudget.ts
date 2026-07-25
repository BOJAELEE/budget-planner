import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRepository } from '../data/RepositoryContext';
import type { FixedCost, Income, ExtraSpending, CardMethod, MonthlyCardActual } from '../types';
import { CARD_METHODS } from '../types';
import {
  transferTotal, cardBaseline, incomeTotal, categoryBreakdown,
  fixedCostsTotal, extraSpendingTotal, extraByCardFromSpendings,
  savingsTotals,
} from '../lib/calc';

export function useBudget(yearMonth: string) {
  const repo = useRepository();
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [extras, setExtras] = useState<ExtraSpending[]>([]);
  const [actuals, setActuals] = useState<MonthlyCardActual[]>([]);
  const [allExtras, setAllExtras] = useState<ExtraSpending[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fc, inc, ex, ac, allEx] = await Promise.all([
        repo.listFixedCosts(), repo.listIncomes(yearMonth), repo.listExtraSpendings(yearMonth), repo.listActuals(yearMonth), repo.listAllExtraSpendings(),
      ]);
      setFixedCosts(fc); setIncomes(inc); setExtras(ex); setActuals(ac); setAllExtras(allEx);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [repo, yearMonth]);

  useEffect(() => { void reload(); }, [reload]);

  const setActual = useCallback(async (card: CardMethod, amount: number) => {
    try {
      await repo.setActual(yearMonth, card, amount);
      setActuals((items) => {
        const current = items.find((item) => item.paymentMethod === card);
        if (current) {
          return items.map((item) => (item.paymentMethod === card ? { ...item, actualAmount: amount } : item));
        }
        return [...items, { id: `${yearMonth}-${card}`, yearMonth, paymentMethod: card, actualAmount: amount }];
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [repo, yearMonth]);

  const derived = useMemo(() => {
    const cardBaselines = Object.fromEntries(
      CARD_METHODS.map((c) => [c, cardBaseline(fixedCosts, c)]),
    ) as Record<CardMethod, number>;
    const extraByCard = extraByCardFromSpendings(extras);
    const expectedByCard = Object.fromEntries(
      CARD_METHODS.map((card) => [card, cardBaselines[card] + extraByCard[card]]),
    ) as Record<CardMethod, number>;
    const enteredActualByCard = Object.fromEntries(
      CARD_METHODS.map((card) => [
        card,
        actuals.find((actual) => actual.paymentMethod === card)?.actualAmount,
      ]),
    ) as Record<CardMethod, number | undefined>;
    const actualByCard = Object.fromEntries(
      CARD_METHODS.map((card) => [card, enteredActualByCard[card] ?? expectedByCard[card]]),
    ) as Record<CardMethod, number>;
    const cardFixedTotal = CARD_METHODS.reduce((sum, card) => sum + cardBaselines[card], 0);
    const cardExtraTotal = CARD_METHODS.reduce((sum, card) => sum + extraByCard[card], 0);
    const expectedCardTotal = CARD_METHODS.reduce((sum, card) => sum + expectedByCard[card], 0);
    const actualCardTotal = CARD_METHODS.reduce((sum, card) => sum + actualByCard[card], 0);
    const totalBudget = transferTotal(fixedCosts) + actualCardTotal;
    return {
      transferSum: transferTotal(fixedCosts),
      cardBaselines,
      extraByCard,
      expectedByCard,
      enteredActualByCard,
      actualByCard,
      cardFixedTotal,
      cardExtraTotal,
      expectedCardTotal,
      actualCardTotal,
      fixedTotal: fixedCostsTotal(fixedCosts),
      extraTotal: extraSpendingTotal(extras),
      totalBudget,
      incomeSum: incomeTotal(incomes),
      remaining: incomeTotal(incomes) - totalBudget,
      savings: savingsTotals(fixedCosts),
      breakdown: categoryBreakdown(fixedCosts),
    };
  }, [fixedCosts, incomes, extras, actuals]);

  const availableMonths = useMemo(() => (
    [...new Set([yearMonth, ...allExtras.map((extra) => extra.yearMonth)])].sort((a, b) => b.localeCompare(a))
  ), [allExtras, yearMonth]);

  return { fixedCosts, incomes, extras, actuals, loading, error, reload, setActual, derived, availableMonths };
}
