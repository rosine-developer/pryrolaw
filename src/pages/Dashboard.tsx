import { Briefcase, CheckSquare, CalendarDays, AlertTriangle, ArrowRight, Clock, FileText } from 'lucide-react';
import { useApi } from '../hooks/useData';
import { dashboardApi, type ApiDashboard } from '../lib/api';
import { formatDate, formatDateTime } from '../lib/utils';
import { humanize } from '../lib/constants';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/EmptyState';
import type { View } from '../components/layout/AppLayout';

interface Props {
  onNavigate: (v: View) => void;
  onOpenCase: (id: string) => void;
  onOpenAI: () => void;
}

export function Dashboard({ onNavigate, onOpenCase }: Props) {
  const { data, loading, error } = useApi<ApiDashboard>(() => dashboardApi.getSummary(), []);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-6 w-6" /></div>;
  if (error) return <div className="py-10 text-center text-red-600 text-sm">{error}</div>;
  if (!data) return null;

  const { stats, recentCases, upcomingEvents, recentDocuments } = data;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Total Cases" value={stats.totalCases} icon={<Briefcase className="h-4 w-4" />} onClick={() => onNavigate('cases')} />
        <StatCard label="Open Cases" value={stats.openCases} icon={<Briefcase className="h-4 w-4" />} color="blue" onClick={() => onNavigate('cases')} />
        <StatCard label="Urgent Cases" value={stats.urgentCases} icon={<AlertTriangle className="h-4 w-4" />} color={stats.urgentCases > 0 ? 'red' : 'gray'} onClick={() => onNavigate('cases')} />
        <StatCard label="Pending Tasks" value={stats.pendingTasks} icon={<CheckSquare className="h-4 w-4" />} onClick={() => onNavigate('tasks')} />
        <StatCard label="Overdue Tasks" value={stats.overdueTasks} icon={<AlertTriangle className="h-4 w-4" />} color={stats.overdueTasks > 0 ? 'red' : 'gray'} onClick={() => onNavigate('tasks')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Cases */}
        <div className="lg:col-span-2">
          <SectionHeader title="Active Cases" action={{ label: 'View all', onClick: () => onNavigate('cases') }} />
          <Card className="divide-y divide-ink-100">
            {recentCases.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-400">No open cases yet.</p>
            ) : (
              recentCases.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onOpenCase(c.id)}
                  className="w-full flex items-start justify-between px-4 py-3 hover:bg-ink-50 transition-colors text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900 truncate">{c.title}</p>
                    <p className="text-xs text-ink-500 mt-0.5">
                      {c.caseNumber} · {c.caseType}
                      {c.client && ` · ${c.client.name}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <Badge variant={priorityVariant(c.priority)}>{humanize(c.priority)}</Badge>
                    <ArrowRight className="h-3.5 w-3.5 text-ink-300" />
                  </div>
                </button>
              ))
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Upcoming events */}
          <div>
            <SectionHeader title="Upcoming" action={{ label: 'Calendar', onClick: () => onNavigate('calendar') }} />
            <Card className="divide-y divide-ink-100">
              {upcomingEvents.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-ink-400">No upcoming events.</p>
              ) : (
                upcomingEvents.map((e) => (
                  <div key={e.id} className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <CalendarDays className="h-3.5 w-3.5 text-primary-500 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-800 truncate">{e.title}</p>
                        <p className="text-xs text-ink-500 mt-0.5">{formatDateTime(e.startTime)}</p>
                        {e.case && <p className="text-xs text-ink-400 truncate">{e.case.title}</p>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </Card>
          </div>

          {/* Recent Documents */}
          <div>
            <SectionHeader title="Recent Documents" action={{ label: 'View all', onClick: () => onNavigate('documents') }} />
            <Card className="divide-y divide-ink-100">
              {recentDocuments.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-ink-400">No documents yet.</p>
              ) : (
                recentDocuments.map((d) => (
                  <div key={d.id} className="px-4 py-3 flex items-start gap-2">
                    <FileText className="h-3.5 w-3.5 text-ink-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-800 truncate">{d.title}</p>
                      <p className="text-xs text-ink-500">{humanize(d.category)} · {formatDate(d.updatedAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-2">Quick actions</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate('cases')}>
            <Briefcase className="h-3.5 w-3.5" /> New case
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate('tasks')}>
            <CheckSquare className="h-3.5 w-3.5" /> New task
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate('calendar')}>
            <CalendarDays className="h-3.5 w-3.5" /> New event
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate('documents')}>
            <FileText className="h-3.5 w-3.5" /> Upload document
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, icon, color = 'gray', onClick,
}: {
  label: string; value: number; icon: React.ReactNode;
  color?: 'gray' | 'blue' | 'red'; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white border border-ink-200 rounded-xl px-4 py-4 text-left hover:border-ink-300 hover:shadow-soft transition-all w-full"
    >
      <div className={`inline-flex p-1.5 rounded-lg mb-2 ${
        color === 'blue' ? 'bg-primary-50 text-primary-600' :
        color === 'red' ? 'bg-red-50 text-red-600' :
        'bg-ink-100 text-ink-500'
      }`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-ink-900">{value}</p>
      <p className="text-xs text-ink-500 mt-0.5">{label}</p>
    </button>
  );
}

function SectionHeader({ title, action }: { title: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <p className="text-sm font-semibold text-ink-700">{title}</p>
      {action && (
        <button onClick={action.onClick} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1">
          {action.label} <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function priorityVariant(p: string): 'default' | 'blue' | 'yellow' | 'red' {
  if (p === 'URGENT') return 'red';
  if (p === 'HIGH') return 'yellow';
  if (p === 'MEDIUM') return 'blue';
  return 'default';
}
