/*
# Legal Workspace — Core Schema

Builds the relational schema for a professional legal practice management platform.

## 1. New Tables
- `lawyer_profiles` — extends `auth.users` with professional info (firm, bar number, jurisdiction).
- `clients` — individuals or organizations a lawyer represents; owner-scoped.
- `cases` — the central entity; each case belongs to a lawyer and optionally a client.
- `case_notes` — free-form notes attached to a case.
- `case_timeline` — immutable audit-style events for a case.
- `documents` — legal documents with metadata; attached to a case or standalone.
- `document_versions` — version history for documents (future-proofed).
- `tasks` — actionable items with priority, status, due date, related case.
- `calendar_events` — hearings, meetings, filing deadlines with reminders.
- `ai_conversations` — a chat session, optionally linked to a case.
- `ai_messages` — individual messages within a conversation (user + assistant).

## 2. Security
- RLS enabled on every table.
- All tables are owner-scoped to `auth.uid()` via `user_id uuid NOT NULL DEFAULT auth.uid()`.
- Child tables (case_notes, case_timeline, documents, tasks, calendar_events, ai_conversations, ai_messages)
  scope ownership through their parent case OR a direct `user_id` column, so a lawyer
  can only ever touch rows that belong to them.
- 4 CRUD policies per table (SELECT/INSERT/UPDATE/DELETE), scoped to `authenticated`.

## 3. Notes
- `case_timeline` is append-only by design: UPDATE and DELETE policies still scope by
  ownership but the intent is an immutable audit trail.
- `documents.storage_path` is a placeholder for future Supabase Storage integration.
- `ai_messages` stores both user prompts and assistant replies distinguished by `role`.
*/

-- =========================================================
-- Lawyer profiles (extends auth.users)
-- =========================================================
CREATE TABLE IF NOT EXISTS lawyer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  firm_name text,
  bar_number text,
  primary_jurisdiction text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lawyer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_lawyer_profile" ON lawyer_profiles;
CREATE POLICY "select_own_lawyer_profile" ON lawyer_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_lawyer_profile" ON lawyer_profiles;
CREATE POLICY "insert_own_lawyer_profile" ON lawyer_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_lawyer_profile" ON lawyer_profiles;
CREATE POLICY "update_own_lawyer_profile" ON lawyer_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_lawyer_profile" ON lawyer_profiles;
CREATE POLICY "delete_own_lawyer_profile" ON lawyer_profiles
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- Clients
-- =========================================================
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'individual' CHECK (type IN ('individual', 'organization')),
  email text,
  phone text,
  address text,
  company text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_clients" ON clients;
CREATE POLICY "select_own_clients" ON clients
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_clients" ON clients;
CREATE POLICY "insert_own_clients" ON clients
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_clients" ON clients;
CREATE POLICY "update_own_clients" ON clients
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_clients" ON clients;
CREATE POLICY "delete_own_clients" ON clients
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- Cases (central entity)
-- =========================================================
CREATE TABLE IF NOT EXISTS cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  case_number text NOT NULL,
  case_type text NOT NULL DEFAULT 'Civil',
  jurisdiction text,
  description text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'on_hold', 'closed', 'archived')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  opposing_party text,
  assigned_lawyer text,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_cases" ON cases;
CREATE POLICY "select_own_cases" ON cases
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_cases" ON cases;
CREATE POLICY "insert_own_cases" ON cases
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_cases" ON cases;
CREATE POLICY "update_own_cases" ON cases
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_cases" ON cases;
CREATE POLICY "delete_own_cases" ON cases
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- Case notes
-- =========================================================
CREATE TABLE IF NOT EXISTS case_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE case_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_case_notes" ON case_notes;
CREATE POLICY "select_own_case_notes" ON case_notes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = case_notes.case_id AND cases.user_id = auth.uid()));

DROP POLICY IF EXISTS "insert_own_case_notes" ON case_notes;
CREATE POLICY "insert_own_case_notes" ON case_notes
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM cases WHERE cases.id = case_notes.case_id AND cases.user_id = auth.uid()));

DROP POLICY IF EXISTS "update_own_case_notes" ON case_notes;
CREATE POLICY "update_own_case_notes" ON case_notes
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = case_notes.case_id AND cases.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM cases WHERE cases.id = case_notes.case_id AND cases.user_id = auth.uid()));

DROP POLICY IF EXISTS "delete_own_case_notes" ON case_notes;
CREATE POLICY "delete_own_case_notes" ON case_notes
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = case_notes.case_id AND cases.user_id = auth.uid()));

-- =========================================================
-- Case timeline (append-only audit events)
-- =========================================================
CREATE TABLE IF NOT EXISTS case_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL DEFAULT 'note',
  title text NOT NULL,
  description text,
  event_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE case_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_case_timeline" ON case_timeline;
CREATE POLICY "select_own_case_timeline" ON case_timeline
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = case_timeline.case_id AND cases.user_id = auth.uid()));

DROP POLICY IF EXISTS "insert_own_case_timeline" ON case_timeline;
CREATE POLICY "insert_own_case_timeline" ON case_timeline
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM cases WHERE cases.id = case_timeline.case_id AND cases.user_id = auth.uid()));

DROP POLICY IF EXISTS "update_own_case_timeline" ON case_timeline;
CREATE POLICY "update_own_case_timeline" ON case_timeline
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = case_timeline.case_id AND cases.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM cases WHERE cases.id = case_timeline.case_id AND cases.user_id = auth.uid()));

DROP POLICY IF EXISTS "delete_own_case_timeline" ON case_timeline;
CREATE POLICY "delete_own_case_timeline" ON case_timeline
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = case_timeline.case_id AND cases.user_id = auth.uid()));

-- =========================================================
-- Documents
-- =========================================================
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id uuid REFERENCES cases(id) ON DELETE SET NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'pleading', 'contract', 'evidence', 'correspondence', 'court_filing', 'research', 'other')),
  file_type text NOT NULL,
  file_size bigint,
  storage_path text,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'final', 'archived')),
  tags text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_documents" ON documents;
CREATE POLICY "select_own_documents" ON documents
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_documents" ON documents;
CREATE POLICY "insert_own_documents" ON documents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_documents" ON documents;
CREATE POLICY "update_own_documents" ON documents
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_documents" ON documents;
CREATE POLICY "delete_own_documents" ON documents
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- Document versions
-- =========================================================
CREATE TABLE IF NOT EXISTS document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  storage_path text,
  file_size bigint,
  change_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_document_versions" ON document_versions;
CREATE POLICY "select_own_document_versions" ON document_versions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM documents WHERE documents.id = document_versions.document_id AND documents.user_id = auth.uid()));

DROP POLICY IF EXISTS "insert_own_document_versions" ON document_versions;
CREATE POLICY "insert_own_document_versions" ON document_versions
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM documents WHERE documents.id = document_versions.document_id AND documents.user_id = auth.uid()));

DROP POLICY IF EXISTS "update_own_document_versions" ON document_versions;
CREATE POLICY "update_own_document_versions" ON document_versions
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM documents WHERE documents.id = document_versions.document_id AND documents.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM documents WHERE documents.id = document_versions.document_id AND documents.user_id = auth.uid()));

DROP POLICY IF EXISTS "delete_own_document_versions" ON document_versions;
CREATE POLICY "delete_own_document_versions" ON document_versions
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM documents WHERE documents.id = document_versions.document_id AND documents.user_id = auth.uid()));

-- =========================================================
-- Tasks
-- =========================================================
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id uuid REFERENCES cases(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'blocked')),
  due_date timestamptz,
  assigned_to text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_tasks" ON tasks;
CREATE POLICY "select_own_tasks" ON tasks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_tasks" ON tasks;
CREATE POLICY "insert_own_tasks" ON tasks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_tasks" ON tasks;
CREATE POLICY "update_own_tasks" ON tasks
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_tasks" ON tasks;
CREATE POLICY "delete_own_tasks" ON tasks
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- Calendar events
-- =========================================================
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id uuid REFERENCES cases(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'meeting' CHECK (event_type IN ('hearing', 'meeting', 'filing_deadline', 'reminder', 'other')),
  location text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  reminder_minutes integer DEFAULT 60,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_calendar_events" ON calendar_events;
CREATE POLICY "select_own_calendar_events" ON calendar_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_calendar_events" ON calendar_events;
CREATE POLICY "insert_own_calendar_events" ON calendar_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_calendar_events" ON calendar_events;
CREATE POLICY "update_own_calendar_events" ON calendar_events
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_calendar_events" ON calendar_events;
CREATE POLICY "delete_own_calendar_events" ON calendar_events
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- AI conversations
-- =========================================================
CREATE TABLE IF NOT EXISTS ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id uuid REFERENCES cases(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'New conversation',
  context_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_ai_conversations" ON ai_conversations;
CREATE POLICY "select_own_ai_conversations" ON ai_conversations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_ai_conversations" ON ai_conversations;
CREATE POLICY "insert_own_ai_conversations" ON ai_conversations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_ai_conversations" ON ai_conversations;
CREATE POLICY "update_own_ai_conversations" ON ai_conversations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_ai_conversations" ON ai_conversations;
CREATE POLICY "delete_own_ai_conversations" ON ai_conversations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- AI messages
-- =========================================================
CREATE TABLE IF NOT EXISTS ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_ai_messages" ON ai_messages;
CREATE POLICY "select_own_ai_messages" ON ai_messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM ai_conversations WHERE ai_conversations.id = ai_messages.conversation_id AND ai_conversations.user_id = auth.uid()));

DROP POLICY IF EXISTS "insert_own_ai_messages" ON ai_messages;
CREATE POLICY "insert_own_ai_messages" ON ai_messages
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM ai_conversations WHERE ai_conversations.id = ai_messages.conversation_id AND ai_conversations.user_id = auth.uid()));

DROP POLICY IF EXISTS "update_own_ai_messages" ON ai_messages;
CREATE POLICY "update_own_ai_messages" ON ai_messages
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM ai_conversations WHERE ai_conversations.id = ai_messages.conversation_id AND ai_conversations.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM ai_conversations WHERE ai_conversations.id = ai_messages.conversation_id AND ai_conversations.user_id = auth.uid()));

DROP POLICY IF EXISTS "delete_own_ai_messages" ON ai_messages;
CREATE POLICY "delete_own_ai_messages" ON ai_messages
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM ai_conversations WHERE ai_conversations.id = ai_messages.conversation_id AND ai_conversations.user_id = auth.uid()));

-- =========================================================
-- Indexes
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_cases_user_id ON cases(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_case_id ON documents(case_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_case_notes_case_id ON case_notes(case_id);
CREATE INDEX IF NOT EXISTS idx_case_timeline_case_id ON case_timeline(case_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON ai_messages(conversation_id);

-- =========================================================
-- updated_at triggers
-- =========================================================
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lawyer_profiles_touch ON lawyer_profiles;
CREATE TRIGGER trg_lawyer_profiles_touch BEFORE UPDATE ON lawyer_profiles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_clients_touch ON clients;
CREATE TRIGGER trg_clients_touch BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_cases_touch ON cases;
CREATE TRIGGER trg_cases_touch BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_documents_touch ON documents;
CREATE TRIGGER trg_documents_touch BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_tasks_touch ON tasks;
CREATE TRIGGER trg_tasks_touch BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_calendar_events_touch ON calendar_events;
CREATE TRIGGER trg_calendar_events_touch BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_ai_conversations_touch ON ai_conversations;
CREATE TRIGGER trg_ai_conversations_touch BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_case_notes_touch ON case_notes;
CREATE TRIGGER trg_case_notes_touch BEFORE UPDATE ON case_notes
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
