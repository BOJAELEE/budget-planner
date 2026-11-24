import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRepository } from '../data/RepositoryContext';
import { useHorizontalSwipe } from '../hooks/useHorizontalSwipe';
import type { FixedCost, CardMethod } from '../types';
import { CATEGORIES, PAYMENT_METHODS, TRANSFER_METHODS } from '../types';
import { BackupButton } from '../components/BackupButton';
import { FixedCostEditor, type FixedCostDraft } from '../components/FixedCostEditor';
import { MonthBar } from '../components/MonthBar';
import { formatKRW } from '../lib/format';
import { fixedCostsTotal, sortedFixedCosts, transferTotal } from '../lib/calc';
import { dateInKorea, formatYearMonth, nextYearMonth, previousYearMonth, shiftYearMonth } from '../lib/billing';

const blankDraft: FixedCostDraft = {
  paymentMethod: '신한카드', category: '구독', name: '', amount: 0,
  variability: '고정', active: true, sortOrder: 999,
};

const fixedCostCardFilters: readonly CardMethod[] = ['신한카드', '현대카드', '삼성카드'];
type FixedCostFilter = 'all' | CardMethod | 'transfer' | 'variable';
type FixedCostSortMode = 'category' | 'amount' | 'cardAmount' | 'categoryAmount' | 'default';

const filterOptions: { value: FixedCostFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'transfer', label: '현금이체' },
  { value: '현대카드', label: '현대' },
  { value: '신한카드', label: '신한' },
  { value: '삼성카드', label: '삼성' },
  { value: 'variable', label: '변동금액' },
];

export default function FixedCostsPage() {
  const repo = useRepository();
  const [yearMonth, setYearMonth] = useState(() => dateInKorea().slice(0, 7));
  const [items, setItems] = useState<FixedCost[]>([]);
  const [knownMonths, setKnownMonths] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [sortMode, setSortMode] = useState<FixedCostSortMode>('category');
  const [cardFilter, setCardFilter] = useState<FixedCostFilter>('all');
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);

  const load = useCallback(async () => {
    const [monthItems, allItems] = await Promise.all([
      repo.listFixedCosts(yearMonth),
      repo.listAllFixedCosts(),
    ]);
    setItems(monthItems);
    setKnownMonths(allItems.map((item) => item.yearMonth));
  }, [repo, yearMonth]);
  useEffect(() => {
    setCopyMessage(null);
    setCopyError(null);
    void load();
  }, [load]);

  const { handlers: swipeHandlers, swipe } = useHorizontalSwipe({
    onSwipeLeft: () => setYearMonth((current) => nextYearMonth(current)),
    onSwipeRight: () => setYearMonth((current) => previousYearMonth(current)),
  });

  const monthOptions = useMemo(() => {
    const todayMonth = dateInKorea().slice(0, 7);
    const nearby = Array.from({ length: 7 }, (_, index) => shiftYearMonth(todayMonth, index - 4));
    return [...new Set([
      yearMonth,
      previousYearMonth(yearMonth),
      nextYearMonth(yearMonth),
      ...nearby,
      ...knownMonths,
    ])];
  }, [knownMonths, yearMonth]);

  const copyPreviousMonth = async () => {
    const previousMonth = previousYearMonth(yearMonth);
    const confirmed = confirm(
      `${formatYearMonth(yearMonth)} 고정비를 모두 지우고 ${formatYearMonth(previousMonth)} 고정비로 전체 교체합니다. 계속할까요?`,
    );
    if (!confirmed) return;

    setCopying(true);
    setCopyMessage(null);
    setCopyError(null);
    try {
      const result = await repo.copyPreviousMonthFixedCosts(yearMonth);
      const message = result.copiedCount > 0
        ? `전월 고정비 ${result.copiedCount}개를 복사했습니다.`
        : '전월 고정비가 없어 현재 월 고정비를 비웠습니다.';
      setCopyMessage(message);
      await load();
      alert(message);
    } catch (error) {
      setCopyError(error instanceof Error ? error.message : '전월 고정비를 복사하지 못했습니다.');
    } finally {
      setCopying(false);
    }
  };

  const save = async (id: string | null, d: FixedCostDraft) => {
    if (id) await repo.updateFixedCost(id, d);
    else await repo.addFixedCost({ ...d, yearMonth });
    setEditingId(null); setAdding(false); await load();
  };
  const remove = async (id: string) => {
    if (confirm('삭제할까요?')) {
      await repo.deleteFixedCost(id);
      setEditingId(null);
      await load();
    }
  };

  const visibleItems = useMemo(() => items.filter(
    (item) => cardFilter === 'all'
      || (cardFilter === 'transfer' && (TRANSFER_METHODS as readonly string[]).includes(item.paymentMethod))
      || (cardFilter === 'variable' && item.variability === '변동')
      || ((fixedCostCardFilters as readonly string[]).includes(cardFilter) && item.paymentMethod === cardFilter),
  ), [items, cardFilter]);

  const groups = useMemo(() => {
    if (sortMode === 'amount') {
      return [{ label: '전체 고액순', items: sortedFixedCosts(visibleItems, true) }];
    }
    const groupBy = sortMode === 'category' || sortMode === 'categoryAmount'
      ? CATEGORIES.map((category) => ({
        label: category,
        items: sortedFixedCosts(visibleItems.filter((item) => item.category === category), sortMode === 'categoryAmount'),
      }))
      : PAYMENT_METHODS.map((method) => ({
        label: method,
        items: sortedFixedCosts(visibleItems.filter((item) => item.paymentMethod === method), sortMode === 'cardAmount'),
      }));
    return groupBy.filter((group) => group.items.length > 0);
  }, [sortMode, visibleItems]);

  const totalFixed = fixedCostsTotal(items);
  const totalTransfer = transferTotal(items);
  const totalCardFixed = totalFixed - totalTransfer;

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
        <div className="flex justify-between items-center gap-2">
          <h1 className="text-xl font-bold text-[#111827]">고정비</h1>
          <div className="flex gap-1.5">
            <button
              className="min-h-[38px] px-3 py-1 rounded-xl border border-[#d4d4d8] bg-white text-[#111827] text-xs font-bold hover:bg-[#f4f4f5]"
              type="button"
              disabled={copying}
              onClick={() => void copyPreviousMonth()}
            >
              {copying ? '복사 중...' : '전월 복사'}
            </button>
            <button
              type="button"
              className="min-h-[38px] px-3 py-1 rounded-xl bg-brand text-white text-xs font-bold"
              onClick={() => setAdding((current) => !current)}
            >
              {adding ? '닫기' : '+ 추가'}
            </button>
          </div>
        </div>
        <MonthBar
          value={yearMonth}
          options={monthOptions}
          onChange={setYearMonth}
          selectAriaLabel="고정비 월"
          rightSlot={<BackupButton />}
        />
      </div>

      <section className="rounded-2xl border border-[#e4e4e7] bg-white p-4 shadow-card space-y-3" aria-label="고정비 합계">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="font-semibold text-[#6b7280]">고정비 전체 합계</span>
          <b className="text-xl font-extrabold tabular-nums text-[#111827]">{formatKRW(totalFixed)}</b>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-[#e4e4e7] pt-3 text-xs">
          <div className="flex items-center justify-between rounded-xl bg-brand-soft px-3 py-2">
            <span className="font-semibold text-[#4b5563]">현금이체 합계</span>
            <b className="font-bold tabular-nums text-[#111827]">{formatKRW(totalTransfer)}</b>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-[#fafafa] px-3 py-2 border border-[#e4e4e7]">
            <span className="font-semibold text-[#4b5563]">카드 고정</span>
            <b className="font-bold tabular-nums text-[#111827]">{formatKRW(totalCardFixed)}</b>
          </div>
        </div>
      </section>

      {copyMessage && <p role="status" className="rounded-xl bg-brand-soft border border-[#d4d4d8] px-3 py-2 text-sm font-semibold text-[#111827]">{copyMessage}</p>}
      {copyError && <p role="alert" className="rounded-xl bg-[#fef2f2] border border-[#fecaca] px-3 py-2 text-sm font-semibold text-neg">{copyError}</p>}

      {adding && (
        <FixedCostEditor initial={blankDraft} onSave={(d) => save(null, d)} onCancel={() => setAdding(false)} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
        <div role="group" aria-label="카드사 필터" className="flex flex-wrap gap-1.5">
          {filterOptions.map((option) => {
            const active = cardFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => setCardFilter(option.value)}
                className={`min-h-[36px] rounded-full border px-3 py-1 transition ${
                  active
                    ? 'border-[#18181b] bg-[#18181b] text-white'
                    : 'border-[#e4e4e7] bg-white text-[#4b5563] hover:bg-[#f4f4f5]'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <select
          aria-label="고정비 정렬"
          className="min-h-[36px] rounded-full border border-[#e4e4e7] bg-white px-3 py-1 text-xs font-semibold text-[#111827]"
          value={sortMode}
          onChange={(event) => setSortMode(event.target.value as FixedCostSortMode)}
        >
          <option value="category">카테고리별</option>
          <option value="amount">전체 고액순</option>
          <option value="cardAmount">카드사별 고액순</option>
          <option value="categoryAmount">카테고리별 고액순</option>
          <option value="default">기본순</option>
        </select>
      </div>

      {groups.map(({ label, items: group }) => {
        const sum = group.filter((g) => g.active).reduce((a, g) => a + g.amount, 0);
        return (
          <div key={label} className="space-y-2">
            <div className="flex justify-between px-1 text-xs font-bold text-[#4b5563]">
              <span>{label}</span>
              <span className="tabular-nums">{formatKRW(sum)}</span>
            </div>
            <div className="space-y-2">
              {group.map((item) => editingId === item.id ? (
                <FixedCostEditor
                  key={item.id}
                  initial={item}
                  onSave={(d) => save(item.id, d)}
                  onCancel={() => setEditingId(null)}
                  onDelete={() => void remove(item.id)}
                />
              ) : (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setEditingId(item.id)}
                  className="flex w-full min-h-[54px] items-center justify-between gap-3 rounded-2xl border border-[#e4e4e7] bg-white shadow-card px-3.5 py-2.5 text-left transition hover:bg-[#fafafa]"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-[#111827]">
                      {item.name}
                      {item.variability === '변동' && (
                        <span className="ml-2 text-xs rounded-md bg-[#fef3c7] border border-[#fcd34d] text-[#92400e] px-1.5 py-0.5 font-bold">
                          변동
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-[#6b7280]">{item.paymentMethod} · {item.category} · 탭하여 수정</div>
                  </div>
                  <span className="shrink-0 font-bold text-sm tabular-nums text-[#111827]">{formatKRW(item.amount)} ›</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
      {items.length === 0 && !adding && (
        <p className="rounded-2xl border border-[#e4e4e7] bg-white px-4 py-4 text-sm text-gray-500 text-center">
          등록된 고정비가 없습니다. 전월 복사로 시작할 수 있습니다.
        </p>
      )}
    </main>
  );
}
