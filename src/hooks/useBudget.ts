import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRepository } from '../data/RepositoryContext';
import type { FixedCost, Income, ExtraSpending, CardMethod, MonthlyCardActual, AccountBalance, BalanceSettlement, AccountName } from '../types';
import { CARD_METHODS, ACCOUNT_NAMES } from '../types';
import {
  transferTotal, cardBaseline, incomeTotal, categoryBreakdown,
  fixedCostsTotal, extraSpendingTotal, extraByCardFromSpendings,
  savingsTotals, projectBalanceUsage,
} from '../lib/calc';

export function useBudget(yearMonth: string) {
  const repo = useRepository();
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [extras, setExtras] = useState<ExtraSpending[]>([]);
  const [actuals, setActuals] = useState<MonthlyCardActual[]>([]);
  const [allExtras, setAllExtras] = useState<ExtraSpending[]>([]);
  const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([]);
  const [balanceSettlement, setBalanceSettlement] = useState<BalanceSettlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fc, inc, ex, ac, allEx, balances, settlement] = await Promise.all([
        repo.listFixedCosts(), repo.listIncomes(yearMonth), repo.listExtraSpendings(yearMonth), repo.listActuals(yearMonth), repo.listAllExtraSpendings(),
        repo.listAccountBalances(), repo.getBalanceSettlement(yearMonth),
      ]);
      setFixedCosts(fc); setIncomes(inc); setExtras(ex); setActuals(ac); setAllExtras(allEx);
      setAccountBalances(balances); setBalanceSettlement(settlement);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [repo, yearMonth]);

  const confirmBalanceUsage = useCallback(async (shortageAmount: number) => {
    try {
      await repo.confirmBalanceUsage(yearMonth, shortageAmount);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [repo, reload, yearMonth]);

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
    const shortage = Math.max(totalBudget - incomeTotal(incomes), 0);
    const balances = Object.fromEntries(ACCOUNT_NAMES.map((accountName) => [
      accountName,
      accountBalances.find((balance) => balance.accountName === accountName)?.amount ?? 0,
    ])) as Record<AccountName, number>;
    const balanceProjection = projectBalanceUsage(balances, shortage, balanceSettlement?.allocations);
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
      shortage,
      balanceProjection,
      savings: savingsTotals(fixedCosts),
      breakdown: categoryBreakdown(fixedCosts),
    };
  }, [fixedCosts, incomes, extras, actuals, accountBalances, balanceSettlement]);

  const availableMonths = useMemo(() => (
    [...new Set([yearMonth, ...allExtras.map((extra) => extra.yearMonth)])].sort((a, b) => b.localeCompare(a))
  ), [allExtras, yearMonth]);

  return {
    fixedCosts, incomes, extras, actuals, accountBalances, balanceSettlement,
    loading, error, reload, setActual, confirmBalanceUsage, derived, availableMonths,
  };
}
