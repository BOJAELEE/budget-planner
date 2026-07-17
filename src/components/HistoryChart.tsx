import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatKRW } from '../lib/format';

export function HistoryChart({
  data,
}: { data: { yearMonth: string; totalBudget: number; remaining: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <XAxis dataKey="yearMonth" tick={{ fontSize: 11 }} />
        <YAxis hide />
        <Tooltip
          formatter={(v: number | string | ReadonlyArray<number | string> | undefined) =>
            formatKRW(Number(v))
          }
        />
        <Bar dataKey="totalBudget" fill="#43B5FF" name="총 필요 예산" radius={[4, 4, 0, 0]} />
        <Bar dataKey="remaining" fill="#6EE7B7" name="잔여금액" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
