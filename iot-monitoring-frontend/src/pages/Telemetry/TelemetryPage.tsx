import { useState, useEffect } from 'react';
import { telemetryApi } from '../../api/telemetry';
import { devicesApi } from '../../api/devices';
import TelemetryChart from '../../components/TelemetryChart';
import type { TelemetryDto, DeviceDto } from '../../types';

const RANGES = [
  { label: '1h', minutes: 60 },
  { label: '6h', minutes: 360 },
  { label: '24h', minutes: 1440 },
  { label: '7d', minutes: 10080 },
];

type MetricKey = 'temperature' | 'humidity';

export default function TelemetryPage() {
  const [devices, setDevices] = useState<DeviceDto[]>([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [range, setRange] = useState(60);
  const [metric, setMetric] = useState<MetricKey>('temperature');
  const [data, setData] = useState<TelemetryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [queried, setQueried] = useState(false);

  useEffect(() => {
    devicesApi.getAll().then((res) => setDevices(res.data)).catch(() => {});
  }, []);

  const handleQuery = () => {
    if (!selectedDevice) return;
    setLoading(true);
    const from = new Date(Date.now() - range * 60 * 1000).toISOString();
    telemetryApi
      .getByDevice(selectedDevice, { from, limit: 500 })
      .then((res) => {
        setData(res.data);
        setQueried(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const sorted = [...data].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const chartData = sorted
    .filter((t) => t[metric] !== null)
    .map((t) => ({ ts: t.timestamp, value: t[metric] as number }));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-white">Telemetry</h2>
        <p className="text-sm text-gray-400 mt-1">Query and explore sensor data across devices</p>
      </div>

      {/* Query bar */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-40">
            <label className="block text-xs text-gray-500 mb-1">Device *</label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500 transition-colors"
            >
              <option value="">Select a device…</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-40">
            <label className="block text-xs text-gray-500 mb-1">Metric</label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as MetricKey)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500 transition-colors"
            >
              <option value="temperature">Temperature</option>
              <option value="humidity">Humidity</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Range</label>
            <div className="flex items-center bg-gray-800 rounded-lg border border-gray-700 p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.minutes}
                  onClick={() => setRange(r.minutes)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    range === r.minutes ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleQuery}
            disabled={loading || !selectedDevice}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? 'Loading…' : 'Query'}
          </button>
        </div>
      </div>

      {/* Chart */}
      {queried && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="text-sm font-medium text-white mb-4">
            {metric} — {RANGES.find((r) => r.minutes === range)?.label}
          </h3>
          <TelemetryChart
            data={chartData}
            label={metric}
            unit={metric === 'temperature' ? '°C' : '%'}
            height={260}
          />
        </div>
      )}

      {/* Results table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {!queried ? (
          <div className="px-5 py-12 text-center text-gray-500 text-sm">
            Select a device and click Query
          </div>
        ) : data.length === 0 ? (
          <div className="px-5 py-12 text-center text-gray-500 text-sm">
            No data found for the selected filters
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Time</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Temperature</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Humidity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {data.map((t) => (
                <tr key={t.messageId} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-5 py-2.5 text-gray-500">{new Date(t.timestamp).toLocaleString()}</td>
                  <td className="px-5 py-2.5 text-white font-mono">
                    {t.temperature !== null ? `${t.temperature} °C` : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-5 py-2.5 text-white font-mono">
                    {t.humidity !== null ? `${t.humidity} %` : <span className="text-gray-600">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
