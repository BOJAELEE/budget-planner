import type { CSSProperties } from 'react';
import { displayPercentage } from '../lib/calc';
import { formatKRW } from '../lib/format';

export function FundingSummary({ availableAmount, remainingAmount }: {
  availableAmount: number;
  remainingAmount: number;
}) {
  // The headline includes overspending rather than capping it at the progress-bar limit.
  const usedAmount = availableAmount - remainingAmount;
  const isOver = remainingAmount < 0;
  const usedPercentage = Math.round(displayPercentage(usedAmount, availableAmount));
  const amounts = [availableAmount, usedAmount, remainingAmount].map((amount) => formatKRW(amount).replace('₩', ''));
  const longestAmount = Math.max(...amounts.map((amount) => amount.length));
  const numberSize = { '--funding-number-size': `${48 / longestAmount}cqw` } as CSSProperties;
  const status = isOver ? '예비자금보다 초과 사용'
    : remainingAmount === 0 ? '예비자금 전액 사용'
      : usedAmount < 0 ? '고정비보다 적게 사용한 금액 반영' : '예비자금 안에서 사용 중';

  return (
    <section className="funding-summary" aria-label="월별 자금 핵심 요약" style={numberSize}>
      <div className="funding-summary-heading">
        <h3>가장 먼저 확인할 금액</h3>
        <span>단위 원</span>
      </div>
      <dl className="funding-summary-metrics">
        <div>
          <dt>예비자금</dt>
          <dd>{amounts[0]}</dd>
        </div>
        <div>
          <dt>사용금액</dt>
          <dd>{amounts[1]}</dd>
        </div>
        <div className={isOver ? 'funding-summary-result funding-summary-result--over' : 'funding-summary-result'}>
          <dt>{isOver ? '초과금액' : '잔액'}</dt>
          <dd>{amounts[2]}</dd>
        </div>
      </dl>
      <div className={`funding-summary-footer ${isOver ? 'text-neg' : ''}`}>
        <span>{status}</span>
        <span>{usedPercentage}% 사용</span>
      </div>
    </section>
  );
}
