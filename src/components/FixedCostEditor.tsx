import { useState } from 'react';
import type { FixedCost } from '../types';
import { PAYMENT_METHODS, CATEGORIES } from '../types';
import { AmountInput } from './AmountInput';

export type FixedCostDraft = Omit<FixedCost, 'id'>;

export function FixedCostEditor({
  initial, onSave, onCancel,
}: { initial: FixedCostDraft; onSave: (d: FixedCostDraft) => void; onCancel: () => void }) {
  const [d, setD] = useState<FixedCostDraft>(initial);
  return (
    <div className="rounded-xl border border-gray-200 p-3 space-y-2 bg-gray-50">
      <input
        className="w-full rounded-lg border px-2 py-1"
        placeholder="이름" value={d.name}
        onChange={(e) => setD({ ...d, name: e.target.value })}
      />
      <div className="flex gap-2">
        <select className="flex-1 rounded-lg border px-2 py-1" value={d.paymentMethod}
          onChange={(e) => setD({ ...d, paymentMethod: e.target.value as FixedCost['paymentMethod'] })}>
          {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
        </select>
        <select className="flex-1 rounded-lg border px-2 py-1" value={d.category}
          onChange={(e) => setD({ ...d, category: e.target.value as FixedCost['category'] })}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <AmountInput value={d.amount} onCommit={(n) => setD({ ...d, amount: n })} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={d.variability === '변동'}
          onChange={(e) => setD({ ...d, variability: e.target.checked ? '변동' : '고정' })} />
        변동 항목(금액이 매달 바뀜)
      </label>
      <div className="flex gap-2 justify-end">
        <button className="px-3 py-1 text-gray-500" onClick={onCancel}>취소</button>
        <button className="px-3 py-1 rounded-lg bg-brand text-white" onClick={() => onSave(d)}>저장</button>
      </div>
    </div>
  );
}
