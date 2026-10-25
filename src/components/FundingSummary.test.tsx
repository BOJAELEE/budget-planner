import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FundingSummary } from './FundingSummary';

describe('FundingSummary', () => {
  it.each([
    { available: 719504, remaining: 208732, used: '510,772', result: '208,732', label: '잔액', percentage: '71% 사용' },
    { available: 719504, remaining: -7556, used: '727,060', result: '-7,556', label: '초과금액', percentage: '100% 사용' },
    { available: 650000, remaining: 0, used: '650,000', result: '0', label: '잔액', percentage: '100% 사용' },
    { available: 650000, remaining: -160000, used: '810,000', result: '-160,000', label: '초과금액', percentage: '100% 사용' },
    { available: 750000, remaining: 850000, used: '-100,000', result: '850,000', label: '잔액', percentage: '0% 사용' },
    { available: 0, remaining: 0, used: '0', result: '0', label: '잔액', percentage: '0% 사용' },
  ])('shows available $available, used $used, and $label $result consistently', ({ available, remaining, used, result, label, percentage }) => {
    render(<FundingSummary availableAmount={available} remainingAmount={remaining} />);
    const summary = screen.getByRole('region', { name: '월별 자금 핵심 요약' });
    expect(within(summary).getAllByRole('term')).toHaveLength(3);
    expect(within(summary).getByText('예비자금').nextElementSibling).toHaveTextContent(available.toLocaleString('ko-KR'));
    expect(within(summary).getByText('사용금액').nextElementSibling).toHaveTextContent(used);
    const resultLabel = within(summary).getByText(label, { exact: true });
    expect(resultLabel.nextElementSibling).toHaveTextContent(result);
    expect(resultLabel.parentElement).toHaveClass('funding-summary-result');
    if (remaining < 0) expect(resultLabel.parentElement).toHaveClass('funding-summary-result--over');
    else expect(resultLabel.parentElement).not.toHaveClass('funding-summary-result--over');
    expect(within(summary).getByText(percentage)).toBeInTheDocument();
  });
});
