import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CardPaymentFunding } from './CardPaymentFunding';

describe('CardPaymentFunding', () => {
  it('shows only the used portions with a clear payment total', () => {
    render(<CardPaymentFunding shortageAmount={441268} yearMonth="2026-11" variant="actual" />);
    const funding = screen.getByRole('region', { name: '카드결제 이체금' });
    expect(within(funding).getByText('2026년 11월 · 실제 기준')).toBeInTheDocument();
    expect(within(funding).getByText('저축분 사용').closest('dt')?.nextElementSibling).toHaveTextContent('₩150,000');
    expect(within(funding).getByText('월 비상금 사용').closest('dt')?.nextElementSibling).toHaveTextContent('₩291,268');
    expect(within(funding).getByText('추가 충당').closest('dt')?.nextElementSibling).toHaveTextContent('₩0');
    expect(within(funding).getByText('옮길 금액 합계').nextElementSibling).toHaveTextContent('₩441,268');
    expect(within(funding).getByText('여유자금 제외')).toBeInTheDocument();
    expect(within(funding).getByLabelText('이체 방향')).toHaveTextContent('비상금통장→카드결제 통장');
    expect(within(funding).getByText(/15만 원 저축분도 비상금통장에 있는 기준/)).toBeInTheDocument();
  });

  it('highlights an amount needed beyond the 150,000 and 500,000 won allowances', () => {
    render(<CardPaymentFunding shortageAmount={900000} yearMonth="2026-12" variant="expected" />);
    const extra = screen.getByText('추가 충당').closest('dt');
    expect(extra?.nextElementSibling).toHaveTextContent('₩250,000');
    expect(extra?.parentElement).toHaveClass('payment-funding-source--extra');
    expect(screen.getByText('월 15만 원·50만 원 외에 ₩250,000을 추가로 옮겨야 합니다.')).toHaveClass('payment-funding-note--extra');
    expect(screen.getByText('옮길 금액 합계').nextElementSibling).toHaveTextContent('₩900,000');
  });

  it('keeps all three categories visible at zero without implying a transfer is needed', () => {
    render(<CardPaymentFunding shortageAmount={0} yearMonth="2026-11" variant="expected" />);
    expect(screen.getAllByRole('term')).toHaveLength(3);
    expect(screen.getAllByRole('definition').every((amount) => amount.textContent === '₩0')).toBe(true);
    expect(screen.getByText('현재 수입으로 결제할 수 있어 이체할 금액이 없습니다.')).toBeInTheDocument();
  });
});
