import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatKRW } from '../lib/format';

const COLORS = ['#43B5FF', '#6EE7B7', '#7BC7FF', '#A9B6FF', '#7FE0D4', '#4C8CC7', '#8EA5BA', '#5F94D1'];

export function CategoryDonut({ data }: { data: { category: string; amount: number }[] }) {
  return (
    <div className="rounded-2xl bg-white shadow-card p-4">
      <div className="text-sm text-gray-500 mb-2">카테고리별 고정비</div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="amount" nameKey="category" innerRadius={55} outerRadius={90}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip
            formatter={(v: number | string | ReadonlyArray<number | string> | undefined) =>
              formatKRW(Number(v))
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
