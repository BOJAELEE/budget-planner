import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatKRW } from '../lib/format';

type HistoryRow = {
  yearMonth: string;
  totalBudget: number;
  extraSpending: number;
};

function formatAxisKRW(value: number) {
  if (value === 0) return '₩0';
  return `₩${Math.round(value / 10_000)}만`;
}

function budgetAxisMax(dataMax: number) {
  return Math.max(1_000_000, Math.ceil(dataMax / 500_000) * 500_000);
}

function extraAxisMax(dataMax: number) {
  return Math.max(1_000_000, Math.ceil((dataMax * 2) / 500_000) * 500_000);
}

export function HistoryChart({
  data,
}: { data: HistoryRow[] }) {
  return (
    <div aria-label="예산과 추가지출 복합 그래프" role="img">
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <CartesianGrid stroke="#e8ece7" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="yearMonth" tick={{ fontSize: 11 }} />
          <YAxis
            yAxisId="budget"
            width={52}
            domain={[0, budgetAxisMax]}
            tick={{ fill: '#63846f', fontSize: 10 }}
            tickFormatter={formatAxisKRW}
          />
          <YAxis
            yAxisId="extra"
            orientation="right"
            width={52}
            domain={[0, extraAxisMax]}
            tick={{ fill: '#b28439', fontSize: 10 }}
            tickFormatter={formatAxisKRW}
          />
        <Tooltip
          formatter={(v: number | string | ReadonlyArray<number | string> | undefined) =>
            formatKRW(Number(v))
          }
        />
          <Legend verticalAlign="top" align="left" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar
            yAxisId="extra"
            dataKey="extraSpending"
            fill="#d4ad67"
            name="추가지출"
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="budget"
            type="monotone"
            dataKey="totalBudget"
            stroke="#6e957b"
            strokeWidth={3}
            dot={{ r: 4 }}
            name="총 필요예산"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
