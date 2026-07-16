import { useState } from 'react';
import { Plus, Search, Users, Building2, User } from 'lucide-react';
import { useApi } from '../hooks/useData';
import { clientsApi, type ApiClient } from '../lib/api';
import { formatDate } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export function Clients() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ApiClient | null>(null);
  const [deleting, setDeleting] = useState<ApiClient | null>(null);

  const { data: clients = [], loading, refetch } = useApi<ApiClient[]>(
    () => clientsApi.list(search || undefined),
    [search],
  );

  const safeClients = Array.isArray(clients) ? clients : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Clients</h2>
          <p className="text-sm text-ink-500">{safeClients.length} total clients</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> New client
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400" />
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-ink-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : safeClients.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="No clients yet"
          description="Add clients to link them to cases."
          action={{ label: 'New client', onClick: () => setShowForm(true) }}
        />
      ) : (
        <div className="bg-white border border-ink-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50/60">
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider hidden sm:table-cell">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider hidden lg:table-cell">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider hidden lg:table-cell">Added</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {safeClients.map((client) => (
                <tr key={client.id} className="hover:bg-ink-50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-100">
                        {client.type === 'ORGANIZATION'
                          ? <Building2 className="h-3.5 w-3.5 text-ink-500" />
                          : <User className="h-3.5 w-3.5 text-ink-500" />}
                      </div>
                      <div>
                        <p className="font-medium text-ink-900">{client.name}</p>
                        {client.company && <p className="text-xs text-ink-400">{client.company}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs text-ink-600 capitalize">
                      {client.type === 'ORGANIZATION' ? 'Organization' : 'Individual'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-600 hidden md:table-cell">
                    {client.email ?? <span className="text-ink-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-ink-600 hidden lg:table-cell">
                    {client.phone ?? <span className="text-ink-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-ink-400 text-xs hidden lg:table-cell whitespace-nowrap">
                    {formatDate(client.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                      <button
                        onClick={() => { setEditing(client); setShowForm(true); }}
                        className="p-1.5 rounded text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-colors"
                        title="Edit"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleting(client)}
                        className="p-1.5 rounded text-ink-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <ClientFormModal
          existing={editing ?? undefined}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); refetch(); }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => { await clientsApi.delete(deleting!.id); setDeleting(null); refetch(); }}
        title="Delete client"
        message={`Delete "${deleting?.name}"? They will be unlinked from any associated cases.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

// ── Client form modal ─────────────────────────────────────────────────────────

function ClientFormModal({
  existing,
  onClose,
  onSaved,
}: {
  existing?: ApiClient;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: existing?.name ?? '',
    type: existing?.type ?? 'INDIVIDUAL',
    email: existing?.email ?? '',
    phone: existing?.phone ?? '',
    address: existing?.address ?? '',
    company: existing?.company ?? '',
    notes: existing?.notes ?? '',
  });

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        email: form.email || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        company: form.company || undefined,
        notes: form.notes || undefined,
      };
      if (existing) {
        await clientsApi.update(existing.id, payload);
      } else {
        await clientsApi.create(payload);
      }
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={true} title={existing ? 'Edit client' : 'New client'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-ink-700 mb-1">Full name / Organization name *</label>
            <Input value={form.name} onChange={set('name')} required placeholder="e.g. Jane Doe or Acme Corp" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">Client type</label>
            <select
              value={form.type}
              onChange={set('type')}
              className="w-full h-9 px-3 text-sm border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="INDIVIDUAL">Individual</option>
              <option value="ORGANIZATION">Organization</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">Company</label>
            <Input value={form.company} onChange={set('company')} placeholder="Optional" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">Email</label>
            <Input type="email" value={form.email} onChange={set('email')} placeholder="Optional" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">Phone</label>
            <Input value={form.phone} onChange={set('phone')} placeholder="Optional" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-ink-700 mb-1">Address</label>
            <Input value={form.address} onChange={set('address')} placeholder="Optional" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-ink-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Any relevant notes..."
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>{existing ? 'Save changes' : 'Create client'}</Button>
        </div>
      </form>
    </Modal>
  );
}
