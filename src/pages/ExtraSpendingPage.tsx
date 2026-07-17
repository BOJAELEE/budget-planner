import { useEffect, useMemo, useState } from 'react';
import { useRepository } from '../data/RepositoryContext';
import type { ExtraSpending, CardMethod } from '../types';
import { CARD_METHODS } from '../types';
import { AmountInput } from '../components/AmountInput';
import { formatKRW } from '../lib/format';
import { extraSpendingTotal } from '../lib/calc';
import { billingCutoffDay, billingMonthFor, dateInKorea, formatYearMonth } from '../lib/billing';
import { BillingDatePicker } from '../components/BillingDatePicker';

const nowYearMonth = () => new Date().toISOString().slice(0, 7);

export default function ExtraSpendingPage() {
  const repo = useRepository();
  const [allItems, setAllItems] = useState<ExtraSpending[]>([]);
  const [billingMonth, setBillingMonth] = useState(nowYearMonth());
  const [name, setName] = useState('');
  const [card, setCard] = useState<CardMethod>('현대카드');
  const [amount, setAmount] = useState(0);
  const [spentOn, setSpentOn] = useState(dateInKorea());
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => setAllItems(await repo.listAllExtraSpendings());
  useEffect(() => { void load(); }, [repo]);

  const months = useMemo(() => (
    [...new Set([billingMonth, nowYearMonth(), ...allItems.map((item) => item.yearMonth)])]
      .sort((a, b) => b.localeCompare(a))
  ), [allItems, billingMonth]);
  const items = allItems.filter((item) => item.yearMonth === billingMonth);
  const calculatedBillingMonth = billingMonthFor(card, spentOn);
  const cutoffDay = billingCutoffDay(card);

  const add = async () => {
    if (!name.trim() || amount <= 0) return;
    await repo.addExtraSpending({ card, name: name.trim(), amount, spentOn });
    setName(''); setAmount(0); setCard('현대카드'); setSpentOn(dateInKorea());
    setBillingMonth(calculatedBillingMonth);
    await load();
  };
  const saveEdit = async (id: string, patch: { card: CardMethod; name: string; amount: number; spentOn: string }) => {
    await repo.updateExtraSpending(id, patch);
    setEditingId(null);
    setBillingMonth(billingMonthFor(patch.card, patch.spentOn));
    await load();
  };
  const remove = async (id: string) => {
    if (confirm('삭제할까요?')) { await repo.deleteExtraSpending(id); await load(); }
  };

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-xl font-bold">추가지출</h1>

      <section className="rounded-2xl bg-white shadow-card p-4 space-y-3" aria-label="추가지출 입력">
        <input
          className="w-full rounded-lg border border-gray-200 px-3 py-2"
          placeholder="내용 (예: 코스트코)"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            aria-label="카드사"
            className="rounded-lg border border-gray-200 px-2 py-2"
            value={card}
            onChange={(event) => setCard(event.target.value as CardMethod)}
          >
            {CARD_METHODS.map((value) => <option key={value}>{value}</option>)}
          </select>
          <BillingDatePicker card={card} value={spentOn} onChange={setSpentOn} />
        </div>
        <div><AmountInput value={amount} onCommit={setAmount} /></div>
        <p className="text-sm font-medium text-amber-300">{card}은 매월 {cutoffDay}일까지 다음 달 청구, 이후 사용분은 다다음 달 청구</p>
        <p className="text-xs text-gray-500">예상 청구월: <b>{formatYearMonth(calculatedBillingMonth)}</b></p>
        <button
          className="w-full rounded-lg bg-brand text-white py-2 disabled:opacity-40"
          disabled={!name.trim() || amount <= 0}
          onClick={add}
        >
          추가지출 기록
        </button>
      </section>

      <label className="flex items-center justify-end gap-2 text-sm font-medium text-gray-600">
        목록 청구월
        <select
          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-gray-900"
          value={billingMonth}
          onChange={(event) => setBillingMonth(event.target.value)}
        >
          {months.map((month) => <option key={month} value={month}>{formatYearMonth(month)}</option>)}
        </select>
      </label>

      {items.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-6">선택한 청구월에 추가지출이 없습니다.</p>
      ) : (
        items.map((item) => editingId === item.id ? (
          <ExtraRowEditor key={item.id} item={item} onSave={(patch) => saveEdit(item.id, patch)} onCancel={() => setEditingId(null)} />
        ) : (
          <article key={item.id} className="flex items-center justify-between rounded-xl bg-white shadow-card px-3 py-2">
            <div>
              <div className="font-medium">
                {item.name}
                <span className="ml-2 text-xs rounded bg-gray-100 text-gray-500 px-1.5 py-0.5">{item.card}</span>
              </div>
              <div className="text-xs text-gray-400">사용일 {item.spentOn} · 청구월 {formatYearMonth(item.yearMonth)}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-neg">{formatKRW(item.amount)}</span>
              <button className="text-gray-400 text-sm" onClick={() => setEditingId(item.id)}>수정</button>
              <button className="text-neg text-sm" onClick={() => remove(item.id)}>삭제</button>
            </div>
          </article>
        ))
      )}

      <div className="rounded-2xl bg-brand-soft p-4 text-sm">
        {formatYearMonth(billingMonth)} 추가지출 합계 <b>{formatKRW(extraSpendingTotal(items))}</b>
      </div>
    </main>
  );
}

function ExtraRowEditor({
  item, onSave, onCancel,
}: {
  item: ExtraSpending;
  onSave: (patch: { card: CardMethod; name: string; amount: number; spentOn: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [card, setCard] = useState<CardMethod>(item.card);
  const [amount, setAmount] = useState(item.amount);
  const [spentOn, setSpentOn] = useState(item.spentOn);
  const nextBillingMonth = billingMonthFor(card, spentOn);

  return (
    <section className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
      <input className="w-full rounded-lg border px-2 py-1" value={name} onChange={(event) => setName(event.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <select className="rounded-lg border px-2 py-1" value={card} onChange={(event) => setCard(event.target.value as CardMethod)}>
          {CARD_METHODS.map((value) => <option key={value}>{value}</option>)}
        </select>
        <BillingDatePicker card={card} value={spentOn} onChange={setSpentOn} />
      </div>
      <AmountInput value={amount} onCommit={setAmount} />
      <p className="text-xs text-gray-500">예상 청구월: {formatYearMonth(nextBillingMonth)}</p>
      <div className="flex gap-2 justify-end">
        <button className="px-3 py-1 text-gray-500" onClick={onCancel}>취소</button>
        <button className="px-3 py-1 rounded-lg bg-brand text-white" onClick={() => onSave({ card, name: name.trim(), amount, spentOn })}>저장</button>
      </div>
    </section>
  );
}
