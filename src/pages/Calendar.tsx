import { useState, useEffect } from 'react';
import { Plus, CalendarDays, MapPin, Clock } from 'lucide-react';
import { useApi } from '../hooks/useData';
import { calendarApi, casesApi, type ApiCalendarEvent, type ApiCase } from '../lib/api';
import { EVENT_TYPES, humanize } from '../lib/constants';
import { formatDateTime, toInputDateTime } from '../lib/utils';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

interface Props {
  onOpenCase: (id: string) => void;
}

export function Calendar({ onOpenCase }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ApiCalendarEvent | null>(null);
  const [deleting, setDeleting] = useState<ApiCalendarEvent | null>(null);
  const [typeFilter, setTypeFilter] = useState('');

  const { data: rawEvents, loading, refetch } = useApi(
    () => {
      const params: Record<string, string> = {};
      if (typeFilter) params.eventType = typeFilter;
      return calendarApi.list(params);
    },
    [typeFilter],
  );

  const events: ApiCalendarEvent[] = Array.isArray(rawEvents) ? rawEvents : [];

  const grouped = groupByDate(events);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Calendar</h2>
          <p className="text-sm text-ink-500">{events.length} events</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> New event
        </Button>
      </div>

      <div className="flex gap-2">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 px-3 text-sm border border-ink-300 rounded-lg bg-white text-ink-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All types</option>
          {EVENT_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-ink-100 rounded-xl animate-pulse" />)}</div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-8 w-8" />}
          title="No events"
          description="Schedule hearings, deadlines, and meetings."
          action={{ label: 'New event', onClick: () => setShowForm(true) }}
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateLabel, dayEvents]) => (
            <div key={dateLabel}>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-2">{dateLabel}</p>
              <div className="bg-white border border-ink-200 rounded-xl divide-y divide-ink-100">
                {dayEvents.map((event) => (
                  <div key={event.id} className="flex items-start justify-between px-4 py-3 hover:bg-ink-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${eventTypeColor(event.eventType)}`}>
                        <CalendarDays className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink-800">{event.title}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                          <span className="text-xs text-ink-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDateTime(event.startTime)}
                          </span>
                          {event.location && (
                            <span className="text-xs text-ink-500 flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {event.location}
                            </span>
                          )}
                          {event.case && (
                            <button onClick={() => onOpenCase(event.case!.id)} className="text-xs text-primary-600 hover:underline">
                              {event.case.title}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <Badge variant="default">{humanize(event.eventType)}</Badge>
                      <button onClick={() => { setEditing(event); setShowForm(true); }} className="text-ink-400 hover:text-ink-700 p-1">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => setDeleting(event)} className="text-ink-400 hover:text-red-500 p-1">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <EventFormModal
          existing={editing ?? undefined}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); refetch(); }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => { await calendarApi.delete(deleting!.id); setDeleting(null); refetch(); }}
        title="Delete event"
        message={`Delete "${deleting?.title}"?`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

function groupByDate(events: ApiCalendarEvent[]): Record<string, ApiCalendarEvent[]> {
  const result: Record<string, ApiCalendarEvent[]> = {};
  if (!Array.isArray(events)) return result;
  for (const e of events) {
    const d = new Date(e.startTime);
    const label = d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (!result[label]) result[label] = [];
    result[label].push(e);
  }
  return result;
}

function eventTypeColor(type: string): string {
  if (type === 'HEARING') return 'bg-red-50 text-red-600';
  if (type === 'MEETING') return 'bg-blue-50 text-blue-600';
  if (type === 'FILING_DEADLINE') return 'bg-amber-50 text-amber-600';
  if (type === 'REMINDER') return 'bg-purple-50 text-purple-600';
  return 'bg-ink-100 text-ink-500';
}

// ── Event form modal ──────────────────────────────────────────────────────────

function EventFormModal({ existing, onClose, onSaved }: { existing?: ApiCalendarEvent; onClose: () => void; onSaved: () => void }) {
  const [cases, setCases] = useState<ApiCase[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: existing?.title ?? '',
    description: existing?.description ?? '',
    eventType: existing?.eventType ?? 'MEETING',
    location: existing?.location ?? '',
    startTime: toInputDateTime(existing?.startTime),
    endTime: toInputDateTime(existing?.endTime),
    reminderMinutes: String(existing?.reminderMinutes ?? 30),
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
        reminderMinutes: Number(form.reminderMinutes),
        caseId: form.caseId || undefined,
        description: form.description || undefined,
        location: form.location || undefined,
      };
      if (existing) await calendarApi.update(existing.id, payload);
      else await calendarApi.create(payload);
      onSaved();
    } catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={true} title={existing ? 'Edit event' : 'New event'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1">Title *</label>
          <Input value={form.title} onChange={set('title')} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">Event type</label>
            <select value={form.eventType} onChange={set('eventType')} className="w-full h-9 px-3 text-sm border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              {EVENT_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">Linked case</label>
            <select value={form.caseId} onChange={set('caseId')} className="w-full h-9 px-3 text-sm border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">No case</option>
              {cases.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">Start *</label>
            <Input type="datetime-local" value={form.startTime} onChange={set('startTime')} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">End *</label>
            <Input type="datetime-local" value={form.endTime} onChange={set('endTime')} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">Location</label>
            <Input value={form.location} onChange={set('location')} placeholder="Optional" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">Reminder (mins)</label>
            <Input type="number" value={form.reminderMinutes} onChange={set('reminderMinutes')} min="0" />
          </div>
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
