import { useState } from 'react';
import { useBudget } from '../hooks/useBudget';
import { useRepository } from '../data/RepositoryContext';
import { StatCard } from '../components/StatCard';
import { AmountInput } from '../components/AmountInput';
import { CategoryDonut } from '../components/CategoryDonut';
import { CARD_METHODS } from '../types';
import { formatKRW } from '../lib/format';

const nowYearMonth = () => new Date().toISOString().slice(0, 7);

export default function DashboardPage() {
  const [yearMonth] = useState(nowYearMonth());
  const repo = useRepository();
  const { loading, derived, reload } = useBudget(yearMonth);

  if (loading) return <div className="p-8 text-center text-gray-400">불러오는 중…</div>;

  const onCommitActual = async (card: (typeof CARD_METHODS)[number], n: number) => {
    await repo.setActual(yearMonth, card, n);
    await reload();
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">{yearMonth.replace('-', '년 ')}월</h1>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="총 필요 예산" amount={derived.totalBudget} />
        <StatCard
          label="잔여금액"
          amount={derived.remaining}
          tone={derived.remaining < 0 ? 'neg' : 'pos'}
        />
      </div>

      <div className="rounded-2xl bg-white shadow-card p-4 space-y-4">
        <div className="text-sm text-gray-500">이번달 실제 카드값 입력</div>
        {CARD_METHODS.map((card) => (
          <div key={card} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{card}</span>
              <span className="text-gray-400">
                기준선 {formatKRW(derived.cardBaselines[card])}
              </span>
            </div>
            <AmountInput
              value={derived.actualByCard[card]}
              onCommit={(n) => onCommitActual(card, n)}
            />
            <div className="text-right text-xs">
              고정비 외 지출{' '}
              <span className={derived.extraByCard[card] > 0 ? 'text-neg font-semibold' : 'text-gray-400'}>
                {formatKRW(derived.extraByCard[card])}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white shadow-card p-4 text-sm text-gray-600">
        현금이체 합계 <b>{formatKRW(derived.transferSum)}</b> · 수입합계{' '}
        <b>{formatKRW(derived.incomeSum)}</b>
      </div>

      <CategoryDonut data={derived.breakdown} />
    </div>
  );
}
