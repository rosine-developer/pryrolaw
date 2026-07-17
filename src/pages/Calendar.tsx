import { useState, useEffect, useRef } from 'react';
import { Plus, ChevronLeft, ChevronRight, Clock, Check, MapPin, X } from 'lucide-react';
import { useApi } from '../hooks/useData';
import { calendarApi, tasksApi, casesApi, type ApiCalendarEvent, type ApiTask, type ApiCase } from '../lib/api';
import { EVENT_TYPES, TASK_STATUSES, TASK_PRIORITIES, humanize } from '../lib/constants';
import { toInputDateTime } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

interface Props { onOpenCase: (id: string) => void; }

// ── Constants ─────────────────────────────────────────────────────────────────
const HOUR_START = 7;
const HOUR_END = 22;
const HOUR_HEIGHT = 60;

const EVENT_COLORS: Record<string, { bg: string; border: string; text: string; light: string }> = {
  HEARING:         { bg: 'bg-red-500',    border: 'border-red-600',    text: 'text-white',      light: 'bg-red-50 text-red-700 border-red-200' },
  MEETING:         { bg: 'bg-blue-500',   border: 'border-blue-600',   text: 'text-white',      light: 'bg-blue-50 text-blue-700 border-blue-200' },
  FILING_DEADLINE: { bg: 'bg-amber-500',  border: 'border-amber-600',  text: 'text-white',      light: 'bg-amber-50 text-amber-700 border-amber-200' },
  REMINDER:        { bg: 'bg-purple-500', border: 'border-purple-600', text: 'text-white',      light: 'bg-purple-50 text-purple-700 border-purple-200' },
  OTHER:           { bg: 'bg-slate-400',  border: 'border-slate-500',  text: 'text-white',      light: 'bg-slate-50 text-slate-700 border-slate-200' },
};

const TASK_PILL: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-700 border-red-300',
  HIGH:   'bg-amber-100 text-amber-700 border-amber-300',
  MEDIUM: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  LOW:    'bg-sky-100 text-sky-700 border-sky-300',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function startOfWeek(d: Date) {
  const r = new Date(d); r.setDate(d.getDate() - d.getDay()); r.setHours(0,0,0,0); return r;
}
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(d.getDate() + n); return r; }
function isSameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function timeToOffset(d: Date) { return (d.getHours() + d.getMinutes()/60 - HOUR_START) * HOUR_HEIGHT; }
function durationPx(s: Date, e: Date) {
  const hrs = (e.getTime() - s.getTime()) / 3_600_000;
  return Math.min(Math.max(hrs, 0.5), 8) * HOUR_HEIGHT; // clamp between 30min and 8hrs
}
function fmt12(d: Date) { return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
function daysInMonth(y: number, m: number) { return new Date(y, m+1, 0).getDate(); }
function firstDayOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay(); }

// ── Mini Month Picker ─────────────────────────────────────────────────────────
function MiniMonth({ focusDate, onSelect, events }: {
  focusDate: Date; onSelect: (d: Date) => void; events: ApiCalendarEvent[];
}) {
  const [viewing, setViewing] = useState({ y: focusDate.getFullYear(), m: focusDate.getMonth() });
  const today = new Date();
  const days = daysInMonth(viewing.y, viewing.m);
  const firstDay = firstDayOfMonth(viewing.y, viewing.m);
  const monthName = new Date(viewing.y, viewing.m).toLocaleDateString(undefined, { month: 'long' });

  const hasEvent = (day: number) => events.some(e => {
    const d = new Date(e.startTime);
    return d.getFullYear()===viewing.y && d.getMonth()===viewing.m && d.getDate()===day;
  });

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setViewing(v => { const d = new Date(v.y, v.m-1); return { y: d.getFullYear(), m: d.getMonth() }; })} className="p-1 rounded hover:bg-ink-100 text-ink-500"><ChevronLeft className="h-3.5 w-3.5" /></button>
        <button onClick={() => setViewing({ y: focusDate.getFullYear(), m: focusDate.getMonth() })} className="text-xs font-semibold text-ink-800 hover:text-primary-600">
          {monthName} {viewing.y}
        </button>
        <button onClick={() => setViewing(v => { const d = new Date(v.y, v.m+1); return { y: d.getFullYear(), m: d.getMonth() }; })} className="p-1 rounded hover:bg-ink-100 text-ink-500"><ChevronRight className="h-3.5 w-3.5" /></button>
      </div>
      <div className="grid grid-cols-7 gap-0 text-center">
        {['S','M','T','W','T','F','S'].map((d,i) => <div key={i} className="text-[10px] font-medium text-ink-400 py-0.5">{d}</div>)}
        {Array.from({ length: firstDay }).map((_,i) => <div key={`e${i}`} />)}
        {Array.from({ length: days }, (_, i) => i+1).map(day => {
          const isToday = today.getFullYear()===viewing.y && today.getMonth()===viewing.m && today.getDate()===day;
          const isFocus = focusDate.getFullYear()===viewing.y && focusDate.getMonth()===viewing.m && focusDate.getDate()===day;
          const dot = hasEvent(day);
          return (
            <button key={day} onClick={() => { const d = new Date(viewing.y, viewing.m, day); onSelect(d); }}
              className={`relative text-[11px] rounded-full w-6 h-6 mx-auto flex items-center justify-center transition-colors font-medium ${
                isToday ? 'bg-primary-600 text-white' :
                isFocus ? 'bg-primary-100 text-primary-700' :
                'text-ink-700 hover:bg-ink-100'
              }`}>
              {day}
              {dot && !isToday && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-400" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Event Card (hover popover) ────────────────────────────────────────────────
function EventCard({ event, onEdit, onDelete, onOpenCase, onClose }: {
  event: ApiCalendarEvent; onEdit: () => void; onDelete: () => void;
  onOpenCase: (id: string) => void; onClose: () => void;
}) {
  const c = EVENT_COLORS[event.eventType] ?? EVENT_COLORS.OTHER;
  const start = new Date(event.startTime); const end = new Date(event.endTime);
  return (
    <div className="w-72 bg-white rounded-xl shadow-2xl border border-ink-200 overflow-hidden z-50">
      <div className={`h-2 ${c.bg}`} />
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-ink-900 text-sm">{event.title}</p>
            <p className={`text-[11px] font-medium mt-0.5 ${c.bg.replace('bg-','text-')}`}>{humanize(event.eventType)}</p>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700 mt-0.5"><X className="h-3.5 w-3.5" /></button>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-ink-600">
          <Clock className="h-3 w-3 shrink-0" />
          <span>{start.toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' })}, {fmt12(start)} – {fmt12(end)}</span>
        </div>
        {event.location && (
          <div className="flex items-center gap-1.5 text-xs text-ink-600"><MapPin className="h-3 w-3 shrink-0" /><span>{event.location}</span></div>
        )}
        {event.case && (
          <button onClick={() => { onOpenCase(event.case!.id); onClose(); }} className="text-xs text-primary-600 hover:underline block">
            📁 {event.case.title}
          </button>
        )}
        {event.description && <p className="text-xs text-ink-500 border-t border-ink-100 pt-2">{event.description}</p>}
        <div className="flex gap-2 pt-1 border-t border-ink-100">
          <button onClick={onEdit} className="flex-1 text-xs font-medium text-primary-600 hover:text-primary-700 py-1">Edit</button>
          <button onClick={onDelete} className="flex-1 text-xs font-medium text-red-500 hover:text-red-700 py-1">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Week Grid ─────────────────────────────────────────────────────────────────
function WeekGrid({ days, events, tasks, onEditEvent, onDeleteEvent, onOpenCase }: {
  days: Date[]; events: ApiCalendarEvent[]; tasks: ApiTask[];
  onEditEvent: (e: ApiCalendarEvent) => void; onDeleteEvent: (e: ApiCalendarEvent) => void;
  onOpenCase: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [popover, setPopover] = useState<{ event: ApiCalendarEvent; x: number; y: number } | null>(null);
  const totalHeight = (HOUR_END - HOUR_START) * HOUR_HEIGHT;
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
  const now = new Date();
  const nowOffset = timeToOffset(now);
  const todayInView = days.some(d => isSameDay(d, now));

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, timeToOffset(now) - 120);
    }
  }, []);

  return (
    <div className="border border-ink-200 rounded-xl overflow-hidden bg-white flex-1 relative shadow-card" onClick={() => setPopover(null)}>
      {/* Day headers */}
      <div className="grid sticky top-0 z-10 bg-white border-b border-ink-200" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
        <div className="border-r border-ink-100" />
        {days.map(d => {
          const isToday = isSameDay(d, new Date());
          return (
            <div key={d.toISOString()} className={`py-2 text-center border-r border-ink-100 last:border-r-0 ${isToday ? 'bg-primary-50' : ''}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">{d.toLocaleDateString(undefined,{weekday:'short'})}</p>
              <div className={`text-sm font-bold w-8 h-8 flex items-center justify-center mx-auto rounded-full mt-0.5 ${isToday ? 'bg-primary-600 text-white' : 'text-ink-800'}`}>
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable body */}
      <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: 580 }}>
        <div className="relative" style={{ height: totalHeight }}>
          {/* Hour lines + labels */}
          {hours.map(h => (
            <div key={h} className="absolute w-full flex" style={{ top: (h - HOUR_START) * HOUR_HEIGHT }}>
              <div className="w-13 pr-2 text-right shrink-0 w-[52px]">
                <span className="text-[11px] text-ink-400 -mt-2 block leading-none">{h%12||12}{h<12?'am':'pm'}</span>
              </div>
              <div className="flex-1 border-t border-ink-100" />
            </div>
          ))}

          {/* Day columns */}
          <div className="absolute inset-0 ml-[52px] grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {days.map((day, di) => {
              const dayEvents = events.filter(e => isSameDay(new Date(e.startTime), day));
              const dayTasks = tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), day) && t.status !== 'DONE');
              return (
                <div key={di} className="relative border-r border-ink-100 last:border-r-0">
                  {/* Half-hour lines */}
                  {hours.map(h => (
                    <div key={h} className="absolute w-full border-t border-ink-50" style={{ top: (h - HOUR_START + 0.5) * HOUR_HEIGHT }} />
                  ))}

                  {/* Events */}
                  {dayEvents.map(ev => {
                    const s = new Date(ev.startTime); const e = new Date(ev.endTime);
                    const top = Math.max(0, timeToOffset(s));
                    const rawHeight = durationPx(s, e);
                    const maxHeight = totalHeight - top;
                    const height = Math.min(rawHeight, maxHeight);
                    const c = EVENT_COLORS[ev.eventType] ?? EVENT_COLORS.OTHER;
                    return (
                      <div key={ev.id}
                        className={`absolute left-0.5 right-0.5 rounded-lg px-2 py-1 cursor-pointer overflow-hidden border-l-4 ${c.bg} ${c.border} ${c.text} shadow-sm hover:opacity-90 transition-opacity`}
                        style={{ top, height: 52, zIndex: 2 }}
                        onClick={e2 => { e2.stopPropagation(); const r = e2.currentTarget.getBoundingClientRect(); setPopover({ event: ev, x: r.right + 8, y: r.top }); }}
                      >
                        <p className="text-[11px] font-semibold leading-tight truncate">{ev.title}</p>
                        <p className="text-[10px] opacity-80">{fmt12(s)}</p>
                      </div>
                    );
                  })}

                  {/* Task pills at top of column */}
                  {dayTasks.map((task, ti) => (
                    <div key={task.id}
                      className={`absolute left-0.5 right-0.5 rounded border px-1.5 py-0.5 text-[10px] font-medium truncate ${TASK_PILL[task.priority] ?? TASK_PILL.MEDIUM}`}
                      style={{ top: 2 + ti * 22, zIndex: 2 }}
                      title={task.title}
                    >✓ {task.title}</div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Now indicator */}
          {todayInView && nowOffset >= 0 && nowOffset <= totalHeight && (
            <div className="absolute left-[52px] right-0 flex items-center pointer-events-none z-10" style={{ top: nowOffset }}>
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 shrink-0" />
              <div className="flex-1 border-t-2 border-red-500" />
            </div>
          )}
        </div>
      </div>

      {/* Event popover */}
      {popover && (
        <div className="fixed z-50" style={{ left: Math.min(popover.x, window.innerWidth - 310), top: Math.min(popover.y, window.innerHeight - 300) }}
          onClick={e => e.stopPropagation()}>
          <EventCard
            event={popover.event}
            onEdit={() => { onEditEvent(popover.event); setPopover(null); }}
            onDelete={() => { onDeleteEvent(popover.event); setPopover(null); }}
            onOpenCase={onOpenCase}
            onClose={() => setPopover(null)}
          />
        </div>
      )}
    </div>
  );
}

// ── Tasks Tab ─────────────────────────────────────────────────────────────────
function TasksTab({ tasks, onRefetch }: { tasks: ApiTask[]; onRefetch: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ApiTask | null>(null);
  const [deleting, setDeleting] = useState<ApiTask | null>(null);
  const pending = tasks.filter(t => t.status !== 'DONE');
  const done = tasks.filter(t => t.status === 'DONE');

  const toggle = async (task: ApiTask) => {
    await tasksApi.update(task.id, { status: task.status === 'DONE' ? 'TODO' : 'DONE' });
    onRefetch();
  };

  const row = (task: ApiTask) => (
    <div key={task.id} className="flex items-center gap-3 px-4 py-3 hover:bg-ink-50 transition-colors">
      <button onClick={() => toggle(task)}
        className={`shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${task.status==='DONE' ? 'bg-emerald-500 border-emerald-500' : 'border-ink-300 hover:border-primary-500'}`}>
        {task.status==='DONE' && <Check className="h-3 w-3 text-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${task.status==='DONE' ? 'line-through text-ink-400' : 'text-ink-800'}`}>{task.title}</p>
        {task.dueDate && <p className="text-xs text-ink-500 mt-0.5"><Clock className="inline h-3 w-3 mr-0.5" />{new Date(task.dueDate).toLocaleDateString()}</p>}
      </div>
      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${TASK_PILL[task.priority]??TASK_PILL.MEDIUM}`}>{humanize(task.priority)}</span>
      <button onClick={() => { setEditing(task); setShowForm(true); }} className="text-xs text-ink-400 hover:text-ink-700 px-1">Edit</button>
      <button onClick={() => setDeleting(task)} className="text-xs text-ink-400 hover:text-red-500 px-1">Del</button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-ink-500">{pending.length} pending · {done.length} completed</p>
        <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="h-3.5 w-3.5" /> New task</Button>
      </div>
      <div className="bg-white border border-ink-200 rounded-xl divide-y divide-ink-100">
        {pending.length===0 && done.length===0 && <p className="px-4 py-10 text-center text-sm text-ink-400">No tasks yet.</p>}
        {pending.map(row)}
        {done.length > 0 && <>
          <p className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400 bg-ink-50">Completed</p>
          {done.map(row)}
        </>}
      </div>
      {showForm && <TaskFormModal existing={editing??undefined} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={() => { setShowForm(false); setEditing(null); onRefetch(); }} />}
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={async () => { await tasksApi.delete(deleting!.id); setDeleting(null); onRefetch(); }} title="Delete task" message={`Delete "${deleting?.title}"?`} confirmLabel="Delete" variant="danger" />
    </div>
  );
}

// ── Main Calendar ─────────────────────────────────────────────────────────────
export function Calendar({ onOpenCase }: Props) {
  const [tab, setTab] = useState<'calendar' | 'tasks'>('calendar');
  const [focusDate, setFocusDate] = useState(new Date());
  const weekStart = startOfWeek(focusDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = addDays(weekStart, 6);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ApiCalendarEvent | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<ApiCalendarEvent | null>(null);

  const { data: rawEvents, refetch: refetchEvents } = useApi(() => calendarApi.list({}), []);
  const events: ApiCalendarEvent[] = Array.isArray(rawEvents) ? rawEvents : [];

  const { data: taskData, refetch: refetchTasks } = useApi(() => tasksApi.list({ limit: '200' }), []);
  const tasks: ApiTask[] = Array.isArray(taskData?.tasks) ? taskData!.tasks : [];

  const rangeLabel = `${weekStart.toLocaleDateString(undefined,{month:'short',day:'numeric'})} – ${weekEnd.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}`;

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Button size="lg" onClick={() => { setEditingEvent(null); setShowEventForm(true); }}><Plus className="h-4 w-4" /> New event</Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-ink-200">
        {(['calendar','tasks'] as const).map(id => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${tab===id ? 'border-primary-600 text-primary-700' : 'border-transparent text-ink-500 hover:text-ink-800'}`}>
            {id === 'calendar' ? 'Calendar Overview' : 'Manage Tasks'}
          </button>
        ))}
      </div>

      {tab === 'calendar' && (
        <div className="flex gap-4 items-start">
          {/* Left sidebar: mini month + legend */}
          <div className="hidden lg:block w-44 shrink-0 space-y-4">
            <MiniMonth focusDate={focusDate} onSelect={setFocusDate} events={events} />
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Legend</p>
              {Object.entries(EVENT_COLORS).map(([k, c]) => (
                <div key={k} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-sm ${c.bg}`} />
                  <span className="text-[11px] text-ink-600">{humanize(k)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Main grid */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Week nav */}
            <div className="flex items-center gap-2">
              <button onClick={() => setFocusDate(d => addDays(d, -7))} className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-500"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => setFocusDate(d => addDays(d, 7))} className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-500"><ChevronRight className="h-4 w-4" /></button>
              <button onClick={() => setFocusDate(new Date())} className="px-3 py-1 text-xs font-medium rounded-lg border border-ink-200 hover:bg-ink-50 text-ink-700">Today</button>
              <span className="text-sm font-medium text-ink-700">{rangeLabel}</span>
            </div>

            <WeekGrid days={days} events={events} tasks={tasks}
              onEditEvent={e => { setEditingEvent(e); setShowEventForm(true); }}
              onDeleteEvent={setDeletingEvent}
              onOpenCase={onOpenCase}
            />
          </div>
        </div>
      )}

      {tab === 'tasks' && <TasksTab tasks={tasks} onRefetch={refetchTasks} />}

      {showEventForm && (
        <EventFormModal existing={editingEvent??undefined}
          onClose={() => { setShowEventForm(false); setEditingEvent(null); }}
          onSaved={() => { setShowEventForm(false); setEditingEvent(null); refetchEvents(); }} />
      )}
      <ConfirmDialog open={!!deletingEvent} onClose={() => setDeletingEvent(null)}
        onConfirm={async () => { await calendarApi.delete(deletingEvent!.id); setDeletingEvent(null); refetchEvents(); }}
        title="Delete event" message={`Delete "${deletingEvent?.title}"?`} confirmLabel="Delete" variant="danger" />
    </div>
  );
}

// ── Event Form Modal ──────────────────────────────────────────────────────────
function EventFormModal({ existing, onClose, onSaved }: { existing?: ApiCalendarEvent; onClose: () => void; onSaved: () => void }) {
  const [cases, setCases] = useState<ApiCase[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: existing?.title ?? '', description: existing?.description ?? '',
    eventType: existing?.eventType ?? 'MEETING', location: existing?.location ?? '',
    startTime: toInputDateTime(existing?.startTime), endTime: toInputDateTime(existing?.endTime),
    reminderMinutes: String(existing?.reminderMinutes ?? 30), caseId: existing?.caseId ?? '',
  });
  useEffect(() => { casesApi.list({ limit: '100' }).then(r => setCases(r.cases ?? [])).catch(() => {}); }, []);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const payload = { ...form, reminderMinutes: Number(form.reminderMinutes), caseId: form.caseId||undefined, description: form.description||undefined, location: form.location||undefined };
      existing ? await calendarApi.update(existing.id, payload) : await calendarApi.create(payload);
      onSaved();
    } catch (err) { setError((err as Error).message); } finally { setSaving(false); }
  };
  return (
    <Modal open title={existing ? 'Edit event' : 'New event'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Title *" value={form.title} onChange={set('title')} required />
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-xs font-medium text-ink-700 mb-1">Event type</label>
            <select value={form.eventType} onChange={set('eventType')} className="w-full h-9 px-3 text-sm border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              {EVENT_TYPES.map(t => <option key={t} value={t}>{humanize(t)}</option>)}
            </select></div>
          <div><label className="block text-xs font-medium text-ink-700 mb-1">Linked case</label>
            <select value={form.caseId} onChange={set('caseId')} className="w-full h-9 px-3 text-sm border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">No case</option>
              {cases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start *" type="datetime-local" value={form.startTime} onChange={set('startTime')} required />
          <Input label="End *" type="datetime-local" value={form.endTime} onChange={set('endTime')} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Location" value={form.location} onChange={set('location')} placeholder="Optional" />
          <Input label="Reminder (mins)" type="number" value={form.reminderMinutes} onChange={set('reminderMinutes')} min="0" />
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

// ── Task Form Modal ───────────────────────────────────────────────────────────
function TaskFormModal({ existing, onClose, onSaved }: { existing?: ApiTask; onClose: () => void; onSaved: () => void }) {
  const [cases, setCases] = useState<ApiCase[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: existing?.title ?? '', description: existing?.description ?? '',
    priority: existing?.priority ?? 'MEDIUM', status: existing?.status ?? 'TODO',
    dueDate: existing?.dueDate ? existing.dueDate.split('T')[0] : '', caseId: existing?.caseId ?? '',
  });
  useEffect(() => { casesApi.list({ limit: '100' }).then(r => setCases(r.cases ?? [])).catch(() => {}); }, []);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const payload = { ...form, caseId: form.caseId||undefined, description: form.description||undefined, dueDate: form.dueDate||undefined };
      existing ? await tasksApi.update(existing.id, payload) : await tasksApi.create(payload);
      onSaved();
    } catch (err) { setError((err as Error).message); } finally { setSaving(false); }
  };
  return (
    <Modal open title={existing ? 'Edit task' : 'New task'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Title *" value={form.title} onChange={set('title')} required />
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-xs font-medium text-ink-700 mb-1">Priority</label>
            <select value={form.priority} onChange={set('priority')} className="w-full h-9 px-3 text-sm border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              {TASK_PRIORITIES.map(p => <option key={p} value={p}>{humanize(p)}</option>)}
            </select></div>
          <div><label className="block text-xs font-medium text-ink-700 mb-1">Status</label>
            <select value={form.status} onChange={set('status')} className="w-full h-9 px-3 text-sm border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              {TASK_STATUSES.map(s => <option key={s} value={s}>{humanize(s)}</option>)}
            </select></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Due date" type="date" value={form.dueDate} onChange={set('dueDate')} />
          <div><label className="block text-xs font-medium text-ink-700 mb-1">Linked case</label>
            <select value={form.caseId} onChange={set('caseId')} className="w-full h-9 px-3 text-sm border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">No case</option>
              {cases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select></div>
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
