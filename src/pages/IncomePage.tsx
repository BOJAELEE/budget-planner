import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRepository } from '../data/RepositoryContext';
import { useHorizontalSwipe } from '../hooks/useHorizontalSwipe';
import { INCOME_TYPES, type Income, type IncomeType } from '../types';
import { AmountInput } from '../components/AmountInput';
import { BackupButton } from '../components/BackupButton';
import { MonthBar } from '../components/MonthBar';
import { formatKRW, parseAmount } from '../lib/format';
import { incomeTotal } from '../lib/calc';
import { dateInKorea, formatYearMonth, nextYearMonth, previousYearMonth } from '../lib/billing';

const typeLabels: Record<IncomeType, string> = {
  고정수입: '고정수입', 변동수입: '변동수입', 기타수입: '기타수입',
};

export default function IncomePage() {
  const repo = useRepository();
  const [yearMonth, setYearMonth] = useState(() => dateInKorea().slice(0, 7));
  const [items, setItems] = useState<Income[]>([]);
  const [allItems, setAllItems] = useState<Income[]>([]);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newType, setNewType] = useState<IncomeType>('변동수입');

  const load = useCallback(async () => {
    const [monthItems, history] = await Promise.all([
      repo.listIncomes(yearMonth), repo.listAllIncomes(),
    ]);
    setItems(monthItems);
    setAllItems(history);
  }, [repo, yearMonth]);
  useEffect(() => { void load(); }, [load]);

  const { handlers: swipeHandlers, swipe } = useHorizontalSwipe({
    onSwipeLeft: () => setYearMonth((current) => nextYearMonth(current)),
    onSwipeRight: () => setYearMonth((current) => previousYearMonth(current)),
  });

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
    setAdding(false);
    await load();
  };

  const setAmount = async (item: Income, amount: number) => {
    if (item.type === '고정수입' && item.templateId) {
      await repo.setFixedIncome(yearMonth, item.templateId, amount);
    } else {
      await repo.updateIncome(item.id, { amount });
    }
    setEditingId(null);
    await load();
  };

  const remove = async (item: Income) => {
    if (!confirm('삭제할까요?')) return;
    if (item.type === '고정수입' && item.templateId) {
      await repo.updateIncomeTemplate(item.templateId, { active: false });
    } else {
      await repo.deleteIncome(item.id);
    }
    setEditingId(null);
    await load();
  };

  const byType = useMemo(() => Object.fromEntries(
    INCOME_TYPES.map((type) => [type, items.filter((item) => item.type === type)]),
  ) as Record<IncomeType, Income[]>, [items]);
  const populatedTypes = useMemo(
    () => INCOME_TYPES.filter((type) => byType[type].length > 0),
    [byType],
  );
  const historyMonths = useMemo(() => (
    [...new Set([
      yearMonth,
      previousYearMonth(yearMonth),
      nextYearMonth(yearMonth),
      ...allItems.map((item) => item.yearMonth),
    ])].sort((a, b) => b.localeCompare(a))
  ), [allItems, yearMonth]);

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
            ? `← ${formatYearMonth(previousYearMonth(yearMonth))}`
            : `${formatYearMonth(nextYearMonth(yearMonth))} →`}
        </div>
      )}

      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-[#111827]">월별 수입</h1>
          <button
            type="button"
            className="min-h-[38px] rounded-xl bg-brand px-3.5 py-1.5 text-xs font-bold text-white"
            onClick={() => setAdding((current) => !current)}
          >
            {adding ? '닫기' : '+ 추가'}
          </button>
        </div>
        <MonthBar
          value={yearMonth}
          options={historyMonths}
          onChange={setYearMonth}
          selectAriaLabel="수입월"
          rightSlot={<BackupButton />}
        />
      </div>

      <section className="rounded-2xl border border-[#e4e4e7] bg-brand-soft px-4 py-3.5 flex items-center justify-between gap-2" aria-label="수입 합계">
        <div>
          <span className="block text-xs font-semibold text-[#6b7280]">{formatYearMonth(yearMonth)} 수입합계</span>
          <b className="mt-0.5 block text-xl font-extrabold tabular-nums text-[#111827]">{formatKRW(incomeTotal(items))}</b>
        </div>
        <span className="rounded-full border border-[#e4e4e7] bg-white px-2.5 py-1 text-xs font-bold text-[#111827]">
          {items.length}건
        </span>
      </section>

      {adding && (
        <section className="rounded-2xl border border-[#d4d4d8] bg-white shadow-card p-4 space-y-3" aria-label="수입 추가">
          <h2 className="text-sm font-bold text-[#111827]">새 수입 추가</h2>
          <div role="group" aria-label="수입 유형" className="grid grid-cols-3 gap-1.5">
            {INCOME_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                aria-pressed={newType === type}
                onClick={() => setNewType(type)}
                className={`min-h-[40px] rounded-xl border text-xs font-bold ${
                  newType === type
                    ? 'border-[#18181b] bg-[#18181b] text-white'
                    : 'border-[#e4e4e7] bg-white text-[#4b5563]'
                }`}
              >
                {typeLabels[type]}
              </button>
            ))}
          </div>
          <input
            className="min-h-[42px] w-full rounded-xl border border-[#d4d4d8] px-3 py-2 text-sm"
            placeholder="수입 이름"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
          <input
            inputMode="numeric"
            className="min-h-[42px] w-full rounded-xl border border-[#d4d4d8] px-3 py-2 text-right text-sm font-semibold tabular-nums"
            placeholder="금액"
            value={newAmount}
            onChange={(event) => setNewAmount(event.target.value)}
          />
          <button
            type="button"
            className="w-full min-h-[44px] rounded-xl bg-brand px-3 py-2 text-sm font-bold text-white"
            onClick={() => void add()}
          >
            추가
          </button>
        </section>
      )}

      {populatedTypes.length === 0 ? (
        <p className="rounded-2xl border border-[#e4e4e7] bg-white px-4 py-5 text-center text-sm text-gray-500">
          등록된 수입이 없습니다. 상단 + 추가 버튼으로 등록해 보세요.
        </p>
      ) : populatedTypes.map((type) => (
        <section key={type} className="space-y-2" aria-label={typeLabels[type]}>
          <div className="flex items-baseline justify-between px-1">
            <h2 className="text-xs font-bold text-[#4b5563]">{typeLabels[type]}</h2>
            <span className="text-xs font-bold tabular-nums text-[#6b7280]">{formatKRW(incomeTotal(byType[type]))}</span>
          </div>
          <div className="space-y-2">
            {byType[type].map((item) => editingId === item.id ? (
              <div key={item.id} className="rounded-2xl border border-[#d4d4d8] bg-[#fafafa] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#111827]">{item.name}</span>
                  <button
                    type="button"
                    className="min-h-[34px] rounded-lg px-2.5 text-xs font-semibold text-gray-600"
                    onClick={() => setEditingId(null)}
                  >
                    닫기
                  </button>
                </div>
                <AmountInput
                  value={item.amount}
                  ariaLabel={`${item.name} 금액`}
                  onCommit={(amount) => void setAmount(item, amount)}
                />
                <div className="flex justify-start">
                  <button
                    type="button"
                    className="min-h-[38px] rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-1 text-xs font-semibold text-neg"
                    onClick={() => void remove(item)}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ) : (
              <button
                key={item.id}
                type="button"
                onClick={() => setEditingId(item.id)}
                className="flex w-full min-h-[54px] items-center justify-between gap-3 rounded-2xl border border-[#e4e4e7] bg-white shadow-card px-3.5 py-2.5 text-left transition hover:bg-[#fafafa]"
              >
                <div>
                  <div className="font-semibold text-sm text-[#111827]">{item.name}</div>
                  <div className="mt-0.5 text-xs text-[#6b7280]">탭하여 금액 수정</div>
                </div>
                <span className="font-bold text-sm tabular-nums text-[#111827]">{formatKRW(item.amount)} ›</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
