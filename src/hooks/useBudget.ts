import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRepository } from '../data/RepositoryContext';
import type { FixedCost, Income, ExtraSpending, CardMethod, MonthlyCardActual, MonthlyAccountBalance } from '../types';
import { CARD_METHODS } from '../types';
import {
  transferTotal, cardBaseline, incomeTotal, categoryBreakdown,
  fixedCostsTotal, extraSpendingTotal, extraByCardFromSpendings,
  savingsTotals, balanceUsageAmount, buildMonthlyBalanceSeries, projectBalanceUsage,
} from '../lib/calc';
import { dateInKorea, nextYearMonth, previousYearMonth } from '../lib/billing';

const addMonth = (yearMonth: string) => {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(Date.UTC(year, month, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

const monthRange = (from: string, through: string) => {
  const months: string[] = [];
  for (let month = from; month <= through; month = addMonth(month)) months.push(month);
  return months;
};

export function useBudget(yearMonth: string) {
  const repo = useRepository();
  const sourceMonth = previousYearMonth(yearMonth);
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [extras, setExtras] = useState<ExtraSpending[]>([]);
  const [actuals, setActuals] = useState<MonthlyCardActual[]>([]);
  const [allExtras, setAllExtras] = useState<ExtraSpending[]>([]);
  const [monthlyBalances, setMonthlyBalances] = useState<MonthlyAccountBalance[]>([]);
  const [balanceProjection, setBalanceProjection] = useState(() => projectBalanceUsage({ '월급통장': 0, '비상금통장': 0, '여행통장': 0 }, 0));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fc, inc, ex, ac, allEx, allActuals, allIncomes, storedBalances] = await Promise.all([
        repo.listFixedCosts(), repo.listIncomes(sourceMonth), repo.listExtraSpendings(yearMonth), repo.listActuals(yearMonth),
        repo.listAllExtraSpendings(), repo.listAllActuals(), repo.listAllIncomes(), repo.listMonthlyAccountBalances(),
      ]);
      const manualMonths = storedBalances.filter((item) => item.isManual).map((item) => nextYearMonth(item.yearMonth));
      const knownMonths = [yearMonth, ...manualMonths, ...storedBalances.map((item) => nextYearMonth(item.yearMonth)), ...allEx.map((item) => item.yearMonth), ...allActuals.map((item) => item.yearMonth), ...allIncomes.map((item) => nextYearMonth(item.yearMonth))];
      const firstMonth = manualMonths.sort((a, b) => a.localeCompare(b))[0] ?? yearMonth;
      const throughMonth = knownMonths.sort((a, b) => b.localeCompare(a))[0] > yearMonth
        ? knownMonths.sort((a, b) => b.localeCompare(a))[0]
        : yearMonth;
      const balanceUsageByMonth: Record<string, number> = {};
      const monthlySavings = savingsTotals(fc).totalSavings;
      await Promise.all(monthRange(firstMonth, throughMonth).map(async (month) => {
        const monthExtras = allEx.filter((item) => item.yearMonth === month);
        const byCard = extraByCardFromSpendings(monthExtras);
        const expectedByCard = Object.fromEntries(CARD_METHODS.map((card) => [card, cardBaseline(fc, card) + byCard[card]])) as Record<CardMethod, number>;
        const actualByCard = Object.fromEntries(CARD_METHODS.map((card) => [
          card, allActuals.find((item) => item.yearMonth === month && item.paymentMethod === card)?.actualAmount ?? expectedByCard[card],
        ])) as Record<CardMethod, number>;
        const budget = transferTotal(fc) + CARD_METHODS.reduce((sum, card) => sum + actualByCard[card], 0);
        const shortage = Math.max(budget - incomeTotal(await repo.listIncomes(previousYearMonth(month))), 0);
        balanceUsageByMonth[month] = balanceUsageAmount(shortage, monthlySavings);
      }));
      const series = buildMonthlyBalanceSeries(storedBalances, balanceUsageByMonth, throughMonth);
      const currentCalendarMonth = dateInKorea().slice(0, 7);
      const persistedAutomaticBalances = series.automaticBalances.filter((item) => item.yearMonth <= currentCalendarMonth);
      await repo.replaceAutomaticMonthlyAccountBalances(persistedAutomaticBalances);
      const nextBalances = [...storedBalances.filter((item) => item.isManual), ...persistedAutomaticBalances];
      setFixedCosts(fc); setIncomes(inc); setExtras(ex); setActuals(ac); setAllExtras(allEx);
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
    const totalBudget = transferTotal(fixedCosts) + actualCardTotal;
    const incomeSum = incomeTotal(incomes);
    const shortage = Math.max(totalBudget - incomeSum, 0);
    const savings = savingsTotals(fixedCosts);
    const balanceUsage = balanceUsageAmount(shortage, savings.totalSavings);
    const currentBalanceProjection = projectBalanceUsage(balanceProjection.startingBalances, balanceUsage);
    return {
      transferSum: transferTotal(fixedCosts), cardBaselines, extraByCard, expectedByCard, enteredActualByCard, actualByCard,
      cardFixedTotal, cardExtraTotal, expectedCardTotal, actualCardTotal,
      fixedTotal: fixedCostsTotal(fixedCosts), extraTotal: extraSpendingTotal(extras), totalBudget, incomeSum,
      remaining: incomeSum - totalBudget, shortage, balanceUsage,
      savings, balanceProjection: currentBalanceProjection, breakdown: categoryBreakdown(fixedCosts),
    };
  }, [fixedCosts, incomes, extras, actuals, balanceProjection]);

  const availableMonths = useMemo(() => (
    [...new Set([
      yearMonth,
      ...allExtras.map((extra) => extra.yearMonth),
      ...monthlyBalances.map((item) => nextYearMonth(item.yearMonth)),
    ])].sort((a, b) => b.localeCompare(a))
  ), [allExtras, monthlyBalances, yearMonth]);

  return {
    fixedCosts, incomes, extras, actuals, monthlyBalances, loading, error, reload,
    setActual, setMonthlyAccountBalance, derived: { ...derived, incomeYearMonth: sourceMonth, balanceYearMonth: sourceMonth }, availableMonths,
  };
}
