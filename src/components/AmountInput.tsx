import { useState, useEffect } from 'react';
import { parseAmount, formatKRW } from '../lib/format';

export function AmountInput({
  value, onCommit,
}: { value: number; onCommit: (n: number) => void }) {
  const [text, setText] = useState(value ? value.toLocaleString('ko-KR') : '');
  useEffect(() => { setText(value ? value.toLocaleString('ko-KR') : ''); }, [value]);

  const commit = () => {
    const n = parseAmount(text);
    setText(n ? n.toLocaleString('ko-KR') : '');
    onCommit(n);
  };
  return (
    <input
      inputMode="numeric"
      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-right text-lg"
      value={text}
      placeholder={formatKRW(0)}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
    />
  );
}
