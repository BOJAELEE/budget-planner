import { formatKRW } from '../lib/format';

export function StatCard({
  label, amount, tone = 'default',
}: { label: string; amount: number; tone?: 'default' | 'pos' | 'neg' }) {
  const color = tone === 'pos' ? 'text-pos' : tone === 'neg' ? 'text-neg' : 'text-gray-900';
  return (
    <div className="rounded-2xl bg-white shadow-card p-5">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${color}`}>{formatKRW(amount)}</div>
    </div>
  );
}
