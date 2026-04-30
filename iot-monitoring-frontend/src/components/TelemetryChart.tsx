import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DataPoint {
  ts: string;
  value: number | null;
}

interface TelemetryChartProps {
  data: DataPoint[];
  label: string;
  unit?: string;
  height?: number;
  sparkline?: boolean;
  color?: string;
}

export default function TelemetryChart({
  data,
  label,
  unit,
  height = 260,
  sparkline = false,
  color = '#8b5cf6',
}: TelemetryChartProps) {
  const chartData = data.filter((d) => d.value !== null);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-500 text-sm" style={{ height }}>
        No data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, left: sparkline ? -32 : 0, bottom: 0 }}>
        {!sparkline && <CartesianGrid strokeDasharray="3 3" stroke="#334155" />}
        <XAxis
          dataKey="ts"
          hide={sparkline}
          tickFormatter={(v: string) =>
            new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
        />
        <YAxis
          hide={sparkline}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          unit={unit ? ` ${unit}` : undefined}
        />
        {!sparkline && (
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6 }}
            labelStyle={{ color: '#94a3b8', fontSize: 11 }}
            labelFormatter={(v) => new Date(String(v)).toLocaleString()}
            formatter={(value) => [`${value}${unit ? ' ' + unit : ''}`, label]}
          />
        )}
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={sparkline ? 1.5 : 2}
          dot={false}
          activeDot={sparkline ? false : { r: 4 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
