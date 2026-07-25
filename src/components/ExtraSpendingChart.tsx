import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatKRW } from '../lib/format';

export function ExtraSpendingChart({ data }: { data: { yearMonth: string; extraSpending: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <XAxis dataKey="yearMonth" tick={{ fontSize: 11 }} />
        <YAxis hide />
        <Tooltip formatter={(value: number | string | ReadonlyArray<number | string> | undefined) => formatKRW(Number(value))} />
        <Bar dataKey="extraSpending" fill="#d4ad67" name="추가지출" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
