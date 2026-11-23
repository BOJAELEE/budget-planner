import { cardPaymentPlan, cardPaymentSalaryImpact } from '../lib/cardPaymentPlan';
import { formatYearMonth } from '../lib/billing';
import { formatKRW, formatSignedKRW } from '../lib/format';
import type { ScenarioView } from '../lib/dashboardScenarioView';

export function CardPaymentFunding({
  shortageAmount,
  remainingAmount = -Math.max(shortageAmount, 0),
  salaryDelta = 0,
  yearMonth,
  variant,
}: {
  shortageAmount: number;
  remainingAmount?: number;
  salaryDelta?: number;
  yearMonth: string;
  variant: ScenarioView;
}) {
  const plan = cardPaymentPlan(shortageAmount);
  const salaryImpact = cardPaymentSalaryImpact(shortageAmount, remainingAmount, salaryDelta);
  const transferSources = [
    { key: 'monthly', label: '월간 비상금', limit: '월간 비상금(26일 자동이체)', amount: plan.monthlyEmergencyUsed },
    { key: 'extra', label: '추가 충당', limit: '월급 여유 자금·월간 비상금 초과분', amount: plan.extraEmergencyNeeded },
  ];
  const note = plan.extraEmergencyNeeded > 0
    ? `월급 여유 자금(15만 원)·월간 비상금(50만 원) 외에 ${formatKRW(plan.extraEmergencyNeeded)}을 추가로 옮겨야 합니다.`
    : plan.totalNeeded > 0
      ? `월급통장에 남은 월급 여유 자금(${formatKRW(plan.reserveUsed)})과 사용하지 않은 월간 비상금은 포함하지 않았습니다.`
      : plan.reserveUsed > 0
        ? `월급통장에 남은 월급 여유 자금(${formatKRW(plan.reserveUsed)})으로 충당되어 이체할 금액이 없습니다.`
        : '현재 수입으로 결제할 수 있어 이체할 금액이 없습니다.';

  return (
    <section className="payment-funding" aria-label="카드결제 이체금">
      <header className="payment-funding-heading">
        <div>
          <p>{formatYearMonth(yearMonth)} · {variant === 'expected' ? '예상' : '실제'} 기준</p>
          <h2>카드결제 이체금</h2>
        </div>
        <span className="payment-funding-badge">월급 여유 자금 제외</span>
      </header>
      <div className="payment-funding-route" aria-label="이체 방향">
        <span>비상금통장</span><span aria-hidden="true">→</span><span>월급통장 (카드결제)</span>
      </div>
      <p className="payment-funding-description">
        현금이체 후 월급통장에 남은 월급 여유 자금(15만 원)은 이체 대상에서 제외하고, 부족한 금액만 비상금통장에서 옮깁니다.
      </p>
      <dl className="payment-funding-sources">
        <div className={`payment-funding-source payment-funding-source--reserve ${plan.reserveUsed === 0 ? 'payment-funding-source--unused' : ''}`}>
          <dt>
            <span className="payment-funding-step" aria-hidden="true">1</span>
            <span>월급 여유 자금<small>월급통장 정산 후 여유 자금(완충 자금)</small></span>
          </dt>
          <dd>{formatKRW(plan.reserveUsed)}</dd>
        </div>
        <div className="payment-funding-transfer-heading" aria-hidden="true">비상금통장에서 옮길 금액</div>
        {transferSources.map((source, index) => (
          <div key={source.key} className={`payment-funding-source payment-funding-source--${source.key} ${source.amount === 0 ? 'payment-funding-source--unused' : ''}`}>
            <dt>
              <span className="payment-funding-step" aria-hidden="true">{index + 2}</span>
              <span>{source.label}<small>{source.limit}</small></span>
            </dt>
            <dd>{formatKRW(source.amount)}</dd>
          </div>
        ))}
      </dl>
      {salaryDelta !== 0 && (
        <div
          className={`payment-funding-impact ${salaryImpact.transferDelta > 0 ? 'payment-funding-impact--more' : salaryImpact.transferDelta < 0 ? 'payment-funding-impact--less' : ''}`}
          aria-label="월급 변동 반영"
        >
          <div>
            <span>월급 변동 반영</span>
            <small>
              기준 월급 대비 {formatSignedKRW(salaryDelta)} · 기준 이체금 {formatKRW(salaryImpact.baselineTransferAmount)}
            </small>
          </div>
          <strong>
            {formatSignedKRW(salaryImpact.transferDelta)}
            <small>
              {salaryImpact.transferDelta < 0 ? '덜 옮김' : salaryImpact.transferDelta > 0 ? '더 옮김' : '이체 변동 없음'}
            </small>
          </strong>
        </div>
      )}
      <div className="payment-funding-total">
        <span>
          옮길 금액 합계
          <small>월간 비상금 + 추가 충당</small>
        </span>
        <strong>{formatKRW(plan.totalNeeded)}</strong>
      </div>
      <p className={`payment-funding-note ${plan.extraEmergencyNeeded > 0 ? 'payment-funding-note--extra' : ''}`}>
        {note}
      </p>
      <p className="payment-funding-disclaimer">이체할 금액의 안내입니다. 실제 이체·통장 차감은 자동으로 처리되지 않습니다.</p>
    </section>
  );
}
