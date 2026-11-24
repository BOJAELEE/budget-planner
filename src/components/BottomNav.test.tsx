import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { BottomNav } from './BottomNav';

describe('BottomNav', () => {
  it('renders all six navigation tabs with clear labels and highlights the active route', () => {
    render(
      <MemoryRouter initialEntries={['/extra']}>
        <BottomNav />
      </MemoryRouter>,
    );

    const nav = screen.getByRole('navigation', { name: '하단 메뉴' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['이번달', '추가지출', '고정비', '수입', '잔고', '히스토리']);
    expect(within(nav).getByRole('link', { name: '추가지출' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: '이번달' })).not.toHaveAttribute('aria-current', 'page');
  });
});
