import type { FixedCost, Income, IncomeTemplate, MonthlyCardActual, ExtraSpending, CardMethod, AccountName, MonthlyAccountBalance } from '../types';

export type ExtraSpendingInput = { card: CardMethod; name: string; amount: number; spentOn: string };
export type ExtraSpendingPatch = Partial<{ card: CardMethod; name: string; amount: number; spentOn: string }>;
export type IncomeInput = Omit<Income, 'id'>;
export type FixedCostCopyResult = { copiedCount: number };

export interface Repository {
  listFixedCosts(yearMonth: string): Promise<FixedCost[]>;
  listAllFixedCosts(): Promise<FixedCost[]>;
  copyPreviousMonthFixedCosts(yearMonth: string): Promise<FixedCostCopyResult>;
  addFixedCost(data: Omit<FixedCost, 'id'>): Promise<FixedCost>;
  updateFixedCost(id: string, patch: Partial<Omit<FixedCost, 'id'>>): Promise<void>;
  deleteFixedCost(id: string): Promise<void>;

  listIncomes(yearMonth: string): Promise<Income[]>;
  listAllIncomes(): Promise<Income[]>;
  addIncome(data: IncomeInput): Promise<Income>;
  updateIncome(id: string, patch: Partial<Omit<Income, 'id'>>): Promise<void>;
  deleteIncome(id: string): Promise<void>;
  listIncomeTemplates(): Promise<IncomeTemplate[]>;
  addIncomeTemplate(data: Omit<IncomeTemplate, 'id'>): Promise<IncomeTemplate>;
  updateIncomeTemplate(id: string, patch: Partial<Omit<IncomeTemplate, 'id'>>): Promise<void>;
  deleteIncomeTemplate(id: string): Promise<void>;
  setFixedIncome(yearMonth: string, templateId: string, amount: number): Promise<void>;

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

  listMonthlyAccountBalances(): Promise<MonthlyAccountBalance[]>;
  setMonthlyAccountBalance(yearMonth: string, accountName: AccountName, openingAmount: number): Promise<void>;
  replaceAutomaticMonthlyAccountBalances(items: MonthlyAccountBalance[]): Promise<void>;
  replaceMonthlyAccountBalances(items: MonthlyAccountBalance[]): Promise<void>;
}
