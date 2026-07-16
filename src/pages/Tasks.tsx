import { useState } from 'react';
import { Plus, CheckSquare, Check, Clock, AlertTriangle } from 'lucide-react';
import { useApi } from '../hooks/useData';
import { tasksApi, type ApiTask } from '../lib/api';
import { TASK_STATUSES, TASK_PRIORITIES, humanize } from '../lib/constants';
import { formatDate, daysUntil } from '../lib/utils';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { clientsApi, casesApi, type ApiCase } from '../lib/api';
import { useEffect } from 'react';

interface Props {
  onOpenCase: (id: string) => void;
}

export function Tasks({ onOpenCase }: Props) {
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ApiTask | null>(null);
  const [deleting, setDeleting] = useState<ApiTask | null>(null);

  const { data, loading, refetch } = useApi(
    () => {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      return tasksApi.list(params);
    },
    [statusFilter, priorityFilter],
  );

  const tasks = Array.isArray(data?.tasks) ? data!.tasks : [];

  const handleStatusChange = async (task: ApiTask, status: ApiTask['status']) => {
    await tasksApi.update(task.id, { status });
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Tasks</h2>
          <p className="text-sm text-ink-500">{data?.total ?? 0} total</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> New task
        </Button>
      </div>

      <div className="flex gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 text-sm border border-ink-300 rounded-lg bg-white text-ink-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All statuses</option>
          {TASK_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="h-9 px-3 text-sm border border-ink-300 rounded-lg bg-white text-ink-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All priorities</option>
          {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{humanize(p)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-ink-100 rounded-xl animate-pulse" />)}</div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="h-8 w-8" />}
          title="No tasks found"
          description="Create tasks to track your work."
          action={{ label: 'New task', onClick: () => setShowForm(true) }}
        />
      ) : (
        <div className="bg-white border border-ink-200 rounded-xl divide-y divide-ink-100">
          {tasks.map((task) => {
            const days = daysUntil(task.dueDate);
            const isOverdue = days !== null && days < 0 && task.status !== 'DONE';
            return (
              <div key={task.id} className="flex items-center gap-3 px-4 py-3 hover:bg-ink-50 transition-colors">
                <button
                  onClick={() => handleStatusChange(task, task.status === 'DONE' ? 'TODO' : 'DONE')}
                  className={`shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                    task.status === 'DONE'
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-ink-300 hover:border-primary-500'
                  }`}
                >
                  {task.status === 'DONE' && <Check className="h-3 w-3 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.status === 'DONE' ? 'line-through text-ink-400' : 'text-ink-800'}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {task.case && (
                      <button onClick={() => onOpenCase(task.case!.id)} className="text-xs text-primary-600 hover:underline">
                        {task.case.title}
                      </button>
                    )}
                    {task.dueDate && (
                      <span className={`text-xs flex items-center gap-0.5 ${isOverdue ? 'text-red-600' : 'text-ink-400'}`}>
                        {isOverdue ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {formatDate(task.dueDate)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={task.priority === 'URGENT' ? 'red' : task.priority === 'HIGH' ? 'yellow' : 'default'}>
                    {humanize(task.priority)}
                  </Badge>
                  <button onClick={() => { setEditing(task); setShowForm(true); }} className="text-ink-400 hover:text-ink-700 p-1">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => setDeleting(task)} className="text-ink-400 hover:text-red-500 p-1">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <TaskFormModal
          existing={editing ?? undefined}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); refetch(); }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => { await tasksApi.delete(deleting!.id); setDeleting(null); refetch(); }}
        title="Delete task"
        message={`Delete "${deleting?.title}"?`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

// ── Task form modal ───────────────────────────────────────────────────────────

function TaskFormModal({ existing, onClose, onSaved }: { existing?: ApiTask; onClose: () => void; onSaved: () => void }) {
  const [cases, setCases] = useState<ApiCase[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: existing?.title ?? '',
    description: existing?.description ?? '',
    priority: existing?.priority ?? 'MEDIUM',
    status: existing?.status ?? 'TODO',
    dueDate: existing?.dueDate ? existing.dueDate.split('T')[0] : '',
    caseId: existing?.caseId ?? '',
  });

  useEffect(() => {
    casesApi.list({ limit: '100' }).then((r) => setCases(r.cases ?? [])).catch(() => {});
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        dueDate: form.dueDate || undefined,
        caseId: form.caseId || undefined,
        description: form.description || undefined,
      };
      if (existing) await tasksApi.update(existing.id, payload);
      else await tasksApi.create(payload);
      onSaved();
    } catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={true} title={existing ? 'Edit task' : 'New task'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1">Title *</label>
          <Input value={form.title} onChange={set('title')} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">Priority</label>
            <select value={form.priority} onChange={set('priority')} className="w-full h-9 px-3 text-sm border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{humanize(p)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">Status</label>
            <select value={form.status} onChange={set('status')} className="w-full h-9 px-3 text-sm border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              {TASK_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">Due date</label>
            <Input type="date" value={form.dueDate} onChange={set('dueDate')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">Linked case</label>
            <select value={form.caseId} onChange={set('caseId')} className="w-full h-9 px-3 text-sm border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">No case</option>
              {cases.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1">Description</label>
          <textarea value={form.description} onChange={set('description')} rows={2} className="w-full px-3 py-2 text-sm border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>{existing ? 'Save' : 'Create'}</Button>
        </div>
      </form>
    </Modal>
  );
}
