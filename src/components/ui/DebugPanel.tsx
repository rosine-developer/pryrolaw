import { useEffect, useRef, useState } from 'react';
import { Bug, X, ChevronDown, ChevronUp, RefreshCw, CheckCircle, XCircle, AlertCircle, Wifi, WifiOff, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

type Status = 'idle' | 'checking' | 'ok' | 'error';

interface Check { label: string; status: Status; detail?: string; }
interface DataCounts { cases: number | null; tasks: number | null; documents: number | null; events: number | null; conversations: number | null; }
interface ErrorEntry { time: string; message: string; source?: string; }

function now() { return new Date().toLocaleTimeString(); }
function StatusIcon({ status }: { status: Status }) {
  if (status === 'checking') return <Loader className="h-3.5 w-3.5 animate-spin text-amber-500" />;
  if (status === 'ok') return <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />;
  if (status === 'error') return <XCircle className="h-3.5 w-3.5 text-red-500" />;
  return <AlertCircle className="h-3.5 w-3.5 text-ink-400" />;
}

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export function DebugPanel() {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'auth' | 'services' | 'data' | 'errors'>('auth');
  const [minimized, setMinimized] = useState(false);
  const [checks, setChecks] = useState<Record<string, Check>>({
    api: { label: 'Express API', status: 'idle' },
    auth: { label: 'Auth endpoint', status: 'idle' },
    env: { label: 'Env vars', status: 'idle' },
  });
  const [counts, setCounts] = useState<DataCounts>({ cases: null, tasks: null, documents: null, events: null, conversations: null });
  const [countsLoading, setCountsLoading] = useState(false);
  const [errors, setErrors] = useState<ErrorEntry[]>([]);

  useEffect(() => {
    const onError = (e: ErrorEvent) => setErrors((p) => [{ time: now(), message: e.message, source: e.filename ? `${e.filename}:${e.lineno}` : undefined }, ...p.slice(0, 49)]);
    const onUnhandled = (e: PromiseRejectionEvent) => {
      const msg = e.reason instanceof Error ? e.reason.message : String(e.reason);
      setErrors((p) => [{ time: now(), message: msg, source: 'unhandledrejection' }, ...p.slice(0, 49)]);
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandled);
    return () => { window.removeEventListener('error', onError); window.removeEventListener('unhandledrejection', onUnhandled); };
  }, []);

  const runChecks = async () => {
    setChecks((p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, { ...v, status: 'checking' as Status }])));

    // Env var
    const apiUrlOk = !!import.meta.env.VITE_API_URL;
    setChecks((p) => ({ ...p, env: { ...p.env, status: apiUrlOk ? 'ok' : 'error', detail: apiUrlOk ? `VITE_API_URL: ${API}` : 'VITE_API_URL missing' } }));

    // Health endpoint
    try {
      const t0 = Date.now();
      const res = await fetch(`${API.replace('/api', '')}/health`);
      const ms = Date.now() - t0;
      setChecks((p) => ({ ...p, api: { ...p.api, status: res.ok ? 'ok' : 'error', detail: res.ok ? `${res.status} — ${ms}ms` : `HTTP ${res.status}` } }));
    } catch (e) {
      setChecks((p) => ({ ...p, api: { ...p.api, status: 'error', detail: String(e) } }));
    }

    // Auth endpoint
    try {
      const token = localStorage.getItem('lw_access');
      const res = await fetch(`${API}/auth/me`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      setChecks((p) => ({ ...p, auth: { ...p.auth, status: res.status === 200 || res.status === 401 ? 'ok' : 'error', detail: `HTTP ${res.status}` } }));
    } catch (e) {
      setChecks((p) => ({ ...p, auth: { ...p.auth, status: 'error', detail: String(e) } }));
    }
  };

  const loadCounts = async () => {
    if (!user) return;
    setCountsLoading(true);
    const token = localStorage.getItem('lw_access') ?? '';
    const headers = { Authorization: `Bearer ${token}` };
    const endpoints: [keyof DataCounts, string][] = [
      ['cases', '/cases?limit=1'],
      ['tasks', '/tasks?limit=1'],
      ['documents', '/documents?limit=1'],
      ['events', '/calendar?limit=1'],
      ['conversations', '/ai/conversations'],
    ];
    const results = await Promise.allSettled(endpoints.map(([, path]) => fetch(`${API}${path}`, { headers }).then((r) => r.json())));
    const next: DataCounts = { cases: null, tasks: null, documents: null, events: null, conversations: null };
    results.forEach((r, i) => {
      const key = endpoints[i][0];
      if (r.status === 'fulfilled') {
        const d = r.value;
        next[key] = typeof d.total === 'number' ? d.total : Array.isArray(d) ? d.length : null;
      }
    });
    setCounts(next);
    setCountsLoading(false);
  };

  useEffect(() => {
    if (open && checks.api.status === 'idle') { runChecks(); loadCounts(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (import.meta.env.PROD) return null;

  const hasError = Object.values(checks).some((c) => c.status === 'error') || errors.length > 0;
  const allOk = Object.values(checks).every((c) => c.status === 'ok') && errors.length === 0;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className={cn(
            'fixed bottom-5 right-5 z-50 flex items-center gap-2 px-3 py-2 rounded-full shadow-lg text-xs font-semibold border transition-colors',
            hasError ? 'bg-red-600 border-red-700 text-white hover:bg-red-700' :
            allOk ? 'bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-700' :
            'bg-ink-800 border-ink-700 text-white hover:bg-ink-900',
          )}
        >
          <Bug className="h-3.5 w-3.5" />
          Debug
          {errors.length > 0 && <span className="bg-white/25 rounded-full px-1.5 py-0.5 text-[10px]">{errors.length}</span>}
          {user ? <Wifi className="h-3 w-3 opacity-70" /> : <WifiOff className="h-3 w-3 opacity-70" />}
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-96 rounded-xl border border-ink-200 bg-white shadow-2xl text-xs flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-ink-900 text-white rounded-t-xl">
            <div className="flex items-center gap-2">
              <Bug className="h-3.5 w-3.5" />
              <span className="font-semibold text-[11px] uppercase tracking-wide">Debug Panel</span>
              {hasError && <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-[10px] font-bold">{errors.length > 0 ? `${errors.length} error${errors.length > 1 ? 's' : ''}` : 'issue'}</span>}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setMinimized((v) => !v)} className="p-1 rounded hover:bg-white/10 transition-colors">
                {minimized ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-white/10 transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              <div className="flex border-b border-ink-200 bg-ink-50">
                {(['auth', 'services', 'data', 'errors'] as const).map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={cn('flex-1 py-2 text-[11px] font-medium capitalize transition-colors', activeTab === tab ? 'bg-white text-ink-900 border-b-2 border-primary-600' : 'text-ink-500 hover:text-ink-700')}>
                    {tab}{tab === 'errors' && errors.length > 0 && <span className="ml-1 bg-red-100 text-red-600 rounded-full px-1">{errors.length}</span>}
                  </button>
                ))}
              </div>

              <div className="max-h-80 overflow-y-auto p-3 space-y-2 font-mono">
                {activeTab === 'auth' && (
                  <div className="space-y-2">
                    <Row label="Status" value={user ? '✅ Signed in' : '❌ Not signed in'} />
                    <Row label="User ID" value={user?.id ?? '—'} mono />
                    <Row label="Email" value={user?.email ?? '—'} />
                    <Row label="Token" value={localStorage.getItem('lw_access') ? '✅ stored' : '❌ missing'} />
                    <div className="border-t border-ink-100 pt-2 mt-2">
                      <p className="text-[10px] uppercase tracking-wider text-ink-400 mb-1.5">Lawyer Profile</p>
                      <Row label="Full name" value={profile?.fullName ?? '—'} />
                      <Row label="Firm" value={profile?.firmName ?? '—'} />
                      <Row label="Bar #" value={profile?.barNumber ?? '—'} />
                      <Row label="Jurisdiction" value={profile?.primaryJurisdiction ?? '—'} />
                    </div>
                    <div className="border-t border-ink-100 pt-2 mt-2">
                      <p className="text-[10px] uppercase tracking-wider text-ink-400 mb-1.5">Config</p>
                      <Row label="API URL" value={API} />
                    </div>
                  </div>
                )}

                {activeTab === 'services' && (
                  <div className="space-y-2">
                    <div className="flex justify-end mb-1">
                      <button onClick={runChecks} className="flex items-center gap-1 text-[11px] text-ink-500 hover:text-ink-800 transition-colors">
                        <RefreshCw className="h-3 w-3" /> Re-run
                      </button>
                    </div>
                    {Object.values(checks).map((check) => (
                      <div key={check.label} className="flex items-start gap-2 py-1.5 border-b border-ink-100 last:border-0">
                        <StatusIcon status={check.status} />
                        <div className="flex-1 min-w-0">
                          <p className="text-ink-800 font-medium">{check.label}</p>
                          {check.detail && <p className="text-ink-400 text-[11px] truncate">{check.detail}</p>}
                        </div>
                        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', check.status === 'ok' ? 'bg-emerald-100 text-emerald-700' : check.status === 'error' ? 'bg-red-100 text-red-700' : check.status === 'checking' ? 'bg-amber-100 text-amber-700' : 'bg-ink-100 text-ink-500')}>
                          {check.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'data' && (
                  <div className="space-y-2">
                    <div className="flex justify-end mb-1">
                      <button onClick={loadCounts} disabled={countsLoading} className="flex items-center gap-1 text-[11px] text-ink-500 hover:text-ink-800 transition-colors">
                        <RefreshCw className={cn('h-3 w-3', countsLoading && 'animate-spin')} /> Refresh
                      </button>
                    </div>
                    {!user && <p className="text-ink-400 text-center py-4 text-[11px]">Sign in to see data counts</p>}
                    {(['cases', 'tasks', 'documents', 'events', 'conversations'] as const).map((key) => (
                      <div key={key} className="flex items-center justify-between py-1 border-b border-ink-100 last:border-0">
                        <span className="text-ink-600 capitalize">{key}</span>
                        <span className={cn('font-bold text-sm', counts[key] === null ? 'text-ink-300' : counts[key] === 0 ? 'text-ink-400' : 'text-ink-900')}>
                          {counts[key] === null ? (countsLoading ? '…' : '—') : counts[key]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'errors' && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-ink-400 text-[11px]">Runtime errors</span>
                      {errors.length > 0 && <button onClick={() => setErrors([])} className="text-[11px] text-red-500 hover:text-red-700">Clear</button>}
                    </div>
                    {errors.length === 0 ? (
                      <div className="text-center py-6 text-ink-400"><CheckCircle className="h-5 w-5 mx-auto mb-1 text-emerald-400" />No runtime errors</div>
                    ) : (
                      errors.map((e, i) => (
                        <div key={i} className="bg-red-50 border border-red-100 rounded-md p-2 space-y-0.5">
                          <div className="flex justify-between text-[10px] text-red-400"><span>{e.source ?? 'window'}</span><span>{e.time}</span></div>
                          <p className="text-red-700 text-[11px] break-words">{e.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="px-3 py-1.5 bg-ink-50 border-t border-ink-100 text-[10px] text-ink-400 flex justify-between">
                <span>DEV ONLY — hidden in production</span>
                <span>{new Date().toLocaleTimeString()}</span>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2 py-0.5">
      <span className="text-ink-400 shrink-0">{label}</span>
      <span className={cn('text-ink-700 text-right break-all', mono && 'font-mono text-[10px]')}>{value}</span>
    </div>
  );
}
