import { useEffect, useMemo, useState } from 'react';
import { useRepository } from '../data/RepositoryContext';
import { INCOME_TYPES, type Income, type IncomeType } from '../types';
import { AmountInput } from '../components/AmountInput';
import { formatKRW, parseAmount } from '../lib/format';
import { incomeTotal } from '../lib/calc';
import { defaultBillingYearMonth, formatYearMonth } from '../lib/billing';
import { BackupPanel } from '../components/BackupPanel';

const typeLabels: Record<IncomeType, string> = {
  고정수입: '고정수입', 변동수입: '변동수입', 기타수입: '기타수입',
};

export default function IncomePage() {
  const repo = useRepository();
  const [yearMonth, setYearMonth] = useState(defaultBillingYearMonth);
  const [items, setItems] = useState<Income[]>([]);
  const [allItems, setAllItems] = useState<Income[]>([]);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newType, setNewType] = useState<IncomeType>('변동수입');

  const load = async () => {
    const [monthItems, history] = await Promise.all([
      repo.listIncomes(yearMonth), repo.listAllIncomes(),
    ]);
    setItems(monthItems);
    setAllItems(history);
  };
  useEffect(() => { void load(); }, [yearMonth]);

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    const amount = parseAmount(newAmount);
    if (newType === '고정수입') {
      await repo.addIncomeTemplate({ name, defaultAmount: amount, active: true });
    } else {
      await repo.addIncome({ yearMonth, type: newType, name, amount, active: true });
    }
    setNewName('');
    setNewAmount('');
    await load();
  };

  const setAmount = async (item: Income, amount: number) => {
    if (item.type === '고정수입' && item.templateId) {
      await repo.setFixedIncome(yearMonth, item.templateId, amount);
    } else {
      await repo.updateIncome(item.id, { amount });
    }
    await load();
  };

  const remove = async (item: Income) => {
    if (!confirm('삭제할까요?')) return;
    if (item.type === '고정수입' && item.templateId) {
      await repo.updateIncomeTemplate(item.templateId, { active: false });
    } else {
      await repo.deleteIncome(item.id);
    }
    await load();
  };

  const byType = useMemo(() => Object.fromEntries(
    INCOME_TYPES.map((type) => [type, items.filter((item) => item.type === type)]),
  ) as Record<IncomeType, Income[]>, [items]);
  const historyMonths = useMemo(() => (
    [...new Set([yearMonth, ...allItems.map((item) => item.yearMonth)])].sort((a, b) => b.localeCompare(a))
  ), [allItems, yearMonth]);

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-xl font-bold">월별 수입</h1>
      <label className="block text-sm font-medium text-gray-600">
        수입월
        <input
          type="month"
          className="mt-1 block w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-base text-gray-900"
          value={yearMonth}
          onChange={(event) => setYearMonth(event.target.value)}
        />
      </label>

      {INCOME_TYPES.map((type) => (
        <section key={type} className="space-y-2" aria-label={typeLabels[type]}>
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">{typeLabels[type]}</h2>
            <span className="text-sm text-gray-500">{formatKRW(incomeTotal(byType[type]))}</span>
          </div>
          {byType[type].length === 0 ? (
            <p className="rounded-xl bg-white px-3 py-3 text-sm text-gray-400">등록된 {typeLabels[type]}이 없습니다.</p>
          ) : byType[type].map((item) => (
            <div key={item.id} className="rounded-xl bg-white shadow-card px-3 py-2 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-medium">{item.name}</span>
                <button className="text-neg text-sm" onClick={() => void remove(item)}>삭제</button>
              </div>
              <AmountInput
                value={item.amount}
                ariaLabel={`${item.name} 금액`}
                onCommit={(amount) => void setAmount(item, amount)}
              />
            </div>
          ))}
        </section>
      ))}

      <section className="rounded-2xl bg-white shadow-card p-3 space-y-2" aria-label="수입 추가">
        <h2 className="font-semibold">수입 추가</h2>
        <select className="w-full rounded-lg border px-2 py-2" value={newType} onChange={(event) => setNewType(event.target.value as IncomeType)}>
          {INCOME_TYPES.map((type) => <option key={type} value={type}>{typeLabels[type]}</option>)}
        </select>
        <input
          className="w-full rounded-lg border px-2 py-2"
          placeholder="수입 이름"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
        />
        <input
          inputMode="numeric"
          className="w-full rounded-lg border px-2 py-2 text-right"
          placeholder="금액"
          value={newAmount}
          onChange={(event) => setNewAmount(event.target.value)}
        />
        <button className="w-full rounded-lg bg-brand px-3 py-2 text-white" onClick={() => void add()}>추가</button>
      </section>

      <section className="rounded-2xl bg-brand-soft p-4 text-sm">
        {formatYearMonth(yearMonth)} 수입합계 <b>{formatKRW(incomeTotal(items))}</b>
      </section>

      <section className="space-y-2" aria-label="수입 이력">
        <h2 className="font-semibold">수입 이력</h2>
        <div className="flex flex-wrap gap-2">
          {historyMonths.map((month) => (
            <button
              key={month}
              className={`rounded-full px-3 py-1 text-sm ${month === yearMonth ? 'bg-brand text-white' : 'bg-white text-gray-600 shadow-card'}`}
              onClick={() => setYearMonth(month)}
            >
              {formatYearMonth(month)}
            </button>
          ))}
        </div>
      </section>
      <BackupPanel />
    </main>
  );
}
