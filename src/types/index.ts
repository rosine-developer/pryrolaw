// Re-export API types as the canonical domain types for the frontend.
// All UI components import from here — never from api.ts directly.

export type {
  ApiUser as User,
  ApiProfile as LawyerProfile,
  ApiClient as Client,
  ApiCase as Case,
  ApiCaseNote as CaseNote,
  ApiTimelineEvent as CaseTimelineEvent,
  ApiDocument as Document,
  ApiDocumentVersion as DocumentVersion,
  ApiTask as Task,
  ApiCalendarEvent as CalendarEvent,
  ApiConversation as AIConversation,
  ApiAIMessage as AIMessage,
  ApiDashboard as Dashboard,
} from '../lib/api';

export type CaseStatus = 'OPEN' | 'ON_HOLD' | 'CLOSED' | 'ARCHIVED';
export type CasePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type DocumentCategory = 'GENERAL' | 'PLEADING' | 'CONTRACT' | 'EVIDENCE' | 'CORRESPONDENCE' | 'COURT_FILING' | 'RESEARCH' | 'OTHER';
export type DocumentStatus = 'DRAFT' | 'REVIEW' | 'FINAL' | 'ARCHIVED';
export type EventType = 'HEARING' | 'MEETING' | 'FILING_DEADLINE' | 'REMINDER' | 'OTHER';
export type ClientType = 'INDIVIDUAL' | 'ORGANIZATION';
export type ChatRole = 'USER' | 'ASSISTANT' | 'SYSTEM';
