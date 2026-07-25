import type { FixedCost, Income, IncomeTemplate, MonthlyCardActual, ExtraSpending, CardMethod, AccountName, AccountBalance, BalanceSettlement } from '../types';
import type { Repository, ExtraSpendingInput, ExtraSpendingPatch, IncomeInput } from './repository';
import { SEED_FIXED_COSTS, SEED_INCOME_TEMPLATES } from './seedData';
import { billingMonthFor } from '../lib/billing';
import { ACCOUNT_NAMES } from '../types';
import { projectBalanceUsage } from '../lib/calc';

const uid = () =>
  (globalThis.crypto?.randomUUID?.() ?? `id_${Math.random().toString(36).slice(2)}`);

export class MemoryRepository implements Repository {
  private fixedCosts: FixedCost[] = [];
  private incomes: Income[] = [];
  private incomeTemplates: IncomeTemplate[] = [];
  private actuals: MonthlyCardActual[] = [];
  private extras: ExtraSpending[] = [];
  private accountBalances: AccountBalance[] = ACCOUNT_NAMES.map((accountName, index) => ({
    id: `account-${index + 1}`, accountName, amount: 0, sortOrder: index + 1,
  }));
  private balanceSettlements: BalanceSettlement[] = [];

  async listFixedCosts() {
    return [...this.fixedCosts].sort((a, b) => a.sortOrder - b.sortOrder);
  }
  async addFixedCost(data: Omit<FixedCost, 'id'>) {
    const item = { ...data, id: uid() };
    this.fixedCosts.push(item);
    return item;
  }
  async updateFixedCost(id: string, patch: Partial<Omit<FixedCost, 'id'>>) {
    const i = this.fixedCosts.findIndex((f) => f.id === id);
    if (i >= 0) this.fixedCosts[i] = { ...this.fixedCosts[i], ...patch };
  }
  async deleteFixedCost(id: string) {
    this.fixedCosts = this.fixedCosts.filter((f) => f.id !== id);
  }

  async listIncomes(yearMonth: string) {
    const monthlyItems = this.incomes.filter((income) => income.yearMonth === yearMonth);
    const fixedIncome = this.incomeTemplates
      .filter((template) => template.active)
      .map((template) => monthlyItems.find((income) => income.templateId === template.id) ?? {
        id: `default-${template.id}-${yearMonth}`,
        yearMonth,
        type: '고정수입' as const,
        name: template.name,
        amount: template.defaultAmount,
        active: template.active,
        templateId: template.id,
      });
    const nonFixedIncome = monthlyItems.filter((income) => (
      income.type !== '고정수입' || !this.incomeTemplates.some((template) => template.id === income.templateId && template.active)
    ));
    return [...fixedIncome, ...nonFixedIncome];
  }
  async listAllIncomes() {
    return [...this.incomes];
  }
  async addIncome(data: IncomeInput) {
    const item = { ...data, id: uid() };
    this.incomes.push(item);
    return item;
  }
  async updateIncome(id: string, patch: Partial<Omit<Income, 'id'>>) {
    const i = this.incomes.findIndex((x) => x.id === id);
    if (i >= 0) this.incomes[i] = { ...this.incomes[i], ...patch };
  }
  async deleteIncome(id: string) {
    this.incomes = this.incomes.filter((x) => x.id !== id);
  }
  async listIncomeTemplates() {
    return [...this.incomeTemplates];
  }
  async addIncomeTemplate(data: Omit<IncomeTemplate, 'id'>) {
    const item = { ...data, id: uid() };
    this.incomeTemplates.push(item);
    return item;
  }
  async updateIncomeTemplate(id: string, patch: Partial<Omit<IncomeTemplate, 'id'>>) {
    const index = this.incomeTemplates.findIndex((item) => item.id === id);
    if (index >= 0) this.incomeTemplates[index] = { ...this.incomeTemplates[index], ...patch };
  }
  async deleteIncomeTemplate(id: string) {
    this.incomeTemplates = this.incomeTemplates.filter((item) => item.id !== id);
  }
  async setFixedIncome(yearMonth: string, templateId: string, amount: number) {
    const template = this.incomeTemplates.find((item) => item.id === templateId);
    if (!template) throw new Error('고정수입 항목을 찾을 수 없습니다.');
    const index = this.incomes.findIndex((item) => item.yearMonth === yearMonth && item.templateId === templateId);
    const item: Income = {
      id: index >= 0 ? this.incomes[index].id : uid(),
      yearMonth,
      type: '고정수입',
      name: template.name,
      amount,
      active: template.active,
      templateId,
    };
    if (index >= 0) this.incomes[index] = item;
    else this.incomes.push(item);
  }

  async listActuals(yearMonth: string) {
    return this.actuals.filter((a) => a.yearMonth === yearMonth);
  }
  async setActual(yearMonth: string, card: CardMethod, amount: number) {
    const i = this.actuals.findIndex(
      (a) => a.yearMonth === yearMonth && a.paymentMethod === card,
    );
    if (i >= 0) this.actuals[i] = { ...this.actuals[i], actualAmount: amount };
    else this.actuals.push({ id: uid(), yearMonth, paymentMethod: card, actualAmount: amount });
  }
  async listAllActuals() {
    return [...this.actuals];
  }
  async deleteAllActuals() {
    this.actuals = [];
  }

  async listExtraSpendings(yearMonth: string) {
    return this.extras
      .filter((e) => e.yearMonth === yearMonth)
      .sort((a, b) => b.spentOn.localeCompare(a.spentOn) || b.createdAt.localeCompare(a.createdAt));
  }
  async addExtraSpending(data: ExtraSpendingInput) {
    const item: ExtraSpending = {
      ...data,
      yearMonth: billingMonthFor(data.card, data.spentOn),
      id: uid(),
      createdAt: new Date().toISOString(),
    };
    this.extras.push(item);
    return item;
  }
  async updateExtraSpending(id: string, patch: ExtraSpendingPatch) {
    const i = this.extras.findIndex((e) => e.id === id);
    if (i >= 0) {
      const next = { ...this.extras[i], ...patch };
      this.extras[i] = { ...next, yearMonth: billingMonthFor(next.card, next.spentOn) };
    }
  }
  async deleteExtraSpending(id: string) {
    this.extras = this.extras.filter((e) => e.id !== id);
  }
  async listAllExtraSpendings() {
    return [...this.extras];
  }
  async deleteAllExtraSpendings() {
    this.extras = [];
  }

  async listAccountBalances() {
    return [...this.accountBalances].sort((a, b) => a.sortOrder - b.sortOrder);
  }
  async updateAccountBalance(accountName: AccountName, amount: number) {
    this.accountBalances = this.accountBalances.map((item) => (
      item.accountName === accountName ? { ...item, amount: Math.max(0, Math.round(amount)) } : item
    ));
  }
  async getBalanceSettlement(yearMonth: string) {
    const item = this.balanceSettlements.find((settlement) => settlement.yearMonth === yearMonth);
    return item ? { ...item, allocations: [...item.allocations] } : null;
  }
  async listAllBalanceSettlements() {
    return this.balanceSettlements
      .map((item) => ({ ...item, allocations: [...item.allocations] }))
      .sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
  }
  async confirmBalanceUsage(yearMonth: string, shortageAmount: number) {
    const previous = await this.getBalanceSettlement(yearMonth);
    const balances = Object.fromEntries(this.accountBalances.map((item) => [item.accountName, item.amount])) as Record<AccountName, number>;
    const projection = projectBalanceUsage(balances, shortageAmount, previous?.allocations);
    this.accountBalances = this.accountBalances.map((item) => ({ ...item, amount: projection.balancesAfter[item.accountName] }));
    const settlement: BalanceSettlement = {
      id: previous?.id ?? uid(), yearMonth, shortageAmount: Math.max(0, Math.round(shortageAmount)),
      confirmedAt: new Date().toISOString(), allocations: projection.allocations,
    };
    this.balanceSettlements = [...this.balanceSettlements.filter((item) => item.yearMonth !== yearMonth), settlement];
  }
  async replaceBalanceData(balances: AccountBalance[], settlements: BalanceSettlement[]) {
    this.accountBalances = ACCOUNT_NAMES.map((accountName, index) => {
      const source = balances.find((item) => item.accountName === accountName);
      return { id: source?.id ?? `account-${index + 1}`, accountName, amount: Math.max(0, source?.amount ?? 0), sortOrder: index + 1 };
    });
    this.balanceSettlements = settlements.map((item) => ({ ...item, allocations: [...item.allocations] }));
  }
}

export function createSeededMemoryRepository(): MemoryRepository {
  const repo = new MemoryRepository();
  SEED_FIXED_COSTS.forEach((f) => void repo.addFixedCost(f));
  SEED_INCOME_TEMPLATES.forEach((income) => void repo.addIncomeTemplate(income));
  return repo;
}
