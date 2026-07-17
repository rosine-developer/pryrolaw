import { Briefcase, CheckSquare, CalendarDays, AlertTriangle, ArrowRight, FileText } from 'lucide-react';
import { useApi } from '../hooks/useData';
import { dashboardApi, type ApiDashboard } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/EmptyState';
import type { View } from '../components/layout/AppLayout';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

interface Props {
  onNavigate: (v: View) => void;
  onOpenCase: (id: string) => void;
  onOpenAI: () => void;
}

const BLUE = '#3b82f6';
const YELLOW = '#f59e0b';
const RED = '#ef4444';
const GREEN = '#10b981';
const GRAY = '#94a3b8';

export function Dashboard({ onNavigate }: Props) {
  const { data, loading, error } = useApi<ApiDashboard>(() => dashboardApi.getSummary(), []);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-6 w-6" /></div>;
  if (error) return <div className="py-10 text-center text-red-600 text-sm">{error}</div>;
  if (!data) return null;

  const { stats, upcomingEvents } = data;

  // Cases chart — donut breakdown
  const casesData = [
    { name: 'Open', value: stats.openCases },
    { name: 'Urgent', value: stats.urgentCases },
    { name: 'Closed', value: Math.max(0, stats.totalCases - stats.openCases - stats.urgentCases) },
  ].filter(d => d.value > 0);
  const caseColors = [BLUE, RED, GREEN];

  // Tasks chart — bar
  const tasksData = [
    { name: 'Pending', value: stats.pendingTasks },
    { name: 'Overdue', value: stats.overdueTasks },
  ];

  // Events chart — count by day of week from upcomingEvents
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const eventsByDay = Array.from({ length: 7 }, (_, i) => ({ name: dayNames[i], value: 0 }));
  upcomingEvents.forEach(e => {
    const day = new Date(e.startTime).getDay();
    eventsByDay[day].value += 1;
  });

  return (
    <div className="space-y-6">

      {/* 4 Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Cases" value={stats.totalCases} icon={<Briefcase className="h-4 w-4" />} onClick={() => onNavigate('cases')} />
        <StatCard label="Upcoming Events" value={upcomingEvents.length} icon={<CalendarDays className="h-4 w-4" />} color="blue" onClick={() => onNavigate('calendar')} />
        <StatCard label="Urgent Cases" value={stats.urgentCases} icon={<AlertTriangle className="h-4 w-4" />} color={stats.urgentCases > 0 ? 'red' : 'gray'} onClick={() => onNavigate('cases')} />
        <StatCard label="Overdue Tasks" value={stats.overdueTasks} icon={<AlertTriangle className="h-4 w-4" />} color={stats.overdueTasks > 0 ? 'red' : 'gray'} onClick={() => onNavigate('tasks')} />
      </div>

      {/* 3 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Cases donut */}
        <Card className="p-5">
          <p className="text-sm font-semibold text-ink-700 mb-1">Cases</p>
          <p className="text-xs text-ink-400 mb-4">Breakdown by status</p>
          {casesData.length === 0 ? (
            <div className="flex items-center justify-center h-44 text-sm text-ink-400">No cases yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={casesData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                  {casesData.map((_, i) => <Cell key={i} fill={caseColors[i % caseColors.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [`${v}`, '']} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Tasks bar */}
        <Card className="p-5">
          <p className="text-sm font-semibold text-ink-700 mb-1">Tasks</p>
          <p className="text-xs text-ink-400 mb-4">Pending vs overdue</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={tasksData} barSize={40}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={20} />
              <Tooltip cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {tasksData.map((entry, i) => (
                  <Cell key={i} fill={entry.name === 'Overdue' && entry.value > 0 ? RED : BLUE} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Events by day */}
        <Card className="p-5">
          <p className="text-sm font-semibold text-ink-700 mb-1">Events</p>
          <p className="text-xs text-ink-400 mb-4">Upcoming by day of week</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={eventsByDay} barSize={20}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={20} />
              <Tooltip cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} fill={GREEN} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
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
