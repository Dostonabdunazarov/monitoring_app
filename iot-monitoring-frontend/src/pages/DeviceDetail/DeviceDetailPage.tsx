import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import TelemetryChart from '../../components/TelemetryChart';
import { devicesApi } from '../../api/devices';
import { telemetryApi } from '../../api/telemetry';
import type { DeviceDto, TelemetryDto } from '../../types';

export default function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [device, setDevice] = useState<DeviceDto | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryDto[]>([]);
  const [loadingDevice, setLoadingDevice] = useState(true);
  const [loadingTelemetry, setLoadingTelemetry] = useState(true);
  const [activeMetric, setActiveMetric] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    devicesApi
      .getById(id)
      .then((res) => setDevice(res.data))
      .catch(() => {})
      .finally(() => setLoadingDevice(false));
  }, [id]);

  const fetchTelemetry = useCallback(() => {
    if (!id) return;
    setLoadingTelemetry(true);
    telemetryApi
      .getByDevice(id)
      .then((res) => setTelemetry(res.data))
      .catch(() => {})
      .finally(() => setLoadingTelemetry(false));
  }, [id]);

  useEffect(() => {
    const timeout = window.setTimeout(fetchTelemetry, 0);
    const interval = setInterval(fetchTelemetry, 5000);
    return () => {
      window.clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [fetchTelemetry]);

  const metrics = useMemo(() => {
    const seen = new Set<string>();
    telemetry.forEach((t) => seen.add(t.metric));
    return Array.from(seen);
  }, [telemetry]);

  const selectedMetric = activeMetric ?? metrics[0] ?? null;

  const chartSeries = useMemo(() => {
    if (!selectedMetric) return [];
    const filtered = telemetry
      .filter((t) => t.metric === selectedMetric)
      .slice()
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .slice(-60);
    return [{ label: selectedMetric, data: filtered }];
  }, [telemetry, selectedMetric]);

  if (loadingDevice) {
    return <div className="text-gray-500 text-sm">Loading device…</div>;
  }

  if (!device) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Device not found.</p>
        <Link to="/devices" className="text-violet-400 hover:text-violet-300 text-sm mt-2 inline-block">
          ← Back to devices
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          to="/devices"
          className="mt-1 p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-white">{device.name}</h2>
            <StatusBadge status={device.status} />
          </div>
          <p className="text-sm text-gray-400 mt-1">Type: {device.type}</p>
        </div>
      </div>

      {/* Metadata */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h3 className="text-sm font-medium text-white mb-4">Device info</h3>
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'ID', value: device.id },
            { label: 'Tenant', value: device.tenantId },
            { label: 'Last seen', value: new Date(device.lastSeen).toLocaleString() },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs text-gray-500">{label}</dt>
              <dd className="text-sm text-gray-200 mt-0.5 truncate">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Real-time chart */}
      <div className="bg-gray-900 rounded-xl border border-gray-800">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium text-white">
              Real-time telemetry
              {loadingTelemetry && (
                <span className="ml-2 text-xs text-gray-500">refreshing…</span>
              )}
            </h3>
            {metrics.length > 1 && (
              <div className="flex gap-1">
                {metrics.map((m) => (
                  <button
                    key={m}
                    onClick={() => setActiveMetric(m)}
                    className={`px-2 py-0.5 rounded text-xs transition-colors ${
                      m === selectedMetric
                        ? 'bg-violet-600 text-white'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={fetchTelemetry}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </div>
        <div className="p-4">
          <TelemetryChart series={chartSeries} height={220} />
        </div>
      </div>

      {/* Telemetry table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800">
        <div className="px-5 py-4 border-b border-gray-800">
          <h3 className="text-sm font-medium text-white">Recent records</h3>
        </div>

        {telemetry.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-500 text-sm">No telemetry data</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Time</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Metric</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {telemetry.slice(0, 20).map((t) => (
                <tr key={t.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-5 py-2.5 text-gray-500">{new Date(t.timestamp).toLocaleString()}</td>
                  <td className="px-5 py-2.5 text-gray-300">{t.metric}</td>
                  <td className="px-5 py-2.5 text-white font-mono">
                    {t.value} {t.unit ?? ''}
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
