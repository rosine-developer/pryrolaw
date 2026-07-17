import { useState, useRef } from 'react';
import { Plus, FileText, Search, Upload, Tag } from 'lucide-react';
import { useApi } from '../hooks/useData';
import { documentsApi, casesApi, type ApiDocument, type ApiCase } from '../lib/api';
import { DOCUMENT_CATEGORIES, DOCUMENT_STATUSES, humanize } from '../lib/constants';
import { formatDate, formatFileSize } from '../lib/utils';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useEffect } from 'react';

interface Props {
  onOpenCase: (id: string) => void;
}

export function Documents({ onOpenCase }: Props) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ApiDocument | null>(null);
  const [deleting, setDeleting] = useState<ApiDocument | null>(null);

  const { data, loading, refetch } = useApi(
    () => {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;
      if (statusFilter) params.status = statusFilter;
      return documentsApi.list(params);
    },
    [search, categoryFilter, statusFilter],
  );

  const docs = Array.isArray(data?.documents) ? data!.documents : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">{data?.total ?? 0} total</p>
        <Button size="lg" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> Add document
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400" />
          <Input placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-9 px-3 text-sm border border-ink-300 rounded-lg bg-white text-ink-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">All categories</option>
          {DOCUMENT_CATEGORIES.map((c) => <option key={c} value={c}>{humanize(c)}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 px-3 text-sm border border-ink-300 rounded-lg bg-white text-ink-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">All statuses</option>
          {DOCUMENT_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-ink-100 rounded-xl animate-pulse" />)}</div>
      ) : docs.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title="No documents found"
          description="Upload legal documents to keep them organized."
          action={{ label: 'Add document', onClick: () => setShowForm(true) }}
        />
      ) : (
        <div className="bg-white border border-ink-200 rounded-xl divide-y divide-ink-100">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between px-4 py-3 hover:bg-ink-50 transition-colors">
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-100">
                  <FileText className="h-4 w-4 text-ink-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-800 truncate">{doc.title}</p>
                  <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
                    <span className="text-xs text-ink-500">{humanize(doc.category)}</span>
                    <span className="text-xs text-ink-300">·</span>
                    <span className="text-xs text-ink-500">{doc.fileType.toUpperCase()}</span>
                    {doc.fileSize && <><span className="text-xs text-ink-300">·</span><span className="text-xs text-ink-500">{formatFileSize(doc.fileSize)}</span></>}
                    {doc.case && (
                      <><span className="text-xs text-ink-300">·</span>
                      <button onClick={() => onOpenCase(doc.case!.id)} className="text-xs text-primary-600 hover:underline truncate max-w-32">{doc.case.title}</button></>
                    )}
                  </div>
                  {doc.tags.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {doc.tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-0.5 text-[10px] bg-ink-100 text-ink-500 px-1.5 py-0.5 rounded-full">
                          <Tag className="h-2.5 w-2.5" />{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                <Badge variant={doc.status === 'FINAL' ? 'green' : doc.status === 'ARCHIVED' ? 'default' : 'blue'}>
                  {humanize(doc.status)}
                </Badge>
                <span className="text-xs text-ink-400 hidden sm:block">{formatDate(doc.updatedAt)}</span>
                <button onClick={() => { setEditing(doc); setShowForm(true); }} className="text-ink-400 hover:text-ink-700 p-1">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button onClick={() => setDeleting(doc)} className="text-ink-400 hover:text-red-500 p-1">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <DocumentFormModal
          existing={editing ?? undefined}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); refetch(); }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => { await documentsApi.delete(deleting!.id); setDeleting(null); refetch(); }}
        title="Delete document"
        message={`Delete "${deleting?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

// ── Document form modal ───────────────────────────────────────────────────────

function DocumentFormModal({ existing, onClose, onSaved }: { existing?: ApiDocument; onClose: () => void; onSaved: () => void }) {
  const [cases, setCases] = useState<ApiCase[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: existing?.title ?? '',
    category: existing?.category ?? 'GENERAL',
    status: existing?.status ?? 'DRAFT',
    description: existing?.description ?? '',
    tags: existing?.tags.join(', ') ?? '',
    caseId: existing?.caseId ?? '',
    fileType: existing?.fileType ?? 'pdf',
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
      const file = fileRef.current?.files?.[0];
      const tags = JSON.stringify(form.tags.split(',').map((t) => t.trim()).filter(Boolean));

      if (existing) {
        await documentsApi.update(existing.id, {
          title: form.title,
          category: form.category as ApiDocument['category'],
          status: form.status as ApiDocument['status'],
          description: form.description || undefined,
          tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
          caseId: form.caseId || null,
        });
      } else {
        const fd = new FormData();
        fd.append('title', form.title);
        fd.append('category', form.category);
        fd.append('status', form.status);
        if (form.description) fd.append('description', form.description);
        if (form.caseId) fd.append('caseId', form.caseId);
        fd.append('tags', tags);
        if (file) {
          fd.append('file', file);
        } else {
          fd.append('fileType', form.fileType);
        }
        await documentsApi.create(fd);
      }
      onSaved();
    } catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={true} title={existing ? 'Edit document' : 'Add document'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1">Title *</label>
          <Input value={form.title} onChange={set('title')} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">Category</label>
            <select value={form.category} onChange={set('category')} className="w-full h-9 px-3 text-sm border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              {DOCUMENT_CATEGORIES.map((c) => <option key={c} value={c}>{humanize(c)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">Status</label>
            <select value={form.status} onChange={set('status')} className="w-full h-9 px-3 text-sm border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              {DOCUMENT_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">Linked case</label>
            <select value={form.caseId} onChange={set('caseId')} className="w-full h-9 px-3 text-sm border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">No case</option>
              {cases.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">Tags (comma-separated)</label>
            <Input value={form.tags} onChange={set('tags')} placeholder="e.g. urgent, discovery" />
          </div>
        </div>
        {!existing && (
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">File</label>
            <div className="border-2 border-dashed border-ink-200 rounded-lg p-4 text-center hover:border-primary-400 transition-colors cursor-pointer" onClick={() => fileRef.current?.click()}>
              <Upload className="h-5 w-5 text-ink-400 mx-auto mb-1" />
              <p className="text-xs text-ink-500">Click to upload or drag a file</p>
              <p className="text-[11px] text-ink-400 mt-0.5">PDF, DOCX, images up to 20MB</p>
              <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,.xls,.xlsx" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setForm((prev) => ({ ...prev, title: prev.title || f.name.replace(/\.[^.]+$/, ''), fileType: f.name.split('.').pop() ?? 'pdf' }));
              }} />
            </div>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1">Description</label>
          <textarea value={form.description} onChange={set('description')} rows={2} className="w-full px-3 py-2 text-sm border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>{existing ? 'Save' : 'Add document'}</Button>
        </div>
      </form>
    </Modal>
  );
}
