import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CardPaymentFunding } from './CardPaymentFunding';

describe('CardPaymentFunding', () => {
  it('excludes reserve remaining in the salary account from the transfer total', () => {
    render(<CardPaymentFunding shortageAmount={441268} yearMonth="2026-11" variant="actual" />);
    const funding = screen.getByRole('region', { name: '카드결제 이체금' });
    expect(within(funding).getByText('2026년 11월 · 실제 기준')).toBeInTheDocument();
    expect(within(funding).getByText('월급 여유 자금').closest('dt')?.nextElementSibling).toHaveTextContent('₩150,000');
    expect(within(funding).getByText('월간 비상금').closest('dt')?.nextElementSibling).toHaveTextContent('₩291,268');
    expect(within(funding).getByText('추가 충당').closest('dt')?.nextElementSibling).toHaveTextContent('₩0');
    expect(within(funding).getByText('옮길 금액 합계').closest('div')?.querySelector('strong')).toHaveTextContent('₩291,268');
    expect(within(funding).getByText('월급 여유 자금 제외')).toBeInTheDocument();
    expect(within(funding).getByLabelText('이체 방향')).toHaveTextContent('비상금통장→월급통장 (카드결제)');
    expect(within(funding).getByText(/월급통장에 남은 월급 여유 자금\(15만 원\)은 이체 대상에서 제외/)).toBeInTheDocument();
    expect(within(funding).queryByText(/예비자금|여유자금/)).not.toBeInTheDocument();
    expect(within(funding).getByText('월급통장 정산 후 여유 자금(완충 자금)')).toBeInTheDocument();
    expect(within(funding).getByText('월간 비상금(26일 자동이체)')).toBeInTheDocument();
  });

  it('highlights an amount needed beyond the 150,000 and 500,000 won allowances', () => {
    render(<CardPaymentFunding shortageAmount={1516084} yearMonth="2026-12" variant="expected" />);
    expect(screen.getByText('월급 여유 자금').closest('dt')?.nextElementSibling).toHaveTextContent('₩150,000');
    expect(screen.getByText('월간 비상금').closest('dt')?.nextElementSibling).toHaveTextContent('₩500,000');
    const extra = screen.getByText('추가 충당').closest('dt');
    expect(extra?.nextElementSibling).toHaveTextContent('₩866,084');
    expect(extra?.parentElement).toHaveClass('payment-funding-source--extra');
    expect(screen.getByText('월급 여유 자금(15만 원)·월간 비상금(50만 원) 외에 ₩866,084을 추가로 옮겨야 합니다.')).toHaveClass('payment-funding-note--extra');
    expect(screen.getByText('옮길 금액 합계').closest('div')?.querySelector('strong')).toHaveTextContent('₩1,366,084');
  });

  it('shows zero transfer needed when the reserve in the salary account covers the shortage', () => {
    render(<CardPaymentFunding shortageAmount={120000} yearMonth="2026-11" variant="expected" />);
    expect(screen.getByText('월급 여유 자금').closest('dt')?.nextElementSibling).toHaveTextContent('₩120,000');
    expect(screen.getByText('월간 비상금').closest('dt')?.nextElementSibling).toHaveTextContent('₩0');
    expect(screen.getByText('추가 충당').closest('dt')?.nextElementSibling).toHaveTextContent('₩0');
    expect(screen.getByText('옮길 금액 합계').closest('div')?.querySelector('strong')).toHaveTextContent('₩0');
    expect(screen.getByText('월급통장에 남은 월급 여유 자금(₩120,000)으로 충당되어 이체할 금액이 없습니다.')).toBeInTheDocument();
  });

  it('keeps all three categories visible at zero without implying a transfer is needed', () => {
    render(<CardPaymentFunding shortageAmount={0} yearMonth="2026-11" variant="expected" />);
    expect(screen.getAllByRole('term')).toHaveLength(3);
    expect(screen.getAllByRole('definition').every((amount) => amount.textContent === '₩0')).toBe(true);
    expect(screen.getByText('현재 수입으로 결제할 수 있어 이체할 금액이 없습니다.')).toBeInTheDocument();
    expect(screen.queryByLabelText('월급 변동 반영')).not.toBeInTheDocument();
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
    expect(lessImpact).toHaveTextContent('기준 월급 대비 +₩200,000 · 기준 이체금 ₩1,366,084');
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
    expect(moreImpact).toHaveTextContent('기준 월급 대비 -₩400,000 · 기준 이체금 ₩1,366,084');
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
