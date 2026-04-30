import { useEffect, useState } from 'react';
import { Cpu, Wifi, WifiOff, Activity } from 'lucide-react';
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
        const first5 = res.data.slice(0, 5);
        Promise.all(
          first5.map((d) =>
            telemetryApi
              .getByDevice(d.id, { limit: 20 })
              .then((r) => ({ id: d.id, data: r.data }))
              .catch(() => ({ id: d.id, data: [] as TelemetryDto[] }))
          )
        ).then((results) => {
          const map: Record<string, TelemetryDto[]> = {};
          results.forEach(({ id, data }: { id: string; data: TelemetryDto[] }) => { map[id] = data; });
          setSparklines(map);
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const active = devices.filter((d) => d.status === 'Active').length;
  const offline = devices.filter((d) => d.status === 'Offline').length;
  const inactive = devices.filter((d) => d.status === 'Inactive').length;

  const recent = devices.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Dashboard</h2>
        <p className="text-sm text-gray-400 mt-1">Overview of your IoT fleet</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total devices" value={loading ? '—' : devices.length} icon={<Cpu size={24} />} />
        <StatCard label="Active" value={loading ? '—' : active} icon={<Wifi size={24} />} color="text-emerald-400" />
        <StatCard label="Offline" value={loading ? '—' : offline} icon={<Activity size={24} />} color="text-gray-400" />
        <StatCard label="Inactive" value={loading ? '—' : inactive} icon={<WifiOff size={24} />} color="text-yellow-400" />
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="text-sm font-medium text-white">Recent devices</h3>
          <Link to="/devices" className="text-xs text-violet-400 hover:text-violet-300">View all</Link>
        </div>

        {loading ? (
          <div className="px-5 py-8 text-center text-gray-500 text-sm">Loading…</div>
        ) : recent.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-500 text-sm">No devices yet</div>
        ) : (
          <ul className="divide-y divide-gray-800">
            {recent.map((device) => {
              const raw = (sparklines[device.id] ?? [])
                .slice()
                .sort((a: TelemetryDto, b: TelemetryDto) => a.timestamp.localeCompare(b.timestamp));
              const sparkData = raw
                .filter((t: TelemetryDto) => t.temperature !== null)
                .map((t: TelemetryDto) => ({ ts: t.timestamp, value: t.temperature }));

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
                      <TelemetryChart data={sparkData} label="temperature" height={36} sparkline />
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
