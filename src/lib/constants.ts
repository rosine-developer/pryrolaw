import type { CaseStatus, CasePriority, TaskStatus, TaskPriority, DocumentCategory, DocumentStatus, EventType, ClientType } from '../types';

export const CASE_STATUSES: CaseStatus[] = ['OPEN', 'ON_HOLD', 'CLOSED', 'ARCHIVED'];
export const CASE_PRIORITIES: CasePriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
export const TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED'];
export const TASK_PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  'GENERAL', 'PLEADING', 'CONTRACT', 'EVIDENCE',
  'CORRESPONDENCE', 'COURT_FILING', 'RESEARCH', 'OTHER',
];
export const DOCUMENT_STATUSES: DocumentStatus[] = ['DRAFT', 'REVIEW', 'FINAL', 'ARCHIVED'];
export const EVENT_TYPES: EventType[] = ['HEARING', 'MEETING', 'FILING_DEADLINE', 'REMINDER', 'OTHER'];
export const CLIENT_TYPES: ClientType[] = ['INDIVIDUAL', 'ORGANIZATION'];

export const CASE_TYPES = [
  'Civil', 'Criminal', 'Family', 'Corporate', 'Real Estate',
  'Immigration', 'Intellectual Property', 'Labor & Employment',
  'Tax', 'Bankruptcy', 'Personal Injury', 'Estate Planning',
  'Administrative', 'Constitutional', 'Environmental', 'Other',
];

export const JURISDICTIONS = [
  'United States — Federal', 'United States — New York', 'United States — California',
  'United States — Texas', 'United States — Florida', 'United Kingdom — England & Wales',
  'United Kingdom — Scotland', 'European Union', 'Canada — Federal', 'Canada — Ontario',
  'Australia — Federal', 'Germany', 'France', 'Spain', 'Italy', 'Netherlands',
  'Brazil', 'India', 'Singapore', 'UAE', 'South Africa', 'Other',
];

/** Display label for any enum value */
export function humanize(value: string): string {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function titleCase(value: string): string {
  return humanize(value);
}
