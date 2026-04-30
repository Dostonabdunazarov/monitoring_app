import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Pencil, Key, Trash2, X, Check } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import TelemetryChart from '../../components/TelemetryChart';
import { devicesApi } from '../../api/devices';
import { telemetryApi } from '../../api/telemetry';
import type { DeviceDto, TelemetryDto } from '../../types';

const DEVICE_TYPES = ['TemperatureSensor', 'HumiditySensor', 'Gateway', 'Camera', 'PressureSensor', 'Other'];
const DEVICE_STATUSES = ['Active', 'Inactive', 'Offline'] as const;

export default function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [device, setDevice] = useState<DeviceDto | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryDto[]>([]);
  const [loadingDevice, setLoadingDevice] = useState(true);
  const [loadingTelemetry, setLoadingTelemetry] = useState(true);
  const [activeMetric, setActiveMetric] = useState<'temperature' | 'humidity'>('temperature');

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', type: '', status: '' });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const [issuingToken, setIssuingToken] = useState(false);
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    devicesApi
      .getAll()
      .then((res) => {
        const found = res.data.find((d: DeviceDto) => d.id === id) ?? null;
        setDevice(found);
      })
      .catch(() => {})
      .finally(() => setLoadingDevice(false));
  }, [id]);

  const fetchTelemetry = useCallback(() => {
    if (!id) return;
    setLoadingTelemetry(true);
    telemetryApi
      .getByDevice(id, { limit: 60 })
      .then((res) => setTelemetry(res.data))
      .catch(() => {})
      .finally(() => setLoadingTelemetry(false));
  }, [id]);

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 5000);
    return () => clearInterval(interval);
  }, [fetchTelemetry]);

  function startEdit() {
    if (!device) return;
    setEditForm({ name: device.name, type: device.type, status: device.status });
    setEditError('');
    setEditing(true);
  }

  async function handleSave() {
    if (!device || !id) return;
    if (!editForm.name.trim()) { setEditError('Name is required.'); return; }
    setSaving(true);
    setEditError('');
    try {
      const res = await devicesApi.update(id, {
        name: editForm.name.trim(),
        type: editForm.type,
        status: editForm.status,
      });
      setDevice(res.data);
      setEditing(false);
    } catch {
      setEditError('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleIssueToken() {
    if (!id) return;
    setIssuingToken(true);
    try {
      const res = await devicesApi.issueToken(id);
      setIssuedToken(res.data.token);
    } catch {
      alert('Failed to issue token.');
    } finally {
      setIssuingToken(false);
    }
  }

  async function handleCopyToken() {
    if (!issuedToken) return;
    await navigator.clipboard.writeText(issuedToken);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  }

  async function handleDelete() {
    if (!device || !id) return;
    if (!window.confirm(`Delete "${device.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await devicesApi.delete(id);
      navigate('/devices');
    } catch {
      alert('Failed to delete device.');
      setDeleting(false);
    }
  }

  const sorted = [...telemetry].sort((a: TelemetryDto, b: TelemetryDto) =>
    a.timestamp.localeCompare(b.timestamp)
  );

  const tempData = sorted
    .filter((t: TelemetryDto) => t.temperature !== null)
    .map((t: TelemetryDto) => ({ ts: t.timestamp, value: t.temperature as number }));

  const humData = sorted
    .filter((t: TelemetryDto) => t.humidity !== null)
    .map((t: TelemetryDto) => ({ ts: t.timestamp, value: t.humidity as number }));

  const hasTemp = tempData.length > 0;
  const hasHum = humData.length > 0;
  const chartData = activeMetric === 'temperature' ? tempData : humData;
  const chartUnit = activeMetric === 'temperature' ? '°C' : '%';

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
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-semibold text-white">{device.name}</h2>
            <StatusBadge status={device.status} />
          </div>
          <p className="text-sm text-gray-400 mt-1">Type: {device.type}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={startEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800 border border-gray-700 rounded-lg transition-colors"
          >
            <Pencil size={13} />
            Edit
          </button>
          <button
            onClick={handleIssueToken}
            disabled={issuingToken}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800 border border-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <Key size={13} />
            {issuingToken ? 'Issuing…' : 'Issue Token'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-900 rounded-lg transition-colors disabled:opacity-50"
          >
            <Trash2 size={13} />
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Issued Token Banner */}
      {issuedToken && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-amber-400 mb-1">
                Device token issued — copy it now, it won't be shown again
              </p>
              <code className="text-xs text-amber-200 break-all font-mono">{issuedToken}</code>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleCopyToken}
                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs rounded-lg transition-colors"
              >
                {tokenCopied ? <Check size={13} /> : 'Copy'}
              </button>
              <button
                onClick={() => setIssuedToken(null)}
                className="p-1.5 text-amber-500 hover:text-amber-300 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Device Info */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h3 className="text-sm font-medium text-white mb-4">Device info</h3>
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <dt className="text-xs text-gray-500">ID</dt>
            <dd className="text-xs text-gray-400 mt-0.5 font-mono truncate">{device.id}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Type</dt>
            <dd className="text-sm text-gray-200 mt-0.5">{device.type}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Created</dt>
            <dd className="text-sm text-gray-200 mt-0.5">{new Date(device.createdAt).toLocaleString()}</dd>
          </div>
        </dl>
      </div>

      {/* Real-time chart */}
      <div className="bg-gray-900 rounded-xl border border-gray-800">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium text-white">
              Real-time telemetry
              {loadingTelemetry && <span className="ml-2 text-xs text-gray-500">refreshing…</span>}
            </h3>
            {(hasTemp || hasHum) && (
              <div className="flex gap-1">
                {hasTemp && (
                  <button
                    onClick={() => setActiveMetric('temperature')}
                    className={`px-2 py-0.5 rounded text-xs transition-colors ${
                      activeMetric === 'temperature'
                        ? 'bg-violet-600 text-white'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                    }`}
                  >
                    Temperature
                  </button>
                )}
                {hasHum && (
                  <button
                    onClick={() => setActiveMetric('humidity')}
                    className={`px-2 py-0.5 rounded text-xs transition-colors ${
                      activeMetric === 'humidity'
                        ? 'bg-violet-600 text-white'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                    }`}
                  >
                    Humidity
                  </button>
                )}
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
          <TelemetryChart data={chartData} label={activeMetric} unit={chartUnit} height={220} />
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
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Temperature</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Humidity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {telemetry.slice(0, 20).map((t: TelemetryDto) => (
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

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h3 className="text-base font-semibold text-white">Edit Device</h3>
              <button onClick={() => setEditing(false)} className="text-gray-500 hover:text-gray-300 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Name *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500 transition-colors"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Type</label>
                <select
                  value={editForm.type}
                  onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500 transition-colors"
                >
                  {DEVICE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500 transition-colors"
                >
                  {DEVICE_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              {editError && <p className="text-xs text-red-400">{editError}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setEditing(false)}
                  className="px-3 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
