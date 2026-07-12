import { useEffect, useState } from 'react';
import { useRepository } from '../data/RepositoryContext';
import type { Income } from '../types';
import { AmountInput } from '../components/AmountInput';
import { formatKRW } from '../lib/format';
import { incomeTotal } from '../lib/calc';
import { BackupPanel } from '../components/BackupPanel';

export default function IncomePage() {
  const repo = useRepository();
  const [items, setItems] = useState<Income[]>([]);
  const [newName, setNewName] = useState('');

  const load = async () => setItems(await repo.listIncomes());
  useEffect(() => { void load(); }, []);

  const add = async () => {
    if (!newName.trim()) return;
    await repo.addIncome({ name: newName.trim(), amount: 0, active: true });
    setNewName(''); await load();
  };
  const setAmount = async (id: string, amount: number) => {
    await repo.updateIncome(id, { amount }); await load();
  };
  const remove = async (id: string) => {
    if (confirm('삭제할까요?')) { await repo.deleteIncome(id); await load(); }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">수입</h1>
      {items.map((it) => (
        <div key={it.id} className="rounded-xl bg-white shadow-card px-3 py-2 space-y-1">
          <div className="flex justify-between items-center">
            <span className="font-medium">{it.name}</span>
            <button className="text-neg text-sm" onClick={() => remove(it.id)}>삭제</button>
          </div>
          <AmountInput value={it.amount} onCommit={(n) => setAmount(it.id, n)} />
        </div>
      ))}
      <div className="flex gap-2">
        <input className="flex-1 rounded-lg border px-2 py-2" placeholder="새 수입 이름(예: 상여금)"
          value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button className="px-3 rounded-lg bg-brand text-white" onClick={add}>추가</button>
      </div>
      <div className="rounded-2xl bg-brand-soft p-4 text-sm">
        수입합계 <b>{formatKRW(incomeTotal(items))}</b>
      </div>
      <BackupPanel />
    </div>
  );
}
