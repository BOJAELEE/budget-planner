import type { FixedCost, Income, IncomeTemplate, MonthlyCardActual, ExtraSpending, CardMethod, AccountName, AccountBalance, BalanceSettlement } from '../types';
import type { Repository, ExtraSpendingInput, ExtraSpendingPatch, IncomeInput } from './repository';
import { getSupabase } from '../lib/supabase';
import { billingMonthFor } from '../lib/billing';

// DB(snake_case) ↔ 도메인(camelCase) 매핑
const toFixed = (r: any): FixedCost => ({
  id: r.id, paymentMethod: r.payment_method, category: r.category, name: r.name,
  amount: r.amount, variability: r.variability, active: r.active, sortOrder: r.sort_order,
});
const fromFixed = (d: Partial<Omit<FixedCost, 'id'>>) => ({
  payment_method: d.paymentMethod, category: d.category, name: d.name,
  amount: d.amount, variability: d.variability, active: d.active, sort_order: d.sortOrder,
});
const toExtra = (r: any): ExtraSpending => ({
  id: r.id, yearMonth: r.year_month, card: r.card, name: r.name, amount: r.amount,
  spentOn: r.spent_on, createdAt: r.created_at,
});
const toIncomeTemplate = (r: any): IncomeTemplate => ({
  id: r.id, name: r.name, defaultAmount: r.default_amount, active: r.active,
});
const toIncome = (r: any): Income => ({
  id: r.id, yearMonth: r.year_month, type: r.income_type, name: r.name,
  amount: r.amount, active: r.active, templateId: r.template_id ?? undefined,
});
const toAccountBalance = (r: any): AccountBalance => ({
  id: r.id, accountName: r.account_name, amount: r.amount, sortOrder: r.sort_order,
});
const toBalanceSettlement = (r: any): BalanceSettlement => ({
  id: r.id,
  yearMonth: r.year_month,
  shortageAmount: r.shortage_amount,
  confirmedAt: r.confirmed_at,
  allocations: (r.balance_settlement_allocations ?? []).map((allocation: any) => ({
    accountName: allocation.account_name,
    amount: allocation.amount,
  })),
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

  async listIncomes(yearMonth: string) {
    const [templatesResult, incomeResult] = await Promise.all([
      this.db.from('income_templates').select('*').eq('active', true).order('created_at'),
      this.db.from('monthly_incomes').select('*').eq('year_month', yearMonth).order('created_at'),
    ]);
    if (templatesResult.error) throw templatesResult.error;
    if (incomeResult.error) throw incomeResult.error;
    const templates = (templatesResult.data ?? []).map(toIncomeTemplate);
    const monthlyItems = (incomeResult.data ?? []).map(toIncome);
    const fixedIncome = templates.map((template) => (
      monthlyItems.find((income) => income.templateId === template.id) ?? {
        id: `default-${template.id}-${yearMonth}`,
        yearMonth,
        type: '고정수입' as const,
        name: template.name,
        amount: template.defaultAmount,
        active: template.active,
        templateId: template.id,
      }
    ));
    const nonFixedIncome = monthlyItems.filter((income) => income.type !== '고정수입' || !templates.some((template) => template.id === income.templateId));
    return [...fixedIncome, ...nonFixedIncome];
  }
  async listAllIncomes() {
    const { data, error } = await this.db.from('monthly_incomes').select('*').order('year_month').order('created_at');
    if (error) throw error;
    return (data ?? []).map(toIncome);
  }
  async addIncome(d: IncomeInput) {
    const { data, error } = await this.db.from('monthly_incomes').insert({
      year_month: d.yearMonth, income_type: d.type, name: d.name, amount: d.amount,
      active: d.active, template_id: d.templateId ?? null,
    }).select().single();
    if (error) throw error;
    return toIncome(data);
  }
  async updateIncome(id: string, patch: Partial<Omit<Income, 'id'>>) {
    const { error } = await this.db.from('monthly_incomes').update({
      year_month: patch.yearMonth, income_type: patch.type, name: patch.name,
      amount: patch.amount, active: patch.active, template_id: patch.templateId,
    }).eq('id', id);
    if (error) throw error;
  }
  async deleteIncome(id: string) {
    const { error } = await this.db.from('monthly_incomes').delete().eq('id', id);
    if (error) throw error;
  }
  async listIncomeTemplates() {
    const { data, error } = await this.db.from('income_templates').select('*').order('created_at');
    if (error) throw error;
    return (data ?? []).map(toIncomeTemplate);
  }
  async addIncomeTemplate(d: Omit<IncomeTemplate, 'id'>) {
    const { data, error } = await this.db.from('income_templates').insert({
      name: d.name, default_amount: d.defaultAmount, active: d.active,
    }).select().single();
    if (error) throw error;
    return toIncomeTemplate(data);
  }
  async updateIncomeTemplate(id: string, patch: Partial<Omit<IncomeTemplate, 'id'>>) {
    const { error } = await this.db.from('income_templates').update({
      name: patch.name, default_amount: patch.defaultAmount, active: patch.active,
    }).eq('id', id);
    if (error) throw error;
  }
  async deleteIncomeTemplate(id: string) {
    const { error } = await this.db.from('income_templates').delete().eq('id', id);
    if (error) throw error;
  }
  async setFixedIncome(yearMonth: string, templateId: string, amount: number) {
    const { data: template, error: templateError } = await this.db
      .from('income_templates').select('*').eq('id', templateId).single();
    if (templateError) throw templateError;
    const { error } = await this.db.from('monthly_incomes').upsert({
      year_month: yearMonth, income_type: '고정수입', template_id: templateId,
      name: template.name, amount, active: template.active,
    }, { onConflict: 'year_month,template_id' });
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

  async listExtraSpendings(yearMonth: string) {
    const { data, error } = await this.db
      .from('extra_spendings').select('*')
      .eq('year_month', yearMonth).order('spent_on', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toExtra);
  }
  async addExtraSpending(d: ExtraSpendingInput) {
    const { data, error } = await this.db.from('extra_spendings')
      .insert({
        year_month: billingMonthFor(d.card, d.spentOn), card: d.card,
        name: d.name, amount: d.amount, spent_on: d.spentOn,
      })
      .select().single();
    if (error) throw error;
    return toExtra(data);
  }
  async updateExtraSpending(id: string, patch: ExtraSpendingPatch) {
    const { data: current, error: loadError } = await this.db
      .from('extra_spendings').select('*').eq('id', id).single();
    if (loadError) throw loadError;
    const card = patch.card ?? current.card as CardMethod;
    const spentOn = patch.spentOn ?? current.spent_on;
    const { error } = await this.db.from('extra_spendings')
      .update({
        card: patch.card, name: patch.name, amount: patch.amount, spent_on: patch.spentOn,
        year_month: billingMonthFor(card, spentOn),
      }).eq('id', id);
    if (error) throw error;
  }
  async deleteExtraSpending(id: string) {
    const { error } = await this.db.from('extra_spendings').delete().eq('id', id);
    if (error) throw error;
  }
  async listAllExtraSpendings() {
    const { data, error } = await this.db
      .from('extra_spendings').select('*').order('spent_on', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toExtra);
  }
  async deleteAllExtraSpendings() {
    const { error } = await this.db.from('extra_spendings').delete().not('id', 'is', null);
    if (error) throw error;
  }

  async listAccountBalances() {
    const { data, error } = await this.db.from('account_balances').select('*').order('sort_order');
    if (error) throw error;
    return (data ?? []).map(toAccountBalance);
  }
  async updateAccountBalance(accountName: AccountName, amount: number) {
    const { error } = await this.db.from('account_balances')
      .update({ amount: Math.max(0, Math.round(amount)) })
      .eq('account_name', accountName);
    if (error) throw error;
  }
  async getBalanceSettlement(yearMonth: string) {
    const { data, error } = await this.db.from('balance_settlements')
      .select('id, year_month, shortage_amount, confirmed_at, balance_settlement_allocations(account_name, amount)')
      .eq('year_month', yearMonth)
      .maybeSingle();
    if (error) throw error;
    return data ? toBalanceSettlement(data) : null;
  }
  async listAllBalanceSettlements() {
    const { data, error } = await this.db.from('balance_settlements')
      .select('id, year_month, shortage_amount, confirmed_at, balance_settlement_allocations(account_name, amount)')
      .order('year_month', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toBalanceSettlement);
  }
  async confirmBalanceUsage(yearMonth: string, shortageAmount: number) {
    const { error } = await this.db.rpc('confirm_balance_usage', {
      p_year_month: yearMonth,
      p_shortage_amount: Math.max(0, Math.round(shortageAmount)),
    });
    if (error) throw error;
  }
  async replaceBalanceData(balances: AccountBalance[], settlements: BalanceSettlement[]) {
    const { error: deleteError } = await this.db.from('balance_settlements').delete().not('id', 'is', null);
    if (deleteError) throw deleteError;
    for (const balance of balances) {
      const { error } = await this.db.from('account_balances')
        .update({ amount: Math.max(0, Math.round(balance.amount)) })
        .eq('account_name', balance.accountName);
      if (error) throw error;
    }
    for (const settlement of settlements) {
      const { data, error } = await this.db.from('balance_settlements').insert({
        year_month: settlement.yearMonth,
        shortage_amount: Math.max(0, Math.round(settlement.shortageAmount)),
        confirmed_at: settlement.confirmedAt,
      }).select('id').single();
      if (error) throw error;
      if (settlement.allocations.length > 0) {
        const { error: allocationError } = await this.db.from('balance_settlement_allocations').insert(
          settlement.allocations.map((allocation) => ({
            settlement_id: data.id, account_name: allocation.accountName, amount: Math.max(0, Math.round(allocation.amount)),
          })),
        );
        if (allocationError) throw allocationError;
      }
    }
  }
}
