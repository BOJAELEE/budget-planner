import type { FixedCost, Income, MonthlyCardActual, ExtraSpending, CardMethod } from '../types';

export type ExtraSpendingInput = { card: CardMethod; name: string; amount: number; spentOn: string };
export type ExtraSpendingPatch = Partial<{ card: CardMethod; name: string; amount: number; spentOn: string }>;

export interface Repository {
  listFixedCosts(): Promise<FixedCost[]>;
  addFixedCost(data: Omit<FixedCost, 'id'>): Promise<FixedCost>;
  updateFixedCost(id: string, patch: Partial<Omit<FixedCost, 'id'>>): Promise<void>;
  deleteFixedCost(id: string): Promise<void>;

  listIncomes(): Promise<Income[]>;
  addIncome(data: Omit<Income, 'id'>): Promise<Income>;
  updateIncome(id: string, patch: Partial<Omit<Income, 'id'>>): Promise<void>;
  deleteIncome(id: string): Promise<void>;

  listActuals(yearMonth: string): Promise<MonthlyCardActual[]>;
  setActual(yearMonth: string, card: CardMethod, amount: number): Promise<void>;
  listAllActuals(): Promise<MonthlyCardActual[]>;
  deleteAllActuals(): Promise<void>;

  listExtraSpendings(yearMonth: string): Promise<ExtraSpending[]>;
  addExtraSpending(data: ExtraSpendingInput): Promise<ExtraSpending>;
  updateExtraSpending(id: string, patch: ExtraSpendingPatch): Promise<void>;
  deleteExtraSpending(id: string): Promise<void>;
  listAllExtraSpendings(): Promise<ExtraSpending[]>;
  deleteAllExtraSpendings(): Promise<void>;
}
