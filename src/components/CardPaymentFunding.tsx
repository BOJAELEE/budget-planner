import { cardPaymentPlan } from '../lib/cardPaymentPlan';
import { formatYearMonth } from '../lib/billing';
import { formatKRW } from '../lib/format';
import type { ScenarioView } from '../lib/dashboardScenarioView';

export function CardPaymentFunding({ shortageAmount, yearMonth, variant }: {
  shortageAmount: number;
  yearMonth: string;
  variant: ScenarioView;
}) {
  const plan = cardPaymentPlan(shortageAmount);
  const sources = [
    { key: 'savings', label: '저축분 사용', limit: '저축액 15만 원 중', amount: plan.savingsUsed },
    { key: 'monthly', label: '월 비상금 사용', limit: '월 정액 50만 원 중', amount: plan.monthlyEmergencyUsed },
    { key: 'extra', label: '추가 충당', limit: '15만 원·50만 원 초과분', amount: plan.extraEmergencyNeeded },
  ];

  return (
    <section className="payment-funding" aria-label="카드결제 이체금">
      <header className="payment-funding-heading">
        <div>
          <p>{formatYearMonth(yearMonth)} · {variant === 'expected' ? '예상' : '실제'} 기준</p>
          <h2>카드결제 이체금</h2>
        </div>
        <span className="payment-funding-badge">여유자금 제외</span>
      </header>
      <div className="payment-funding-route" aria-label="이체 방향">
        <span>비상금통장</span><span aria-hidden="true">→</span><span>카드결제 통장</span>
      </div>
      <p className="payment-funding-description">15만 원 저축분도 비상금통장에 있는 기준입니다. 카드결제 통장에 남은 여유자금은 제외했어요.</p>
      <dl className="payment-funding-sources">
        {sources.map((source, index) => (
          <div key={source.key} className={`payment-funding-source payment-funding-source--${source.key} ${source.amount === 0 ? 'payment-funding-source--unused' : ''}`}>
            <dt>
              <span className="payment-funding-step" aria-hidden="true">{index + 1}</span>
              <span>{source.label}<small>{source.limit}</small></span>
            </dt>
            <dd>{formatKRW(source.amount)}</dd>
          </div>
        ))}
      </dl>
      <div className="payment-funding-total">
        <span>옮길 금액 합계</span>
        <strong>{formatKRW(plan.totalNeeded)}</strong>
      </div>
      <p className={`payment-funding-note ${plan.extraEmergencyNeeded > 0 ? 'payment-funding-note--extra' : ''}`}>
        {plan.extraEmergencyNeeded > 0
          ? `월 15만 원·50만 원 외에 ${formatKRW(plan.extraEmergencyNeeded)}을 추가로 옮겨야 합니다.`
          : plan.totalNeeded === 0 ? '현재 수입으로 결제할 수 있어 이체할 금액이 없습니다.' : '사용하지 않은 저축분과 월 비상금은 포함하지 않았습니다.'}
      </p>
      <p className="payment-funding-disclaimer">이체할 금액의 안내입니다. 실제 이체·통장 차감은 자동으로 처리되지 않습니다.</p>
    </section>
  );
}
