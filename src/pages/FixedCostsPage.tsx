import { useEffect, useState } from 'react';
import { useRepository } from '../data/RepositoryContext';
import type { FixedCost } from '../types';
import { PAYMENT_METHODS } from '../types';
import { FixedCostEditor, type FixedCostDraft } from '../components/FixedCostEditor';
import { formatKRW } from '../lib/format';
import { transferTotal } from '../lib/calc';

const blankDraft: FixedCostDraft = {
  paymentMethod: '신한카드', category: '구독', name: '', amount: 0,
  variability: '고정', active: true, sortOrder: 999,
};

export default function FixedCostsPage() {
  const repo = useRepository();
  const [items, setItems] = useState<FixedCost[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = async () => setItems(await repo.listFixedCosts());
  useEffect(() => { void load(); }, []);

  const save = async (id: string | null, d: FixedCostDraft) => {
    if (id) await repo.updateFixedCost(id, d);
    else await repo.addFixedCost(d);
    setEditingId(null); setAdding(false); await load();
  };
  const remove = async (id: string) => {
    if (confirm('삭제할까요?')) { await repo.deleteFixedCost(id); await load(); }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">고정비</h1>
        <button className="px-3 py-1 rounded-lg bg-brand text-white text-sm"
          onClick={() => setAdding(true)}>+ 추가</button>
      </div>
      {adding && (
        <FixedCostEditor initial={blankDraft}
          onSave={(d) => save(null, d)} onCancel={() => setAdding(false)} />
      )}
      {PAYMENT_METHODS.map((method) => {
        const group = items.filter((i) => i.paymentMethod === method);
        if (group.length === 0) return null;
        const sum = group.filter((g) => g.active).reduce((a, g) => a + g.amount, 0);
        return (
          <div key={method} className="space-y-2">
            <div className="flex justify-between text-sm font-semibold text-gray-700">
              <span>{method}</span><span>{formatKRW(sum)}</span>
            </div>
            {group.map((item) => editingId === item.id ? (
              <FixedCostEditor key={item.id} initial={item}
                onSave={(d) => save(item.id, d)} onCancel={() => setEditingId(null)} />
            ) : (
              <div key={item.id} className="flex items-center justify-between rounded-xl bg-white shadow-card px-3 py-2">
                <div>
                  <div className="font-medium">
                    {item.name}
                    {item.variability === '변동' && (
                      <span className="ml-2 text-xs rounded bg-amber-100 text-amber-700 px-1.5 py-0.5">변동</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">{item.category}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatKRW(item.amount)}</span>
                  <button className="text-gray-400 text-sm" onClick={() => setEditingId(item.id)}>수정</button>
                  <button className="text-neg text-sm" onClick={() => remove(item.id)}>삭제</button>
                </div>
              </div>
            ))}
          </div>
        );
      })}
      <div className="rounded-2xl bg-brand-soft p-4 text-sm">
        현금이체 합계 <b>{formatKRW(transferTotal(items))}</b>
      </div>
    </div>
  );
}
