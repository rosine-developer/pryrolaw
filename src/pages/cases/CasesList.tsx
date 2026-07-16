import { useState } from 'react';
import { Plus, Search, Briefcase, ArrowUpDown } from 'lucide-react';
import { useApi } from '../../hooks/useData';
import { casesApi, type ApiCase } from '../../lib/api';
import { CASE_STATUSES, CASE_PRIORITIES, humanize } from '../../lib/constants';
import { formatDate } from '../../lib/utils';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { CaseFormModal } from './CaseFormModal';

interface Props {
  onOpenCase: (id: string) => void;
}

export function CasesList({ onOpenCase }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data, loading, refetch } = useApi(
    () => {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      return casesApi.list(params);
    },
    [search, statusFilter, priorityFilter],
  );

  const cases = Array.isArray(data?.cases) ? data!.cases : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Cases</h2>
          <p className="text-sm text-ink-500">{data?.total ?? 0} total cases</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> New case
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400" />
          <Input
            placeholder="Search cases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 text-sm border border-ink-300 rounded-lg bg-white text-ink-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All statuses</option>
          {CASE_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="h-9 px-3 text-sm border border-ink-300 rounded-lg bg-white text-ink-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All priorities</option>
          {CASE_PRIORITIES.map((p) => <option key={p} value={p}>{humanize(p)}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-ink-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : cases.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-8 w-8" />}
          title="No cases found"
          description={search || statusFilter || priorityFilter ? 'Try adjusting your filters.' : 'Create your first case to get started.'}
          action={!search && !statusFilter && !priorityFilter ? { label: 'New case', onClick: () => setShowForm(true) } : undefined}
        />
      ) : (
        <div className="bg-white border border-ink-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50/60">
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">
                  <span className="flex items-center gap-1">Case <ArrowUpDown className="h-3 w-3" /></span>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider hidden lg:table-cell">Client</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider hidden sm:table-cell">Priority</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider hidden lg:table-cell">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {cases.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => onOpenCase(c.id)}
                  className="hover:bg-ink-50 cursor-pointer transition-colors group"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-900 group-hover:text-primary-700 truncate max-w-xs">
                      {c.title}
                    </p>
                    <p className="text-xs text-ink-400 mt-0.5">{c.caseNumber}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-600 hidden md:table-cell whitespace-nowrap">{c.caseType}</td>
                  <td className="px-4 py-3 text-ink-600 hidden lg:table-cell">
                    {c.client?.name ?? <span className="text-ink-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(c.status)}>{humanize(c.status)}</Badge>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <Badge variant={priorityVariant(c.priority)}>{humanize(c.priority)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-400 text-xs hidden lg:table-cell whitespace-nowrap">
                    {formatDate(c.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <CaseFormModal
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); refetch(); }}
        />
      )}
    </div>
  );
}

function statusVariant(s: string): 'default' | 'blue' | 'yellow' | 'red' | 'green' {
  if (s === 'OPEN') return 'green';
  if (s === 'ON_HOLD') return 'yellow';
  if (s === 'CLOSED') return 'default';
  return 'default';
}

function priorityVariant(p: string): 'default' | 'blue' | 'yellow' | 'red' {
  if (p === 'URGENT') return 'red';
  if (p === 'HIGH') return 'yellow';
  if (p === 'MEDIUM') return 'blue';
  return 'default';
}
