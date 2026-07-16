import { useState } from 'react';
import { ArrowLeft, Edit2, Trash2, Plus, Sparkles, FileText, CheckSquare, CalendarDays, Clock, StickyNote } from 'lucide-react';
import { useApi } from '../../hooks/useData';
import { casesApi, type ApiCase } from '../../lib/api';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { CaseFormModal } from './CaseFormModal';
import { humanize } from '../../lib/constants';
import { formatDate, formatDateTime } from '../../lib/utils';

interface Props {
  caseId: string;
  onBack: () => void;
  onOpenAIConversation: (conversationId: string, caseId: string) => void;
}

type Tab = 'overview' | 'documents' | 'tasks' | 'timeline' | 'notes';

export function CaseDetail({ caseId, onBack, onOpenAIConversation }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [deletingNote, setDeletingNote] = useState<string | null>(null);

  const { data: c, loading, error, refetch } = useApi<ApiCase>(
    () => casesApi.getById(caseId),
    [caseId],
  );

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-6 w-6" /></div>;
  if (error || !c) return <div className="py-10 text-center text-red-600 text-sm">{error ?? 'Case not found.'}</div>;

  const handleDelete = async () => {
    await casesApi.delete(c.id);
    onBack();
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    setSavingNote(true);
    try {
      await casesApi.createNote(c.id, noteContent.trim());
      setNoteContent('');
      refetch();
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    setDeletingNote(noteId);
    try {
      await casesApi.deleteNote(c.id, noteId);
      refetch();
    } finally {
      setDeletingNote(null);
    }
  };

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'notes', label: 'Notes', count: c.notes?.length },
    { id: 'documents', label: 'Documents', count: c.documents?.length },
    { id: 'tasks', label: 'Tasks', count: c.tasks?.length },
    { id: 'timeline', label: 'Timeline', count: c.timeline?.length },
  ];

  return (
    <div className="space-y-4">
      {/* Back + header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <button onClick={onBack} className="mt-0.5 p-1.5 rounded-lg hover:bg-ink-100 transition-colors text-ink-500">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-ink-900">{c.title}</h2>
            <p className="text-sm text-ink-500">{c.caseNumber} · {c.caseType}{c.jurisdiction && ` · ${c.jurisdiction}`}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            if (c.conversations && c.conversations.length > 0) {
              onOpenAIConversation(c.conversations[0].id, c.id);
            } else {
              onOpenAIConversation('new', c.id);
            }
          }}>
            <Sparkles className="h-3.5 w-3.5" /> AI Assistant
          </Button>
          <Button variant="outline" size="icon" onClick={() => setShowEdit(true)}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setShowDelete(true)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>

      {/* Status + priority badges */}
      <div className="flex gap-2">
        <Badge variant={c.status === 'OPEN' ? 'green' : c.status === 'ON_HOLD' ? 'yellow' : 'default'}>
          {humanize(c.status)}
        </Badge>
        <Badge variant={c.priority === 'URGENT' ? 'red' : c.priority === 'HIGH' ? 'yellow' : 'blue'}>
          {humanize(c.priority)}
        </Badge>
        {c.client && <Badge variant="default">{c.client.name}</Badge>}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ink-200 gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-ink-500 hover:text-ink-700'
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-1.5 text-[11px] bg-ink-100 text-ink-600 rounded-full px-1.5 py-0.5">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Case details</p>
            <Detail label="Case number" value={c.caseNumber} />
            <Detail label="Type" value={c.caseType} />
            <Detail label="Jurisdiction" value={c.jurisdiction} />
            <Detail label="Opposing party" value={c.opposingParty} />
            <Detail label="Assigned lawyer" value={c.assignedLawyer} />
            <Detail label="Created" value={formatDate(c.createdAt)} />
            <Detail label="Last updated" value={formatDate(c.updatedAt)} />
          </Card>
          {c.description && (
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-2">Description</p>
              <p className="text-sm text-ink-700 leading-relaxed">{c.description}</p>
            </Card>
          )}
          {c.client && (
            <Card className="p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Client</p>
              <Detail label="Name" value={c.client.name} />
              <Detail label="Type" value={humanize(c.client.type)} />
              <Detail label="Email" value={c.client.email} />
              <Detail label="Phone" value={c.client.phone} />
              {c.client.company && <Detail label="Company" value={c.client.company} />}
            </Card>
          )}
        </div>
      )}

      {tab === 'notes' && (
        <div className="space-y-3">
          <form onSubmit={handleAddNote} className="flex gap-2">
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Add a note..."
              rows={2}
              className="flex-1 px-3 py-2 text-sm border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
            <Button type="submit" loading={savingNote} disabled={!noteContent.trim()} size="sm">
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </form>
          {c.notes?.length === 0 && (
            <p className="text-sm text-ink-400 text-center py-6">No notes yet.</p>
          )}
          {c.notes?.map((note) => (
            <Card key={note.id} className="p-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-ink-700 whitespace-pre-wrap">{note.content}</p>
                <p className="text-xs text-ink-400 mt-1">{formatDateTime(note.createdAt)}</p>
              </div>
              <button
                onClick={() => handleDeleteNote(note.id)}
                disabled={deletingNote === note.id}
                className="text-ink-300 hover:text-red-500 transition-colors shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </Card>
          ))}
        </div>
      )}

      {tab === 'documents' && (
        <div className="space-y-2">
          {c.documents?.length === 0 ? (
            <p className="text-sm text-ink-400 text-center py-6">No documents attached to this case.</p>
          ) : (
            c.documents?.map((doc) => (
              <Card key={doc.id} className="p-3 flex items-center gap-3">
                <FileText className="h-4 w-4 text-ink-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-800 truncate">{doc.title}</p>
                  <p className="text-xs text-ink-500">{humanize(doc.category)} · {humanize(doc.status)} · {formatDate(doc.updatedAt)}</p>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'tasks' && (
        <div className="space-y-2">
          {c.tasks?.length === 0 ? (
            <p className="text-sm text-ink-400 text-center py-6">No tasks for this case.</p>
          ) : (
            c.tasks?.map((task) => (
              <Card key={task.id} className="p-3 flex items-center gap-3">
                <CheckSquare className="h-4 w-4 text-ink-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-800 truncate">{task.title}</p>
                  <p className="text-xs text-ink-500">{humanize(task.status)} · {humanize(task.priority)}{task.dueDate ? ` · Due ${formatDate(task.dueDate)}` : ''}</p>
                </div>
                <Badge variant={task.status === 'DONE' ? 'green' : task.status === 'BLOCKED' ? 'red' : 'default'}>
                  {humanize(task.status)}
                </Badge>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'timeline' && (
        <div className="space-y-3">
          {c.timeline?.length === 0 ? (
            <p className="text-sm text-ink-400 text-center py-6">No timeline events yet.</p>
          ) : (
            <div className="relative pl-6 border-l-2 border-ink-200 space-y-4">
              {c.timeline?.map((event) => (
                <div key={event.id} className="relative">
                  <div className="absolute -left-[25px] top-1.5 h-3 w-3 rounded-full bg-primary-500 border-2 border-white" />
                  <p className="text-xs text-ink-400">{formatDate(event.eventDate)}</p>
                  <p className="text-sm font-medium text-ink-800">{event.title}</p>
                  <p className="text-xs text-ink-500">{event.eventType}</p>
                  {event.description && <p className="text-xs text-ink-600 mt-0.5">{event.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showEdit && (
        <CaseFormModal
          existing={c}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); refetch(); }}
        />
      )}

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete case"
        message={`Delete "${c.title}"? This will also delete all associated notes, tasks, documents, and conversations. This action cannot be undone.`}
        confirmLabel="Delete case"
        variant="danger"
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-ink-400 shrink-0">{label}</span>
      <span className="text-sm text-ink-700 text-right">{value}</span>
    </div>
  );
}
