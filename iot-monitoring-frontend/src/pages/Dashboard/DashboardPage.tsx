import { useEffect, useState } from 'react';
import { Cpu, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import TelemetryChart from '../../components/TelemetryChart';
import { devicesApi } from '../../api/devices';
import { telemetryApi } from '../../api/telemetry';
import type { DeviceDto, TelemetryDto } from '../../types';

export default function DashboardPage() {
  const [devices, setDevices] = useState<DeviceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [sparklines, setSparklines] = useState<Record<string, TelemetryDto[]>>({});

  useEffect(() => {
    devicesApi
      .getAll()
      .then((res) => {
        setDevices(res.data);
        // fetch sparkline data for first 5 devices in parallel
        const first5 = res.data.slice(0, 5);
        Promise.all(
          first5.map((d) =>
            telemetryApi
              .getByDevice(d.id)
              .then((r) => ({ id: d.id, data: r.data as TelemetryDto[] }))
              .catch(() => ({ id: d.id, data: [] as TelemetryDto[] }))
          )
        ).then((results) => {
          const map: Record<string, TelemetryDto[]> = {};
          results.forEach(({ id, data }) => { map[id] = data; });
          setSparklines(map);
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const online = devices.filter((d) => d.status === 'online').length;
  const offline = devices.filter((d) => d.status === 'offline').length;
  const error = devices.filter((d) => d.status === 'error').length;

  const recent = devices.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Dashboard</h2>
        <p className="text-sm text-gray-400 mt-1">Overview of your IoT fleet</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total devices"
          value={loading ? '—' : devices.length}
          icon={<Cpu size={24} />}
        />
        <StatCard
          label="Online"
          value={loading ? '—' : online}
          icon={<Wifi size={24} />}
          color="text-emerald-400"
        />
        <StatCard
          label="Offline"
          value={loading ? '—' : offline}
          icon={<WifiOff size={24} />}
          color="text-gray-400"
        />
        <StatCard
          label="Errors"
          value={loading ? '—' : error}
          icon={<AlertTriangle size={24} />}
          color="text-red-400"
        />
      </div>

      {/* Recent devices with sparklines */}
      <div className="bg-gray-900 rounded-xl border border-gray-800">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="text-sm font-medium text-white">Recent devices</h3>
          <Link to="/devices" className="text-xs text-violet-400 hover:text-violet-300">
            View all
          </Link>
        </div>

        {loading ? (
          <div className="px-5 py-8 text-center text-gray-500 text-sm">Loading…</div>
        ) : recent.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-500 text-sm">No devices yet</div>
        ) : (
          <ul className="divide-y divide-gray-800">
            {recent.map((device) => {
              const rawData = sparklines[device.id] ?? [];
              const firstMetric = rawData[0]?.metric;
              const sparkData = firstMetric
                ? rawData
                    .filter((t) => t.metric === firstMetric)
                    .slice()
                    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
                    .slice(-20)
                : [];

              return (
                <li key={device.id}>
                  <Link
                    to={`/devices/${device.id}`}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{device.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{device.type}</p>
                    </div>
                    <div className="w-28 shrink-0">
                      <TelemetryChart
                        series={sparkData.length > 0 ? [{ label: firstMetric!, data: sparkData }] : []}
                        height={36}
                        sparkline
                      />
                    </div>
                    <StatusBadge status={device.status} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
