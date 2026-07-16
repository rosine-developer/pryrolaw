import { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { casesApi, clientsApi, type ApiCase, type ApiClient } from '../../lib/api';
import { CASE_STATUSES, CASE_PRIORITIES, CASE_TYPES, JURISDICTIONS, humanize } from '../../lib/constants';

// Auto-generate a case number like CASE-2026-00042
function generateCaseNumber(): string {
  const year = new Date().getFullYear();
  const num = Math.floor(Math.random() * 90000) + 10000;
  return `CASE-${year}-${num}`;
}

interface Props {
  existing?: ApiCase;
  onClose: () => void;
  onSaved: (c: ApiCase) => void;
}

export function CaseFormModal({ existing, onClose, onSaved }: Props) {
  const isEdit = !!existing;
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: existing?.title ?? '',
    caseNumber: existing?.caseNumber ?? generateCaseNumber(),
    caseType: existing?.caseType ?? 'Civil',
    jurisdiction: existing?.jurisdiction ?? '',
    description: existing?.description ?? '',
    status: existing?.status ?? 'OPEN',
    priority: existing?.priority ?? 'MEDIUM',
    opposingParty: existing?.opposingParty ?? '',
    assignedLawyer: existing?.assignedLawyer ?? '',
    clientId: existing?.clientId ?? '',
  });

  useEffect(() => {
    clientsApi.list().then(setClients).catch(() => {});
  }, []);

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        clientId: form.clientId || undefined,
        jurisdiction: form.jurisdiction || undefined,
        description: form.description || undefined,
        opposingParty: form.opposingParty || undefined,
        assignedLawyer: form.assignedLawyer || undefined,
      };
      const saved = isEdit
        ? await casesApi.update(existing!.id, payload)
        : await casesApi.create(payload);
      onSaved(saved);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={true} title={isEdit ? 'Edit case' : 'New case'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-ink-700 mb-1">Case title *</label>
            <Input value={form.title} onChange={set('title')} required placeholder="e.g. Smith vs. Jones" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">
              Case number <span className="text-ink-400 font-normal">(auto-generated, editable)</span>
            </label>
            <Input value={form.caseNumber} onChange={set('caseNumber')} required placeholder="e.g. CASE-2026-00042" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">Case type *</label>
            <select value={form.caseType} onChange={set('caseType')} className="w-full h-9 px-3 text-sm border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              {CASE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">Status</label>
            <select value={form.status} onChange={set('status')} className="w-full h-9 px-3 text-sm border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              {CASE_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">Priority</label>
            <select value={form.priority} onChange={set('priority')} className="w-full h-9 px-3 text-sm border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              {CASE_PRIORITIES.map((p) => <option key={p} value={p}>{humanize(p)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">Jurisdiction</label>
            <select value={form.jurisdiction} onChange={set('jurisdiction')} className="w-full h-9 px-3 text-sm border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">Select jurisdiction</option>
              {JURISDICTIONS.map((j) => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">Client</label>
            <select value={form.clientId} onChange={set('clientId')} className="w-full h-9 px-3 text-sm border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">No client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">Opposing party</label>
            <Input value={form.opposingParty} onChange={set('opposingParty')} placeholder="Optional" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">Assigned lawyer</label>
            <Input value={form.assignedLawyer} onChange={set('assignedLawyer')} placeholder="Optional" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-ink-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Brief case description..."
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>{isEdit ? 'Save changes' : 'Create case'}</Button>
        </div>
      </form>
    </Modal>
  );
}
