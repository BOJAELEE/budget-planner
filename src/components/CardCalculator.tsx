import { useEffect, useState } from 'react';
import { useRepository } from '../data/RepositoryContext';
import type { MonthlyCardActual, CardMethod } from '../types';
import { CARD_METHODS } from '../types';
import { AmountInput } from './AmountInput';
import { formatKRW } from '../lib/format';

/**
 * 독립 도구: 카드 청구 총액을 넣으면 "예상 필요 예산 = 현금이체 합계 + 카드값 합"을 보여준다.
 * 대시보드 본 숫자(추가지출 기반)에는 영향을 주지 않는다. 값은 monthly_card_actuals에 저장.
 */
export function CardCalculator({ yearMonth, transferSum }: { yearMonth: string; transferSum: number }) {
  const repo = useRepository();
  const [open, setOpen] = useState(false);
  const [actuals, setActuals] = useState<MonthlyCardActual[]>([]);

  const load = async () => setActuals(await repo.listActuals(yearMonth));
  useEffect(() => { void load(); }, [yearMonth]);

  const valueOf = (card: CardMethod) =>
    actuals.find((a) => a.paymentMethod === card)?.actualAmount ?? 0;
  const cardSum = actuals.reduce((a, x) => a + x.actualAmount, 0);

  const onCommit = async (card: CardMethod, n: number) => {
    await repo.setActual(yearMonth, card, n);
    await load();
  };

  return (
    <div className="rounded-2xl bg-white shadow-card p-4">
      <button
        className="w-full flex justify-between items-center text-sm font-medium text-gray-700"
        onClick={() => setOpen((v) => !v)}
      >
        <span>💳 카드값으로 빠른 계산</span>
        <span className="text-gray-400">{open ? '접기 ▲' : '펼치기 ▼'}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-gray-400">
            카드 청구 총액을 넣으면 필요 예산이 나옵니다. (대시보드 숫자와는 별개)
          </p>
          {CARD_METHODS.map((card) => (
            <div key={card} className="space-y-1">
              <div className="text-sm font-medium">{card}</div>
              <AmountInput value={valueOf(card)} onCommit={(n) => onCommit(card, n)} />
            </div>
          ))}
          <div className="rounded-xl bg-brand-soft p-3 text-sm">
            예상 필요 예산{' '}
            <b>{formatKRW(transferSum + cardSum)}</b>
            <div className="text-xs text-gray-500 mt-1">
              현금이체 합계 {formatKRW(transferSum)} + 카드값 {formatKRW(cardSum)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
