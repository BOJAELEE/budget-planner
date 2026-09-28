import { useEffect, useMemo, useState } from 'react';
import { useRepository } from '../data/RepositoryContext';
import type { ExtraSpending, CardMethod } from '../types';
import { CARD_METHODS } from '../types';
import { AmountInput } from '../components/AmountInput';
import { formatKRW } from '../lib/format';
import { extraSpendingTotal, sortedExtraSpendings } from '../lib/calc';
import {
  billingCutoffDay, billingMonthFor, dateInKorea, defaultBillingYearMonth, formatYearMonth,
} from '../lib/billing';
import { BillingDatePicker } from '../components/BillingDatePicker';

export default function ExtraSpendingPage() {
  const repo = useRepository();
  const [allItems, setAllItems] = useState<ExtraSpending[]>([]);
  const [billingMonth, setBillingMonth] = useState(defaultBillingYearMonth);
  const [name, setName] = useState('');
  const [card, setCard] = useState<CardMethod>('현대카드');
  const [amount, setAmount] = useState(0);
  const [spentOn, setSpentOn] = useState(dateInKorea());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortByAmount, setSortByAmount] = useState(false);
  const [cardFilter, setCardFilter] = useState<CardMethod | 'all'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const load = async () => setAllItems(await repo.listAllExtraSpendings());
  useEffect(() => { void load(); }, [repo]);

  const months = useMemo(() => (
    [...new Set([billingMonth, defaultBillingYearMonth(), ...allItems.map((item) => item.yearMonth)])]
      .sort((a, b) => b.localeCompare(a))
  ), [allItems, billingMonth]);
  const items = useMemo(() => sortedExtraSpendings(
    allItems.filter((item) => item.yearMonth === billingMonth && (cardFilter === 'all' || item.card === cardFilter)), sortByAmount,
  ), [allItems, billingMonth, cardFilter, sortByAmount]);
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
  const toggleSettled = async (item: ExtraSpending) => {
    setBusyId(item.id);
    setStatusError(null);
    try {
      await repo.updateExtraSpending(item.id, { isSettled: !item.isSettled });
      await load();
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : '결재 상태를 저장하지 못했습니다.');
    } finally {
      setBusyId(null);
    }
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

      <div className="flex flex-wrap items-center justify-end gap-2 text-sm font-medium text-gray-600">
        <label className="flex items-center gap-2">
        목록 청구월
        <select
          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-gray-900"
          value={billingMonth}
          onChange={(event) => setBillingMonth(event.target.value)}
        >
          {months.map((month) => <option key={month} value={month}>{formatYearMonth(month)}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2">
          카드사
          <select
            aria-label="카드사 필터"
            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-gray-900"
            value={cardFilter}
            onChange={(event) => setCardFilter(event.target.value as CardMethod | 'all')}
          >
            <option value="all">전체</option>
            {CARD_METHODS.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <button
          type="button"
          aria-pressed={sortByAmount}
          aria-label={sortByAmount ? '최신순으로 정렬' : '고액순으로 정렬'}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-gray-700"
          onClick={() => setSortByAmount((value) => !value)}
        >
          {sortByAmount ? '최신순' : '고액순'}
        </button>
      </div>
      <p className="text-xs text-gray-500">결재완 항목은 기록에 남고 추가지출 합계에서는 제외됩니다.</p>
      {statusError && <p role="alert" className="text-sm text-neg">{statusError}</p>}

      {items.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-6">선택한 청구월에 추가지출이 없습니다.</p>
      ) : (
        items.map((item) => editingId === item.id ? (
          <ExtraRowEditor key={item.id} item={item} onSave={(patch) => saveEdit(item.id, patch)} onCancel={() => setEditingId(null)} />
        ) : (
          <article key={item.id} aria-label={item.name} className={`rounded-xl shadow-card px-3 py-2.5 space-y-2 ${item.isSettled ? 'bg-gray-50' : 'bg-white'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className={`font-medium break-words ${item.isSettled ? 'text-gray-500 line-through' : ''}`}>
                  {item.name}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-500">{item.card}</span>
                  <span>사용일 {item.spentOn} · 청구월 {formatYearMonth(item.yearMonth)}</span>
                </div>
              </div>
              <span className={`shrink-0 font-semibold tabular-nums ${item.isSettled ? 'text-gray-400 line-through' : 'text-neg'}`}>{formatKRW(item.amount)}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={item.isSettled ? 'rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-gray-600' : 'text-xs text-gray-400'}>
                {item.isSettled ? '결재완 · 합계 제외' : '합계 포함'}
              </span>
              <div className="flex items-center gap-3 text-sm">
                <button type="button" className="text-gray-500" onClick={() => setEditingId(item.id)}>수정</button>
                <button type="button" className="text-neg" onClick={() => remove(item.id)}>삭제</button>
                <button type="button" aria-pressed={item.isSettled} disabled={busyId === item.id}
                  className="rounded-lg border border-gray-200 px-2 py-1 text-gray-700 disabled:opacity-50"
                  onClick={() => void toggleSettled(item)}>{item.isSettled ? '완료 취소' : '결재완'}</button>
              </div>
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
