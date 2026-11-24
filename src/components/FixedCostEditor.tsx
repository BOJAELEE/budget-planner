import { useState } from 'react';
import type { FixedCost } from '../types';
import { PAYMENT_METHODS, CATEGORIES } from '../types';
import { AmountInput } from './AmountInput';

export type FixedCostDraft = Omit<FixedCost, 'id' | 'yearMonth'>;

export function FixedCostEditor({
  initial, onSave, onCancel, onDelete,
}: {
  initial: FixedCostDraft;
  onSave: (d: FixedCostDraft) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [d, setD] = useState<FixedCostDraft>(initial);
  return (
    <div className="rounded-2xl border border-[#d4d4d8] bg-[#fafafa] p-3.5 space-y-2.5">
      <input
        className="min-h-[42px] w-full rounded-xl border border-[#d4d4d8] px-3 py-1.5 text-sm"
        placeholder="이름"
        value={d.name}
        onChange={(e) => setD({ ...d, name: e.target.value })}
      />
      <div className="flex gap-2">
        <select
          className="min-h-[42px] flex-1 rounded-xl border border-[#d4d4d8] px-2.5 py-1.5 text-sm"
          value={d.paymentMethod}
          onChange={(e) => setD({ ...d, paymentMethod: e.target.value as FixedCost['paymentMethod'] })}
        >
          {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
        </select>
        <select
          className="min-h-[42px] flex-1 rounded-xl border border-[#d4d4d8] px-2.5 py-1.5 text-sm"
          value={d.category}
          onChange={(e) => setD({ ...d, category: e.target.value as FixedCost['category'] })}
        >
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <AmountInput value={d.amount} onCommit={(n) => setD({ ...d, amount: n })} />
      <label className="flex items-center gap-2 text-sm text-[#374151]">
        <input
          type="checkbox"
          checked={d.variability === '변동'}
          onChange={(e) => setD({ ...d, variability: e.target.checked ? '변동' : '고정' })}
        />
        변동 항목(금액이 매달 바뀜)
      </label>
      <div className="flex items-center justify-between gap-2 pt-1">
        {onDelete ? (
          <button
            type="button"
            className="min-h-[40px] rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-1.5 text-sm font-semibold text-neg"
            onClick={onDelete}
          >
            삭제
          </button>
        ) : <span />}
        <div className="flex gap-2">
          <button type="button" className="min-h-[40px] rounded-xl px-3 py-1.5 text-sm font-semibold text-gray-600" onClick={onCancel}>
            취소
          </button>
          <button
            type="button"
            className="min-h-[40px] rounded-xl bg-brand px-4 py-1.5 text-sm font-bold text-white"
            onClick={() => onSave(d)}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
