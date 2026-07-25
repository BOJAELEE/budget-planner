import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatKRW } from '../lib/format';

export function HistoryChart({
  data,
}: { data: { yearMonth: string; totalBudget: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <XAxis dataKey="yearMonth" tick={{ fontSize: 11 }} />
        <YAxis hide />
        <Tooltip
          formatter={(v: number | string | ReadonlyArray<number | string> | undefined) =>
            formatKRW(Number(v))
          }
        />
        <Line type="monotone" dataKey="totalBudget" stroke="#6e957b" strokeWidth={3} dot={{ r: 4 }} name="총 필요예산" />
      </LineChart>
    </ResponsiveContainer>
  );
}
