import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CardPaymentFunding } from './CardPaymentFunding';

describe('CardPaymentFunding', () => {
  it('excludes salary reserve and monthly auto-transfer emergency fund from the transfer total', () => {
    render(<CardPaymentFunding shortageAmount={441268} yearMonth="2026-11" variant="actual" />);
    const funding = screen.getByRole('region', { name: '카드결제 이체금' });
    expect(within(funding).getByText('2026년 11월 · 실제 기준')).toBeInTheDocument();
    expect(within(funding).getByText('월급 여유 자금').closest('dt')?.nextElementSibling).toHaveTextContent('₩150,000');
    expect(within(funding).getByText('월간 비상금').closest('dt')?.nextElementSibling).toHaveTextContent('₩291,268');
    expect(within(funding).getByText('추가 지출').closest('dt')?.nextElementSibling).toHaveTextContent('₩0');
    expect(within(funding).getByText('옮길 금액 합계').closest('div')?.querySelector('strong')).toHaveTextContent('₩0');
    expect(within(funding).getByText('월급 여유 자금·월간 비상금 제외')).toBeInTheDocument();
    expect(within(funding).getByLabelText('이체 방향')).toHaveTextContent('비상금통장→월급통장 (카드결제)');
    expect(within(funding).getByText(/월급 여유 자금\(15만 원\)과 26일 자동이체되는 월간 비상금\(50만 원\)은 제외/)).toBeInTheDocument();
    expect(within(funding).getByText('월급 여유 자금(₩150,000)과 월간 비상금(₩291,268, 26일 자동이체)으로 충당되어 추가로 옮길 금액이 없습니다.')).toBeInTheDocument();
    expect(within(funding).queryByText(/예비자금|여유자금|추가 충당/)).not.toBeInTheDocument();
    expect(within(funding).getByText('월급통장 정산 후 여유 자금(완충 자금)')).toBeInTheDocument();
    expect(within(funding).getByText('월간 비상금(26일 자동이체)')).toBeInTheDocument();
  });

  it('highlights an amount needed beyond the 150,000 and 500,000 won allowances', () => {
    render(<CardPaymentFunding shortageAmount={1516084} yearMonth="2026-12" variant="expected" />);
    expect(screen.getByText('월급 여유 자금').closest('dt')?.nextElementSibling).toHaveTextContent('₩150,000');
    expect(screen.getByText('월간 비상금').closest('dt')?.nextElementSibling).toHaveTextContent('₩500,000');
    const extra = screen.getByText('추가 지출').closest('dt');
    expect(extra?.nextElementSibling).toHaveTextContent('₩866,084');
    expect(extra?.parentElement).toHaveClass('payment-funding-source--extra');
    expect(screen.getByText('월급 여유 자금(15만 원)·월간 비상금(50만 원, 26일 자동이체) 외에 ₩866,084을 추가로 옮겨야 합니다.')).toHaveClass('payment-funding-note--extra');
    expect(screen.getByText('옮길 금액 합계').closest('div')?.querySelector('strong')).toHaveTextContent('₩866,084');
  });

  it('shows zero transfer needed when the reserve in the salary account covers the shortage', () => {
    render(<CardPaymentFunding shortageAmount={120000} yearMonth="2026-11" variant="expected" />);
    expect(screen.getByText('월급 여유 자금').closest('dt')?.nextElementSibling).toHaveTextContent('₩120,000');
    expect(screen.getByText('월간 비상금').closest('dt')?.nextElementSibling).toHaveTextContent('₩0');
    expect(screen.getByText('추가 지출').closest('dt')?.nextElementSibling).toHaveTextContent('₩0');
    expect(screen.getByText('옮길 금액 합계').closest('div')?.querySelector('strong')).toHaveTextContent('₩0');
    expect(screen.getByText('월급통장에 남은 월급 여유 자금(₩120,000)으로 충당되어 추가로 옮길 금액이 없습니다.')).toBeInTheDocument();
  });

  it('keeps all three categories visible at zero without implying a transfer is needed', () => {
    render(<CardPaymentFunding shortageAmount={0} yearMonth="2026-11" variant="expected" />);
    expect(screen.getAllByRole('term')).toHaveLength(3);
    expect(screen.getAllByRole('definition').every((amount) => amount.textContent === '₩0')).toBe(true);
    expect(screen.getByText('현재 수입으로 결제할 수 있어 추가로 옮길 금액이 없습니다.')).toBeInTheDocument();
    expect(screen.queryByLabelText('월급 변동 반영')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('수입·고정비 차액')).not.toBeInTheDocument();
  });

  it('shows step 3 extra spending beyond 650,000 won above step 4 income-fixed cost gap', () => {
    const { rerender } = render(
      <CardPaymentFunding
        shortageAmount={1_516_084}
        additionalSpending={1_515_926}
        incomeSum={5_610_000}
        fixedTotal={5_610_158}
        yearMonth="2026-11"
        variant="expected"
      />,
    );
    expect(screen.getAllByRole('term')).toHaveLength(4);
    const step3 = screen.getByText('추가 지출').closest('dt');
    expect(step3?.nextElementSibling).toHaveTextContent('₩865,926');
    const deficitGap = screen.getByLabelText('수입·고정비 차액');
    expect(step3!.compareDocumentPosition(deficitGap) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(deficitGap).toHaveClass('payment-funding-source--gap-deficit');
    expect(deficitGap).toHaveTextContent('4');
    expect(deficitGap).toHaveTextContent('수입 ₩5,610,000 − 고정비 ₩5,610,158 · 고정비 초과분 포함');
    expect(deficitGap).toHaveTextContent('-₩158');
    expect(deficitGap).toHaveTextContent('고정비 초과');
    expect(screen.getByText('옮길 금액 합계').closest('div')?.querySelector('strong')).toHaveTextContent('₩866,084');

    rerender(
      <CardPaymentFunding
        shortageAmount={1_316_084}
        additionalSpending={1_515_926}
        incomeSum={5_810_000}
        fixedTotal={5_610_158}
        yearMonth="2026-11"
        variant="expected"
      />,
    );
    const surplusGap = screen.getByLabelText('수입·고정비 차액');
    expect(surplusGap).toHaveClass('payment-funding-source--gap-surplus');
    expect(surplusGap).toHaveTextContent('수입 ₩5,810,000 − 고정비 ₩5,610,158 · 수입 여유분 반영');
    expect(surplusGap).toHaveTextContent('+₩199,842');
    expect(surplusGap).toHaveTextContent('수입 여유');

    rerender(
      <CardPaymentFunding
        shortageAmount={1_515_926}
        additionalSpending={1_515_926}
        incomeSum={5_610_000}
        fixedTotal={5_610_000}
        yearMonth="2026-11"
        variant="expected"
      />,
    );
    const zeroGap = screen.getByLabelText('수입·고정비 차액');
    expect(zeroGap).toHaveClass('payment-funding-source--unused');
    expect(zeroGap).toHaveTextContent('₩0');
    expect(zeroGap).toHaveTextContent('차액 없음');
  });

  it('shows how much less or more needs to be transferred when salary varies from baseline', () => {
    const { rerender } = render(
      <CardPaymentFunding
        shortageAmount={1_316_084}
        remainingAmount={-1_316_084}
        salaryDelta={200_000}
        yearMonth="2026-11"
        variant="expected"
      />,
    );
    const lessImpact = screen.getByLabelText('월급 변동 반영');
    expect(lessImpact).toHaveClass('payment-funding-impact--less');
    expect(lessImpact).toHaveTextContent('기준 월급 대비 +₩200,000 · 기준 이체금 ₩866,084');
    expect(lessImpact).toHaveTextContent('-₩200,000');
    expect(lessImpact).toHaveTextContent('덜 옮김');

    rerender(
      <CardPaymentFunding
        shortageAmount={1_916_084}
        remainingAmount={-1_916_084}
        salaryDelta={-400_000}
        yearMonth="2026-11"
        variant="expected"
      />,
    );
    const moreImpact = screen.getByLabelText('월급 변동 반영');
    expect(moreImpact).toHaveClass('payment-funding-impact--more');
    expect(moreImpact).toHaveTextContent('기준 월급 대비 -₩400,000 · 기준 이체금 ₩866,084');
    expect(moreImpact).toHaveTextContent('+₩400,000');
    expect(moreImpact).toHaveTextContent('더 옮김');

    rerender(
      <CardPaymentFunding
        shortageAmount={50_000}
        remainingAmount={-50_000}
        salaryDelta={50_000}
        yearMonth="2026-11"
        variant="expected"
      />,
    );
    const flatImpact = screen.getByLabelText('월급 변동 반영');
    expect(flatImpact).toHaveTextContent('기준 월급 대비 +₩50,000 · 기준 이체금 ₩0');
    expect(flatImpact).toHaveTextContent('₩0');
    expect(flatImpact).toHaveTextContent('이체 변동 없음');
  });
});
