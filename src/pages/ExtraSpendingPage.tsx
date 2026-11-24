import { useEffect, useMemo, useState } from 'react';
import { useRepository } from '../data/RepositoryContext';
import { useHorizontalSwipe } from '../hooks/useHorizontalSwipe';
import type { ExtraSpending, CardMethod } from '../types';
import { CARD_METHODS } from '../types';
import { AmountInput } from '../components/AmountInput';
import { BackupButton } from '../components/BackupButton';
import { BillingDatePicker } from '../components/BillingDatePicker';
import { MonthBar } from '../components/MonthBar';
import { formatKRW } from '../lib/format';
import { extraSpendingTotal, sortedExtraSpendings } from '../lib/calc';
import {
  billingCutoffDay, billingMonthFor, billingMonthFromBudgetMonth, budgetMonthFromBillingMonth,
  dateInKorea, defaultBudgetYearMonth, formatYearMonth, nextYearMonth, previousYearMonth,
} from '../lib/billing';

export default function ExtraSpendingPage() {
  const repo = useRepository();
  const [allItems, setAllItems] = useState<ExtraSpending[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(defaultBudgetYearMonth);
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

  const { handlers: swipeHandlers, swipe } = useHorizontalSwipe({
    onSwipeLeft: () => setSelectedMonth((current) => nextYearMonth(current)),
    onSwipeRight: () => setSelectedMonth((current) => previousYearMonth(current)),
  });

  const selectedBillingMonth = billingMonthFromBudgetMonth(selectedMonth);
  const months = useMemo(() => (
    [...new Set([
      selectedMonth,
      defaultBudgetYearMonth(),
      ...allItems.map((item) => budgetMonthFromBillingMonth(item.yearMonth)),
    ])].sort((a, b) => b.localeCompare(a))
  ), [allItems, selectedMonth]);
  const items = useMemo(() => sortedExtraSpendings(
    allItems.filter((item) => item.yearMonth === selectedBillingMonth && (cardFilter === 'all' || item.card === cardFilter)), sortByAmount,
  ), [allItems, selectedBillingMonth, cardFilter, sortByAmount]);
  const unsettledCount = useMemo(() => items.filter((item) => !item.isSettled).length, [items]);
  const calculatedBillingMonth = billingMonthFor(card, spentOn);
  const calculatedBudgetMonth = budgetMonthFromBillingMonth(calculatedBillingMonth);
  const cutoffDay = billingCutoffDay(card);

  const add = async () => {
    if (!name.trim() || amount <= 0) return;
    await repo.addExtraSpending({ card, name: name.trim(), amount, spentOn });
    setName(''); setAmount(0); setCard('현대카드'); setSpentOn(dateInKorea());
    setSelectedMonth(calculatedBudgetMonth);
    await load();
  };
  const saveEdit = async (id: string, patch: { card: CardMethod; name: string; amount: number; spentOn: string }) => {
    await repo.updateExtraSpending(id, patch);
    setEditingId(null);
    setSelectedMonth(budgetMonthFromBillingMonth(billingMonthFor(patch.card, patch.spentOn)));
    await load();
  };
  const remove = async (id: string) => {
    if (confirm('삭제할까요?')) {
      await repo.deleteExtraSpending(id);
      setEditingId(null);
      await load();
    }
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
    <main
      className="dashboard-swipe-area p-4 space-y-4"
      style={swipe.offsetX !== 0 ? { transform: `translateX(${swipe.offsetX}px)` } : undefined}
      {...swipeHandlers}
    >
      {swipe.direction !== null && (
        <div
          role="status"
          aria-live="polite"
          className={`dashboard-swipe-pill ${swipe.ready ? 'dashboard-swipe-pill--ready' : ''}`}
        >
          {swipe.direction === 'prev'
            ? `← ${formatYearMonth(previousYearMonth(selectedMonth))}`
            : `${formatYearMonth(nextYearMonth(selectedMonth))} →`}
        </div>
      )}

      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#111827]">추가지출</h1>
          <span className="text-xs font-medium text-[#6b7280]">결재완 항목은 합계 제외</span>
        </div>
        <MonthBar
          value={selectedMonth}
          options={months}
          onChange={setSelectedMonth}
          selectAriaLabel="목록 월"
          rightSlot={<BackupButton />}
        />
      </div>

      <div className="rounded-2xl border border-[#e4e4e7] bg-brand-soft px-4 py-3.5 flex items-center justify-between gap-2">
        <div className="text-sm text-[#111827]">
          <span className="block text-xs font-semibold text-[#6b7280]">{formatYearMonth(selectedMonth)} 추가지출 합계</span>
          <b className="mt-0.5 block text-xl font-extrabold tabular-nums">{formatKRW(extraSpendingTotal(items))}</b>
        </div>
        <span className="rounded-full border border-[#e4e4e7] bg-white px-2.5 py-1 text-xs font-bold text-[#111827]">
          미완료 {unsettledCount}건
        </span>
      </div>

      <section className="rounded-2xl border border-[#e4e4e7] bg-white shadow-card p-4 space-y-3" aria-label="추가지출 입력">
        <input
          className="min-h-[44px] w-full rounded-xl border border-[#d4d4d8] px-3 py-2 text-sm"
          placeholder="내용 (예: 코스트코)"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <div role="group" aria-label="카드사" className="grid grid-cols-3 gap-2">
          {CARD_METHODS.map((value) => {
            const selected = card === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => setCard(value)}
                className={`min-h-[44px] rounded-xl border text-sm font-bold transition ${
                  selected
                    ? 'border-[#18181b] bg-[#18181b] text-white'
                    : 'border-[#e4e4e7] bg-white text-[#4b5563] hover:bg-[#f4f4f5]'
                }`}
              >
                {value.replace('카드', '')}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[140px] flex-1">
            <BillingDatePicker card={card} value={spentOn} onChange={setSpentOn} />
          </div>
          <span className="shrink-0 rounded-xl border border-[#fcd34d] bg-[#fef3c7] px-2.5 py-2 text-xs font-bold text-[#92400e]">
            {formatYearMonth(calculatedBudgetMonth)} 반영 · 마감 {cutoffDay}일
          </span>
        </div>
        <div><AmountInput value={amount} onCommit={setAmount} /></div>
        <button
          type="button"
          className="w-full min-h-[48px] rounded-xl bg-brand text-white font-bold text-sm disabled:opacity-40"
          disabled={!name.trim() || amount <= 0}
          onClick={add}
        >
          추가지출 기록
        </button>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
        <div role="group" aria-label="카드사 필터" className="flex flex-wrap gap-1.5">
          {(['all', ...CARD_METHODS] as const).map((value) => {
            const active = cardFilter === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => setCardFilter(value)}
                className={`min-h-[36px] rounded-full border px-3 py-1 transition ${
                  active
                    ? 'border-[#18181b] bg-[#18181b] text-white'
                    : 'border-[#e4e4e7] bg-white text-[#4b5563] hover:bg-[#f4f4f5]'
                }`}
              >
                {value === 'all' ? '전체' : value.replace('카드', '')}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          aria-pressed={sortByAmount}
          aria-label={sortByAmount ? '최신순으로 정렬' : '고액순으로 정렬'}
          className="min-h-[36px] rounded-full border border-[#e4e4e7] bg-white px-3 py-1 text-[#4b5563] hover:bg-[#f4f4f5]"
          onClick={() => setSortByAmount((value) => !value)}
        >
          {sortByAmount ? '고액순 ↓' : '최신순 ↓'}
        </button>
      </div>

      {statusError && <p role="alert" className="text-sm text-neg">{statusError}</p>}

      {items.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-6">선택한 월에 추가지출이 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => editingId === item.id ? (
            <ExtraRowEditor
              key={item.id}
              item={item}
              onSave={(patch) => saveEdit(item.id, patch)}
              onDelete={() => void remove(item.id)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <article
              key={item.id}
              aria-label={item.name}
              className={`rounded-2xl border border-[#e4e4e7] shadow-card px-3.5 py-3 flex items-center justify-between gap-2.5 ${
                item.isSettled ? 'bg-[#fafafa] opacity-75' : 'bg-white'
              }`}
            >
              <button
                type="button"
                aria-label={`${item.name} 수정`}
                onClick={() => setEditingId(item.id)}
                className="min-w-0 flex-1 min-h-[48px] text-left space-y-1"
              >
                <div className={`font-semibold text-sm break-words ${item.isSettled ? 'text-gray-500 line-through' : 'text-[#111827]'}`}>
                  {item.name}
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#6b7280]">
                  <span className="rounded bg-[#f4f4f5] px-1.5 py-0.5 font-semibold text-[#374151]">{item.card}</span>
                  <span>사용일 {item.spentOn} · 반영월 {formatYearMonth(budgetMonthFromBillingMonth(item.yearMonth))}</span>
                  <span className={item.isSettled ? 'font-semibold text-[#15803d]' : ''}>
                    {item.isSettled ? '결재완 · 합계 제외' : '합계 포함'}
                  </span>
                </div>
              </button>
              <div className="flex shrink-0 items-center gap-2">
                <span className={`font-bold text-sm tabular-nums ${item.isSettled ? 'text-gray-400 line-through' : 'text-neg'}`}>
                  {formatKRW(item.amount)}
                </span>
                <button
                  type="button"
                  aria-pressed={item.isSettled}
                  disabled={busyId === item.id}
                  className={`min-h-[40px] rounded-xl border px-2.5 py-1.5 text-xs font-bold disabled:opacity-50 ${
                    item.isSettled
                      ? 'border-[#bbf7d0] bg-[#dcfce7] text-[#15803d]'
                      : 'border-[#e4e4e7] bg-white text-[#4b5563] hover:bg-[#f4f4f5]'
                  }`}
                  onClick={() => void toggleSettled(item)}
                >
                  {item.isSettled ? '완료 취소' : '결재완'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

function ExtraRowEditor({
  item, onSave, onDelete, onCancel,
}: {
  item: ExtraSpending;
  onSave: (patch: { card: CardMethod; name: string; amount: number; spentOn: string }) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [card, setCard] = useState<CardMethod>(item.card);
  const [amount, setAmount] = useState(item.amount);
  const [spentOn, setSpentOn] = useState(item.spentOn);
  const nextBillingMonth = billingMonthFor(card, spentOn);

  return (
    <section className="rounded-2xl border border-[#d4d4d8] bg-[#fafafa] p-3.5 space-y-2.5" aria-label={`${item.name} 편집`}>
      <input
        className="min-h-[42px] w-full rounded-xl border border-[#d4d4d8] px-3 py-1.5 text-sm"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <div role="group" aria-label="수정 카드사" className="grid grid-cols-3 gap-1.5">
        {CARD_METHODS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={card === value}
            onClick={() => setCard(value)}
            className={`min-h-[40px] rounded-xl border text-xs font-bold ${
              card === value
                ? 'border-[#18181b] bg-[#18181b] text-white'
                : 'border-[#e4e4e7] bg-white text-[#4b5563]'
            }`}
          >
            {value.replace('카드', '')}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[130px] flex-1">
          <BillingDatePicker card={card} value={spentOn} onChange={setSpentOn} />
        </div>
        <span className="shrink-0 rounded-xl border border-[#fcd34d] bg-[#fef3c7] px-2.5 py-2 text-xs font-bold text-[#92400e]">
          {formatYearMonth(budgetMonthFromBillingMonth(nextBillingMonth))} 반영
        </span>
      </div>
      <AmountInput value={amount} onCommit={setAmount} />
      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          type="button"
          className="min-h-[40px] rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-1.5 text-sm font-semibold text-neg"
          onClick={onDelete}
        >
          삭제
        </button>
        <div className="flex gap-2">
          <button type="button" className="min-h-[40px] rounded-xl px-3 py-1.5 text-sm font-semibold text-gray-600" onClick={onCancel}>
            취소
          </button>
          <button
            type="button"
            className="min-h-[40px] rounded-xl bg-brand px-4 py-1.5 text-sm font-bold text-white"
            onClick={() => onSave({ card, name: name.trim(), amount, spentOn })}
          >
            저장
          </button>
        </div>
      </div>
    </section>
  );
}
