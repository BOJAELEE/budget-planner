import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRepository } from '../data/RepositoryContext';
import { formatYearMonth } from '../lib/billing';
import { MAX_MONTHLY_MEMO_LENGTH } from '../lib/monthlyMemo';

export function MonthlyMemoCard({ yearMonth }: { yearMonth: string }) {
  const repo = useRepository();
  const [content, setContent] = useState('');
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    setLoading(true);
    setError('');
    repo.getMonthlyMemo(yearMonth).then((value) => {
      if (cancelled) return;
      setContent(value);
      setDraft(value);
      setLoadFailed(false);
    }).catch(() => {
      if (cancelled) return;
      setLoadFailed(true);
      setError('메모를 불러오지 못했습니다. 다시 시도해 주세요.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; mounted.current = false; };
  }, [repo, yearMonth, loadAttempt]);

  useLayoutEffect(() => {
    const field = textarea.current;
    if (!editing || !field) return;
    const resize = () => {
      field.style.height = 'auto';
      field.style.height = `${field.scrollHeight}px`;
    };
    resize();
    let lastWidth = field.clientWidth;
    let resizeFrame = 0;
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => {
      if (field.clientWidth === lastWidth) return;
      lastWidth = field.clientWidth;
      // Defer height writes so observing a width change cannot create a resize loop.
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(resize);
    });
    observer?.observe(field);
    return () => { observer?.disconnect(); cancelAnimationFrame(resizeFrame); };
  }, [editing, draft]);

  async function saveMemo() {
    setSaving(true);
    setError('');
    try {
      await repo.setMonthlyMemo(yearMonth, draft);
      if (!mounted.current) return;
      setContent(draft);
      setEditing(false);
      setSaved(true);
    } catch {
      if (mounted.current) setError('저장하지 못했습니다. 작성한 내용은 유지됩니다. 다시 저장해 주세요.');
    } finally {
      if (mounted.current) setSaving(false);
    }
  }

  return (
    <section className="monthly-memo rounded-2xl border bg-brand-soft px-4 py-3" aria-label={`${formatYearMonth(yearMonth)} 메모`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-2 text-base font-semibold">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className="shrink-0">
            <path d="M5 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5V3Z M3 7h4 M3 12h4 M3 17h4 M10 8h5 M10 12h5 M10 16h3" />
          </svg>
          이번 달 메모
        </h2>
        {!editing && !loading && !loadFailed && (
          <button type="button" className="memo-action shrink-0 rounded-lg px-2 py-1 text-sm font-medium" onClick={() => {
            setDraft(content); setError(''); setSaved(false); setEditing(true);
          }}>{content.trim() ? '수정' : '메모 쓰기'}</button>
        )}
      </div>
      {loading ? <p className="mt-2 text-sm text-gray-500" role="status">메모 불러오는 중…</p> : editing ? (
        <form className="mt-3 space-y-2" onSubmit={(event) => { event.preventDefault(); void saveMemo(); }}>
          <textarea ref={textarea} aria-label={`${formatYearMonth(yearMonth)} 메모 내용`} autoFocus
            className="block min-h-[88px] w-full resize-none overflow-hidden rounded-xl border px-3 py-2 text-sm leading-6"
            rows={3} value={draft} maxLength={MAX_MONTHLY_MEMO_LENGTH} disabled={saving}
            placeholder="이번 달에 기억할 내용을 적어주세요."
            onChange={(event) => { setDraft(event.target.value); setSaved(false); }} />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button type="button" disabled={saving} className="memo-action rounded-lg px-3 py-1.5 text-sm" onClick={() => {
              setDraft(content); setError(''); setEditing(false);
            }}>취소</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </form>
      ) : !loadFailed && (
        <p className={`mt-2 whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere] ${content.trim() ? 'text-gray-700' : 'text-gray-500'}`}>
          {content.trim() ? content : '이번 달 메모를 남겨보세요.'}
        </p>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-neg">{error}</p>}
      {loadFailed && !loading && <button type="button" className="memo-action mt-2 rounded-lg px-3 py-1.5 text-sm" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>다시 시도</button>}
      {saved && <p role="status" className="mt-2 text-xs text-gray-600">저장되었습니다.</p>}
    </section>
  );
}
