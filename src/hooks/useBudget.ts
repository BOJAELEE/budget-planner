import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRepository } from '../data/RepositoryContext';
import type { FixedCost, Income, ExtraSpending, CardMethod, MonthlyCardActual, MonthlyAccountBalance } from '../types';
import { CARD_METHODS } from '../types';
import {
  transferTotal, cardBaseline, incomeTotal, categoryBreakdown,
  fixedCostsTotal, extraSpendingTotal, extraByCardFromSpendings,
  buildMonthlyBalanceSeries, projectBalanceUsage, calculateDashboardScenario,
} from '../lib/calc';
import { nextYearMonth, previousYearMonth } from '../lib/billing';

export function useBudget(yearMonth: string) {
  const repo = useRepository();
  const sourceMonth = previousYearMonth(yearMonth);
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [extras, setExtras] = useState<ExtraSpending[]>([]);
  const [actuals, setActuals] = useState<MonthlyCardActual[]>([]);
  const [allExtras, setAllExtras] = useState<ExtraSpending[]>([]);
  const [fixedCostBillingMonths, setFixedCostBillingMonths] = useState<string[]>([]);
  const [monthlyBalances, setMonthlyBalances] = useState<MonthlyAccountBalance[]>([]);
  const [balanceProjection, setBalanceProjection] = useState(() => projectBalanceUsage({ '월급통장': 0, '비상금통장': 0, '여행통장': 0 }, 0));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fc, allFixedCosts, inc, ex, ac, allEx, storedBalances] = await Promise.all([
        repo.listFixedCosts(sourceMonth), repo.listAllFixedCosts(), repo.listIncomes(sourceMonth), repo.listExtraSpendings(yearMonth), repo.listActuals(yearMonth),
        repo.listAllExtraSpendings(), repo.listMonthlyAccountBalances(),
      ]);
      const knownMonths = [yearMonth, ...storedBalances.map((item) => nextYearMonth(item.yearMonth)), ...allFixedCosts.map((item) => nextYearMonth(item.yearMonth)), ...allEx.map((item) => item.yearMonth)];
      const throughMonth = knownMonths.sort((a, b) => b.localeCompare(a))[0];
      // Existing saved automatic balances remain untouched; new months carry the last saved amounts without deductions.
      const carryForwardRecords = storedBalances.map((item) => ({ ...item, isManual: true }));
      const series = buildMonthlyBalanceSeries(carryForwardRecords, { [yearMonth]: 0 }, throughMonth);
      const nextBalances = [...storedBalances, ...series.automaticBalances];
      setFixedCosts(fc); setIncomes(inc); setExtras(ex); setActuals(ac); setAllExtras(allEx);
      setFixedCostBillingMonths(allFixedCosts.map((item) => nextYearMonth(item.yearMonth)));
      setMonthlyBalances(nextBalances); setBalanceProjection(series.projections[yearMonth]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [repo, sourceMonth, yearMonth]);

  useEffect(() => { void reload(); }, [reload]);

  const setActual = useCallback(async (card: CardMethod, amount: number) => {
    try {
      await repo.setActual(yearMonth, card, amount);
      setActuals((items) => {
        const current = items.find((item) => item.paymentMethod === card);
        if (current) return items.map((item) => (item.paymentMethod === card ? { ...item, actualAmount: amount } : item));
        return [...items, { id: `${yearMonth}-${card}`, yearMonth, paymentMethod: card, actualAmount: amount }];
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [repo, yearMonth]);

  const setMonthlyAccountBalance = useCallback(async (accountName: MonthlyAccountBalance['accountName'], amount: number) => {
    try {
      await repo.setMonthlyAccountBalance(sourceMonth, accountName, amount);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [repo, reload, sourceMonth]);

  const derived = useMemo(() => {
    const cardBaselines = Object.fromEntries(
      CARD_METHODS.map((c) => [c, cardBaseline(fixedCosts, c)]),
    ) as Record<CardMethod, number>;
    const extraByCard = extraByCardFromSpendings(extras);
    const expectedByCard = Object.fromEntries(
      CARD_METHODS.map((card) => [card, cardBaselines[card] + extraByCard[card]]),
    ) as Record<CardMethod, number>;
    const enteredActualByCard = Object.fromEntries(
      CARD_METHODS.map((card) => [card, actuals.find((actual) => actual.paymentMethod === card)?.actualAmount]),
    ) as Record<CardMethod, number | undefined>;
    const actualByCard = Object.fromEntries(
      CARD_METHODS.map((card) => [card, enteredActualByCard[card] ?? expectedByCard[card]]),
    ) as Record<CardMethod, number>;
    const cardFixedTotal = CARD_METHODS.reduce((sum, card) => sum + cardBaselines[card], 0);
    const cardExtraTotal = CARD_METHODS.reduce((sum, card) => sum + extraByCard[card], 0);
    const expectedCardTotal = CARD_METHODS.reduce((sum, card) => sum + expectedByCard[card], 0);
    const actualCardTotal = CARD_METHODS.reduce((sum, card) => sum + actualByCard[card], 0);
    const transferSum = transferTotal(fixedCosts);
    const fixedTotal = fixedCostsTotal(fixedCosts);
    const incomeSum = incomeTotal(incomes);
    const expectedScenario = calculateDashboardScenario(
      transferSum, expectedCardTotal, incomeSum, fixedTotal, balanceProjection.startingBalances,
    );
    const actualScenario = calculateDashboardScenario(
      transferSum, actualCardTotal, incomeSum, fixedTotal, balanceProjection.startingBalances,
    );
    return {
      transferSum, cardBaselines, extraByCard, expectedByCard, enteredActualByCard, actualByCard,
      cardFixedTotal, cardExtraTotal, expectedCardTotal, actualCardTotal,
      fixedTotal, extraTotal: extraSpendingTotal(extras), incomeSum,
      ...actualScenario, expectedScenario, actualScenario,
      breakdown: categoryBreakdown(fixedCosts),
    };
  }, [fixedCosts, incomes, extras, actuals, balanceProjection]);

  const availableMonths = useMemo(() => (
    [...new Set([
      yearMonth,
      ...fixedCostBillingMonths,
      ...allExtras.map((extra) => extra.yearMonth),
      ...monthlyBalances.map((item) => nextYearMonth(item.yearMonth)),
    ])].sort((a, b) => b.localeCompare(a))
  ), [allExtras, fixedCostBillingMonths, monthlyBalances, yearMonth]);

  return {
    fixedCosts, incomes, extras, actuals, monthlyBalances, loading, error, reload,
    setActual, setMonthlyAccountBalance, derived: { ...derived, incomeYearMonth: sourceMonth, balanceYearMonth: sourceMonth }, availableMonths,
  };
}
