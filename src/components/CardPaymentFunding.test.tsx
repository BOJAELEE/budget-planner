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
  });
});
