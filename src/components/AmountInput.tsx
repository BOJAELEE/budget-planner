import { useState, useEffect } from 'react';
import { parseAmount, formatKRW } from '../lib/format';

export function AmountInput({
  value, onCommit, ariaLabel, commitUnchanged = true,
}: {
  value: number;
  onCommit: (n: number) => void;
  ariaLabel?: string;
  commitUnchanged?: boolean;
}) {
  const [text, setText] = useState(value ? value.toLocaleString('ko-KR') : '');
  const [edited, setEdited] = useState(false);
  useEffect(() => {
    setText(value ? value.toLocaleString('ko-KR') : '');
    setEdited(false);
  }, [value]);

  const commit = () => {
    const n = parseAmount(text);
    setText(n ? n.toLocaleString('ko-KR') : '');
    if (commitUnchanged || edited) onCommit(n);
  };
  return (
    <input
      inputMode="numeric"
      aria-label={ariaLabel}
      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-right text-lg"
      value={text}
      placeholder={formatKRW(0)}
      onChange={(e) => { setText(e.target.value); setEdited(true); }}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
    />
  );
}
