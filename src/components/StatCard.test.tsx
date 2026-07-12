import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from './StatCard';

describe('StatCard', () => {
  it('라벨과 포맷된 금액 표시', () => {
    render(<StatCard label="총 필요 예산" amount={5838945} />);
    expect(screen.getByText('총 필요 예산')).toBeInTheDocument();
    expect(screen.getByText('₩5,838,945')).toBeInTheDocument();
  });
  it('음수 tone=neg면 음수 금액 표시', () => {
    render(<StatCard label="잔여금액" amount={-94868} tone="neg" />);
    expect(screen.getByText('-₩94,868')).toBeInTheDocument();
  });
});
