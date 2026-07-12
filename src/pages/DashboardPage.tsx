import { useState } from 'react';
import { useBudget } from '../hooks/useBudget';
import { StatCard } from '../components/StatCard';
import { CategoryDonut } from '../components/CategoryDonut';
import { CardCalculator } from '../components/CardCalculator';
import { CARD_METHODS } from '../types';
import { formatKRW } from '../lib/format';

const nowYearMonth = () => new Date().toISOString().slice(0, 7);

export default function DashboardPage() {
  const [yearMonth] = useState(nowYearMonth());
  const { loading, error, derived } = useBudget(yearMonth);

  if (loading) return <div className="p-8 text-center text-gray-400">불러오는 중…</div>;
  if (error) return (
    <div className="p-6 m-4 rounded-2xl bg-white shadow-card text-sm">
      <div className="font-semibold text-neg mb-2">데이터를 불러오지 못했습니다</div>
      <div className="text-gray-500 break-all">{error}</div>
      <div className="mt-3 text-gray-400">
        Supabase에 <b>extra_spendings</b> 테이블이 있는지 확인하세요.
      </div>
    </div>
  );

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

      <div className="rounded-2xl bg-white shadow-card p-4 space-y-3">
        <div className="text-sm text-gray-500">
          카드별 (고정비 기준선 · 이번달 추가지출)
        </div>
        {CARD_METHODS.map((card) => (
          <div key={card} className="flex justify-between items-center text-sm">
            <span className="font-medium">{card}</span>
            <span className="text-gray-500">
              기준선 {formatKRW(derived.cardBaselines[card])} ·{' '}
              추가지출{' '}
              <b className={derived.extraByCard[card] > 0 ? 'text-neg' : 'text-gray-400'}>
                {formatKRW(derived.extraByCard[card])}
              </b>
            </span>
          </div>
        ))}
        <div className="border-t border-gray-100 pt-2 flex justify-between text-sm">
          <span className="text-gray-500">이번달 추가지출 합계</span>
          <b className={derived.extraTotal > 0 ? 'text-neg' : 'text-gray-700'}>
            {formatKRW(derived.extraTotal)}
          </b>
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-card p-4 text-sm text-gray-600">
        전체 고정비 <b>{formatKRW(derived.fixedTotal)}</b> · 수입합계{' '}
        <b>{formatKRW(derived.incomeSum)}</b>
      </div>

      <CategoryDonut data={derived.breakdown} />

      <CardCalculator yearMonth={yearMonth} transferSum={derived.transferSum} />
    </div>
  );
}
