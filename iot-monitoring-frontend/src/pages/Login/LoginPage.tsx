import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { AxiosError } from 'axios';
import { Activity, AlertCircle, ArrowRight, Lock, Mail, Wifi } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import type { UserDto } from '../../types';

type ValidationProblem = {
  errors?: Record<string, string[]>;
  title?: string;
  message?: string;
};

function normalizeUser(user: UserDto): UserDto {
  const role = user.role?.toLowerCase() as UserDto['role'];
  const fallbackName = user.email.split('@')[0] || user.email;

  return {
    ...user,
    role,
    name: user.name ?? fallbackName,
    isActive: user.isActive ?? true,
  };
}

function getLoginError(error: unknown) {
  if (error instanceof AxiosError) {
    if (error.response?.status === 401) {
      return 'Email or password is incorrect.';
    }

    const data = error.response?.data as ValidationProblem | undefined;
    const firstValidationMessage = data?.errors
      ? Object.values(data.errors).flat()[0]
      : undefined;

    return firstValidationMessage ?? data?.message ?? data?.title ?? 'Unable to sign in.';
  }

  return 'Unable to sign in.';
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const destination = useMemo(() => {
    const state = location.state as { from?: { pathname?: string } } | null;
    return state?.from?.pathname ?? '/dashboard';
  }, [location.state]);

  if (accessToken) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Enter email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await authApi.login({ email: trimmedEmail, password });
      login(data.accessToken, normalizeUser(data.user));
      navigate(destination, { replace: true });
    } catch (loginError) {
      setError(getLoginError(loginError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_460px]">
        <section className="relative hidden overflow-hidden border-r border-gray-800 bg-gray-900 lg:block">
          <div className="absolute inset-0 opacity-70 [background:radial-gradient(circle_at_25%_20%,rgba(16,185,129,0.24),transparent_34%),radial-gradient(circle_at_70%_70%,rgba(59,130,246,0.18),transparent_32%)]" />
          <div className="relative flex h-full flex-col justify-between p-10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
                <Wifi size={22} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">IoT Monitoring</p>
                <p className="text-xs text-gray-400">Fleet telemetry console</p>
              </div>
            </div>

            <div className="max-w-xl">
              <div className="mb-6 flex items-center gap-3 text-sm text-emerald-300">
                <Activity size={18} />
                Live device visibility
              </div>
              <h1 className="text-4xl font-semibold tracking-normal text-white">
                Monitor devices, telemetry, and operational health from one workspace.
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-6 text-gray-400">
                Sign in to inspect connected devices, review recent readings, and manage
                monitoring operations.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              {['Devices', 'Telemetry', 'Alerts'].map((label) => (
                <div key={label} className="rounded-lg border border-gray-800 bg-gray-950/60 p-4">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="mt-2 font-medium text-gray-200">Ready</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-10">
          <div className="w-full max-w-sm">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
                <Wifi size={22} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">IoT Monitoring</p>
                <p className="text-xs text-gray-400">Fleet telemetry console</p>
              </div>
            </div>

            <div className="mb-7">
              <h2 className="text-2xl font-semibold text-white">Sign in</h2>
              <p className="mt-2 text-sm text-gray-400">
                Use your workspace account to continue.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-300">Email</span>
                <span className="relative block">
                  <Mail
                    size={18}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-800 bg-gray-900 pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-gray-600 focus:border-violet-500"
                    placeholder="admin@example.com"
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-300">Password</span>
                <span className="relative block">
                  <Lock
                    size={18}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-800 bg-gray-900 pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-gray-600 focus:border-violet-500"
                    placeholder="Password"
                  />
                </span>
              </label>

              {error && (
                <div className="flex gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  <AlertCircle size={17} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-violet-600/60"
              >
                {submitting ? 'Signing in...' : 'Sign in'}
                {!submitting && <ArrowRight size={18} />}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
