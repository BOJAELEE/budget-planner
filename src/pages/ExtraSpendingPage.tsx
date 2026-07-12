import { useEffect, useState } from 'react';
import { useRepository } from '../data/RepositoryContext';
import type { ExtraSpending, CardMethod } from '../types';
import { CARD_METHODS } from '../types';
import { AmountInput } from '../components/AmountInput';
import { formatKRW } from '../lib/format';
import { extraSpendingTotal } from '../lib/calc';

const nowYearMonth = () => new Date().toISOString().slice(0, 7);
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

export default function ExtraSpendingPage() {
  const repo = useRepository();
  const [yearMonth] = useState(nowYearMonth());
  const [items, setItems] = useState<ExtraSpending[]>([]);
  const [name, setName] = useState('');
  const [card, setCard] = useState<CardMethod>('현대카드');
  const [amount, setAmount] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => setItems(await repo.listExtraSpendings(yearMonth));
  useEffect(() => { void load(); }, [yearMonth]);

  const add = async () => {
    if (!name.trim() || amount <= 0) return;
    await repo.addExtraSpending({ yearMonth, card, name: name.trim(), amount });
    setName(''); setAmount(0); setCard('현대카드');
    await load();
  };
  const saveEdit = async (id: string, patch: { card?: CardMethod; name?: string; amount?: number }) => {
    await repo.updateExtraSpending(id, patch); setEditingId(null); await load();
  };
  const remove = async (id: string) => {
    if (confirm('삭제할까요?')) { await repo.deleteExtraSpending(id); await load(); }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">추가지출 <span className="text-sm font-normal text-gray-400">{yearMonth.replace('-', '.')}</span></h1>

      {/* 추가 폼 */}
      <div className="rounded-2xl bg-white shadow-card p-4 space-y-2">
        <input
          className="w-full rounded-lg border border-gray-200 px-3 py-2"
          placeholder="내용 (예: 코스트코)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex gap-2">
          <select
            className="rounded-lg border border-gray-200 px-2 py-2"
            value={card}
            onChange={(e) => setCard(e.target.value as CardMethod)}
          >
            {CARD_METHODS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <div className="flex-1"><AmountInput value={amount} onCommit={setAmount} /></div>
        </div>
        <button
          className="w-full rounded-lg bg-brand text-white py-2 disabled:opacity-40"
          disabled={!name.trim() || amount <= 0}
          onClick={add}
        >
          추가지출 기록
        </button>
      </div>

      {/* 목록 */}
      {items.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-6">이번달 추가지출이 아직 없습니다.</p>
      ) : (
        items.map((it) => editingId === it.id ? (
          <ExtraRowEditor key={it.id} item={it} onSave={(p) => saveEdit(it.id, p)} onCancel={() => setEditingId(null)} />
        ) : (
          <div key={it.id} className="flex items-center justify-between rounded-xl bg-white shadow-card px-3 py-2">
            <div>
              <div className="font-medium">
                {it.name}
                <span className="ml-2 text-xs rounded bg-gray-100 text-gray-500 px-1.5 py-0.5">{it.card}</span>
              </div>
              <div className="text-xs text-gray-400">{fmtDate(it.createdAt)}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-neg">{formatKRW(it.amount)}</span>
              <button className="text-gray-400 text-sm" onClick={() => setEditingId(it.id)}>수정</button>
              <button className="text-neg text-sm" onClick={() => remove(it.id)}>삭제</button>
            </div>
          </div>
        ))
      )}

      <div className="rounded-2xl bg-brand-soft p-4 text-sm">
        이번달 추가지출 합계 <b>{formatKRW(extraSpendingTotal(items))}</b>
      </div>
    </div>
  );
}

function ExtraRowEditor({
  item, onSave, onCancel,
}: {
  item: ExtraSpending;
  onSave: (patch: { card: CardMethod; name: string; amount: number }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [card, setCard] = useState<CardMethod>(item.card);
  const [amount, setAmount] = useState(item.amount);
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
      <input className="w-full rounded-lg border px-2 py-1" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="flex gap-2">
        <select className="rounded-lg border px-2 py-1" value={card} onChange={(e) => setCard(e.target.value as CardMethod)}>
          {CARD_METHODS.map((c) => <option key={c}>{c}</option>)}
        </select>
        <div className="flex-1"><AmountInput value={amount} onCommit={setAmount} /></div>
      </div>
      <div className="flex gap-2 justify-end">
        <button className="px-3 py-1 text-gray-500" onClick={onCancel}>취소</button>
        <button className="px-3 py-1 rounded-lg bg-brand text-white" onClick={() => onSave({ card, name: name.trim(), amount })}>저장</button>
      </div>
    </div>
  );
}
