import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { TelemetryDto } from '../types';

interface SeriesData {
  label: string;
  data: TelemetryDto[];
  color?: string;
}

interface TelemetryChartProps {
  series: SeriesData[];
  metric?: string;
  height?: number;
  /** Show only the line, no axes/grid — for sparklines */
  sparkline?: boolean;
}

const DEFAULT_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
];

function formatTimestamp(ts: string, sparkline: boolean): string {
  const d = new Date(ts);
  if (sparkline) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function buildChartData(series: SeriesData[]) {
  if (series.length === 0) return [];

  if (series.length === 1) {
    return series[0].data.map((point) => ({
      ts: point.timestamp,
      [series[0].label]: point.value,
    }));
  }

  const tsSet = new Set<string>();
  series.forEach((s) => s.data.forEach((p) => tsSet.add(p.timestamp)));
  const sorted = Array.from(tsSet).sort();

  return sorted.map((ts) => {
    const row: Record<string, string | number> = { ts };
    series.forEach((s) => {
      const point = s.data.find((p) => p.timestamp === ts);
      if (point !== undefined) row[s.label] = point.value;
    });
    return row;
  });
}

export default function TelemetryChart({
  series,
  metric,
  height = 260,
  sparkline = false,
}: TelemetryChartProps) {
  const data = buildChartData(series);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-slate-500 text-sm"
        style={{ height }}
      >
        No data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: sparkline ? -32 : 0, bottom: 0 }}>
        {!sparkline && <CartesianGrid strokeDasharray="3 3" stroke="#334155" />}
        {!sparkline && (
          <XAxis
            dataKey="ts"
            tickFormatter={(v) => formatTimestamp(v as string, false)}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
          />
        )}
        {sparkline && <XAxis dataKey="ts" hide />}
        {!sparkline && (
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            unit={series[0]?.data[0]?.unit ? ` ${series[0].data[0].unit}` : undefined}
          />
        )}
        {sparkline && <YAxis hide />}
        {!sparkline && (
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6 }}
            labelStyle={{ color: '#94a3b8', fontSize: 11 }}
            labelFormatter={(v) => new Date(v as string).toLocaleString()}
            formatter={(value, name) => [
              `${value}${series[0]?.data[0]?.unit ? ' ' + series[0].data[0].unit : ''}`,
              name,
            ]}
          />
        )}
        {!sparkline && series.length > 1 && (
          <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
        )}
        {series.map((s, i) => (
          <Line
            key={s.label}
            type="monotone"
            dataKey={s.label}
            stroke={s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
            strokeWidth={sparkline ? 1.5 : 2}
            dot={false}
            activeDot={sparkline ? false : { r: 4 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
