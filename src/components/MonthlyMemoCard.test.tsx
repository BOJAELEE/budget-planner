import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RepositoryProvider } from '../data/RepositoryContext';
import { MemoryRepository } from '../data/memoryRepository';
import { MonthlyMemoCard } from './MonthlyMemoCard';

function memoView(repo: MemoryRepository, yearMonth = '2026-11') {
  return <RepositoryProvider repo={repo}><MonthlyMemoCard key={yearMonth} yearMonth={yearMonth} /></RepositoryProvider>;
}

describe('MonthlyMemoCard', () => {
  it('saves multiline text and shows it again after remounting', async () => {
    const repo = new MemoryRepository();
    const user = userEvent.setup();
    const view = render(memoView(repo));
    await user.click(await screen.findByRole('button', { name: '메모 쓰기' }));
    const content = '보험료 확인\n이번 달 여행 준비\n<script>메모 그대로</script>';
    fireEvent.change(screen.getByRole('textbox'), { target: { value: content } });
    await user.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByRole('status')).toHaveTextContent('저장되었습니다.');
    expect(await repo.getMonthlyMemo('2026-11')).toBe(content);
    expect(screen.getByText((_, element) => element?.tagName === 'P' && element.textContent === content)).toHaveClass('whitespace-pre-wrap');
    expect(view.container.querySelector('script')).toBeNull();
    view.unmount();
    render(memoView(repo));
    expect(await screen.findByRole('button', { name: '수정' })).toBeInTheDocument();
    expect(screen.getByText(/보험료 확인/)).toBeInTheDocument();
  });

  it('keeps each billing month separate and restores saved text on cancel', async () => {
    const repo = new MemoryRepository();
    await repo.setMonthlyMemo('2026-11', '11월 메모');
    await repo.setMonthlyMemo('2026-12', '12월 메모');
    const user = userEvent.setup();
    const view = render(memoView(repo));
    await user.click(await screen.findByRole('button', { name: '수정' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '아직 저장하지 않은 메모' } });
    await user.click(screen.getByRole('button', { name: '취소' }));
    expect(screen.getByText('11월 메모')).toBeInTheDocument();
    view.rerender(memoView(repo, '2026-12'));
    expect(await screen.findByText('12월 메모')).toBeInTheDocument();
    expect(screen.queryByText('11월 메모')).not.toBeInTheDocument();
  });

  it('retains the draft after a failed save and lets the user retry', async () => {
    const repo = new MemoryRepository();
    const save = vi.spyOn(repo, 'setMonthlyMemo').mockRejectedValueOnce(new Error('network'));
    const user = userEvent.setup();
    render(memoView(repo));
    await user.click(await screen.findByRole('button', { name: '메모 쓰기' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '작성 중인 메모\n두 번째 줄' } });
    await user.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('작성한 내용은 유지됩니다.');
    expect(screen.getByRole('textbox')).toHaveValue('작성 중인 메모\n두 번째 줄');
    await user.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument());
    expect(save).toHaveBeenCalledTimes(2);
    expect(await repo.getMonthlyMemo('2026-11')).toBe('작성 중인 메모\n두 번째 줄');
  });

  it('does not let a failed load overwrite an existing memo', async () => {
    const repo = new MemoryRepository();
    await repo.setMonthlyMemo('2026-11', '기존 메모');
    vi.spyOn(repo, 'getMonthlyMemo').mockRejectedValueOnce(new Error('network'));
    const user = userEvent.setup();
    render(memoView(repo));
    expect(await screen.findByRole('alert')).toHaveTextContent('불러오지 못했습니다.');
    expect(screen.queryByRole('button', { name: '메모 쓰기' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByText('기존 메모')).toBeInTheDocument();
  });

  it('expands and shrinks the editor to fit its content', async () => {
    const user = userEvent.setup();
    render(memoView(new MemoryRepository()));
    await user.click(await screen.findByRole('button', { name: '메모 쓰기' }));
    const field = screen.getByRole('textbox');
    const height = vi.spyOn(field, 'scrollHeight', 'get').mockReturnValue(240);
    fireEvent.change(field, { target: { value: '첫 줄\n둘째 줄\n셋째 줄' } });
    expect(field).toHaveStyle({ height: '240px' });
    height.mockReturnValue(88);
    fireEvent.change(field, { target: { value: '짧게' } });
    expect(field).toHaveStyle({ height: '88px' });
  });

  it('allows an empty memo to be saved to clear the card', async () => {
    const repo = new MemoryRepository();
    await repo.setMonthlyMemo('2026-11', '지울 내용');
    const user = userEvent.setup();
    render(memoView(repo));
    await user.click(await screen.findByRole('button', { name: '수정' }));
    await user.clear(screen.getByRole('textbox'));
    await user.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByText('이번 달 메모를 남겨보세요.')).toBeInTheDocument();
    expect(await repo.getMonthlyMemo('2026-11')).toBe('');
  });
});
