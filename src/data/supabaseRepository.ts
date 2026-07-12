import type { FixedCost, Income, MonthlyCardActual, CardMethod } from '../types';
import type { Repository } from './repository';
import { getSupabase } from '../lib/supabase';

// DB(snake_case) ↔ 도메인(camelCase) 매핑
const toFixed = (r: any): FixedCost => ({
  id: r.id, paymentMethod: r.payment_method, category: r.category, name: r.name,
  amount: r.amount, variability: r.variability, active: r.active, sortOrder: r.sort_order,
});
const fromFixed = (d: Partial<Omit<FixedCost, 'id'>>) => ({
  payment_method: d.paymentMethod, category: d.category, name: d.name,
  amount: d.amount, variability: d.variability, active: d.active, sort_order: d.sortOrder,
});

export class SupabaseRepository implements Repository {
  private db = getSupabase();

  async listFixedCosts() {
    const { data, error } = await this.db.from('fixed_costs').select('*').order('sort_order');
    if (error) throw error;
    return (data ?? []).map(toFixed);
  }
  async addFixedCost(d: Omit<FixedCost, 'id'>) {
    const { data, error } = await this.db.from('fixed_costs').insert(fromFixed(d)).select().single();
    if (error) throw error;
    return toFixed(data);
  }
  async updateFixedCost(id: string, patch: Partial<Omit<FixedCost, 'id'>>) {
    const { error } = await this.db.from('fixed_costs').update(fromFixed(patch)).eq('id', id);
    if (error) throw error;
  }
  async deleteFixedCost(id: string) {
    const { error } = await this.db.from('fixed_costs').delete().eq('id', id);
    if (error) throw error;
  }

  async listIncomes() {
    const { data, error } = await this.db.from('incomes').select('*').order('created_at');
    if (error) throw error;
    return (data ?? []) as Income[];
  }
  async addIncome(d: Omit<Income, 'id'>) {
    const { data, error } = await this.db.from('incomes').insert(d).select().single();
    if (error) throw error;
    return data as Income;
  }
  async updateIncome(id: string, patch: Partial<Omit<Income, 'id'>>) {
    const { error } = await this.db.from('incomes').update(patch).eq('id', id);
    if (error) throw error;
  }
  async deleteIncome(id: string) {
    const { error } = await this.db.from('incomes').delete().eq('id', id);
    if (error) throw error;
  }

  async listActuals(yearMonth: string) {
    const { data, error } = await this.db
      .from('monthly_card_actuals').select('*').eq('year_month', yearMonth);
    if (error) throw error;
    return (data ?? []).map((r: any): MonthlyCardActual => ({
      id: r.id, yearMonth: r.year_month, paymentMethod: r.payment_method, actualAmount: r.actual_amount,
    }));
  }
  async setActual(yearMonth: string, card: CardMethod, amount: number) {
    const { error } = await this.db.from('monthly_card_actuals').upsert(
      { year_month: yearMonth, payment_method: card, actual_amount: amount },
      { onConflict: 'year_month,payment_method' },
    );
    if (error) throw error;
  }
  async listAllActuals() {
    const { data, error } = await this.db.from('monthly_card_actuals').select('*');
    if (error) throw error;
    return (data ?? []).map((r: any): MonthlyCardActual => ({
      id: r.id, yearMonth: r.year_month, paymentMethod: r.payment_method, actualAmount: r.actual_amount,
    }));
  }
  async deleteAllActuals() {
    const { error } = await this.db
      .from('monthly_card_actuals')
      .delete()
      .not('id', 'is', null);
    if (error) throw error;
  }
}
