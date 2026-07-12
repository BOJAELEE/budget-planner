import type { FixedCost, Income, MonthlyCardActual, CardMethod } from '../types';
import type { Repository } from './repository';
import { SEED_FIXED_COSTS, SEED_INCOMES } from './seedData';

const uid = () =>
  (globalThis.crypto?.randomUUID?.() ?? `id_${Math.random().toString(36).slice(2)}`);

export class MemoryRepository implements Repository {
  private fixedCosts: FixedCost[] = [];
  private incomes: Income[] = [];
  private actuals: MonthlyCardActual[] = [];

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

  async listIncomes() {
    return [...this.incomes];
  }
  async addIncome(data: Omit<Income, 'id'>) {
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
}

export function createSeededMemoryRepository(): MemoryRepository {
  const repo = new MemoryRepository();
  SEED_FIXED_COSTS.forEach((f) => void repo.addFixedCost(f));
  SEED_INCOMES.forEach((i) => void repo.addIncome(i));
  return repo;
}
