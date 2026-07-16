/**
 * API client — thin wrapper around fetch.
 * All requests go to the Express backend.
 * Handles token refresh automatically on 401.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

// ── Token storage ────────────────────────────────────────────────────────────

const tokenStore = {
  access: '',
  refresh: '',

  load() {
    this.access = localStorage.getItem('lw_access') ?? '';
    this.refresh = localStorage.getItem('lw_refresh') ?? '';
  },

  save(access: string, refresh: string) {
    this.access = access;
    this.refresh = refresh;
    localStorage.setItem('lw_access', access);
    localStorage.setItem('lw_refresh', refresh);
  },

  clear() {
    this.access = '';
    this.refresh = '';
    localStorage.removeItem('lw_access');
    localStorage.removeItem('lw_refresh');
  },
};

tokenStore.load();

// ── Core fetch ───────────────────────────────────────────────────────────────

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

async function tryRefresh(): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: tokenStore.refresh }),
  });
  if (!res.ok) {
    tokenStore.clear();
    throw new Error('Session expired. Please sign in again.');
  }
  const data = await res.json() as { accessToken: string; refreshToken: string };
  tokenStore.save(data.accessToken, data.refreshToken);
  return data.accessToken;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.body && !(options.body instanceof FormData)
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(tokenStore.access ? { Authorization: `Bearer ${tokenStore.access}` } : {}),
    ...(options.headers as Record<string, string> | undefined ?? {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // Token expired — attempt refresh once
  if (res.status === 401 && retry && tokenStore.refresh) {
    if (isRefreshing) {
      // Queue this request until refresh completes
      const newToken = await new Promise<string>((resolve) => {
        refreshQueue.push(resolve);
      });
      return request<T>(path, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
      }, false);
    }

    isRefreshing = true;
    try {
      const newToken = await tryRefresh();
      refreshQueue.forEach((cb) => cb(newToken));
      refreshQueue = [];
      return request<T>(path, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
      }, false);
    } finally {
      isRefreshing = false;
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  async register(email: string, password: string, fullName: string) {
    const data = await request<{ accessToken: string; refreshToken: string; user: ApiUser }>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify({ email, password, fullName }) },
    );
    tokenStore.save(data.accessToken, data.refreshToken);
    return data;
  },

  async login(email: string, password: string) {
    const data = await request<{ accessToken: string; refreshToken: string; user: ApiUser }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    );
    tokenStore.save(data.accessToken, data.refreshToken);
    return data;
  },

  async logout() {
    await request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: tokenStore.refresh }),
    }).catch(() => {});
    tokenStore.clear();
  },

  async me() {
    return request<ApiUser>('/auth/me');
  },

  isAuthenticated() {
    return !!tokenStore.access;
  },

  clearTokens() {
    tokenStore.clear();
  },
};

// ── Profile ──────────────────────────────────────────────────────────────────

export const profileApi = {
  get: () => request<ApiProfile>('/profile'),
  update: (data: Partial<ApiProfile>) =>
    request<ApiProfile>('/profile', { method: 'PUT', body: JSON.stringify(data) }),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const dashboardApi = {
  getSummary: () => request<ApiDashboard>('/dashboard'),
};

// ── Cases ────────────────────────────────────────────────────────────────────

export const casesApi = {
  list: (params?: Record<string, string | number>) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return request<ApiPaginated<ApiCase>>(`/cases${qs}`);
  },
  getById: (id: string) => request<ApiCase>(`/cases/${id}`),
  create: (data: Partial<ApiCase>) =>
    request<ApiCase>('/cases', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<ApiCase>) =>
    request<ApiCase>(`/cases/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/cases/${id}`, { method: 'DELETE' }),

  getNotes: (caseId: string) => request<ApiCaseNote[]>(`/cases/${caseId}/notes`),
  createNote: (caseId: string, content: string) =>
    request<ApiCaseNote>(`/cases/${caseId}/notes`, { method: 'POST', body: JSON.stringify({ content }) }),
  deleteNote: (caseId: string, noteId: string) =>
    request<void>(`/cases/${caseId}/notes/${noteId}`, { method: 'DELETE' }),

  getTimeline: (caseId: string) => request<ApiTimelineEvent[]>(`/cases/${caseId}/timeline`),
  createTimelineEvent: (caseId: string, data: Partial<ApiTimelineEvent>) =>
    request<ApiTimelineEvent>(`/cases/${caseId}/timeline`, { method: 'POST', body: JSON.stringify(data) }),
  deleteTimelineEvent: (caseId: string, eventId: string) =>
    request<void>(`/cases/${caseId}/timeline/${eventId}`, { method: 'DELETE' }),
};

// ── Clients ──────────────────────────────────────────────────────────────────

export const clientsApi = {
  list: (search?: string) =>
    request<ApiClient[]>(`/clients${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getById: (id: string) => request<ApiClient>(`/clients/${id}`),
  create: (data: Partial<ApiClient>) =>
    request<ApiClient>('/clients', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<ApiClient>) =>
    request<ApiClient>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/clients/${id}`, { method: 'DELETE' }),
};

// ── Documents ────────────────────────────────────────────────────────────────

export const documentsApi = {
  list: (params?: Record<string, string | number>) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return request<ApiPaginated<ApiDocument>>(`/documents${qs}`);
  },
  getById: (id: string) => request<ApiDocument>(`/documents/${id}`),
  create: (formData: FormData) =>
    request<ApiDocument>('/documents', { method: 'POST', body: formData }),
  update: (id: string, data: Partial<ApiDocument>) =>
    request<ApiDocument>(`/documents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/documents/${id}`, { method: 'DELETE' }),
  addVersion: (id: string, formData: FormData) =>
    request<ApiDocumentVersion>(`/documents/${id}/versions`, { method: 'POST', body: formData }),
};

// ── Tasks ────────────────────────────────────────────────────────────────────

export const tasksApi = {
  list: (params?: Record<string, string | number>) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return request<ApiPaginated<ApiTask>>(`/tasks${qs}`);
  },
  getById: (id: string) => request<ApiTask>(`/tasks/${id}`),
  create: (data: Partial<ApiTask>) =>
    request<ApiTask>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<ApiTask>) =>
    request<ApiTask>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/tasks/${id}`, { method: 'DELETE' }),
};

// ── Calendar ─────────────────────────────────────────────────────────────────

export const calendarApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<ApiCalendarEvent[]>(`/calendar${qs}`);
  },
  upcoming: (days?: number) =>
    request<ApiCalendarEvent[]>(`/calendar/upcoming${days ? `?days=${days}` : ''}`),
  getById: (id: string) => request<ApiCalendarEvent>(`/calendar/${id}`),
  create: (data: Partial<ApiCalendarEvent>) =>
    request<ApiCalendarEvent>('/calendar', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<ApiCalendarEvent>) =>
    request<ApiCalendarEvent>(`/calendar/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/calendar/${id}`, { method: 'DELETE' }),
};

// ── AI ───────────────────────────────────────────────────────────────────────

export const aiApi = {
  getProviders: () => request<{ id: string; label: string; defaultModel: string }[]>('/ai/providers'),
  listConversations: (caseId?: string) =>
    request<ApiConversation[]>(`/ai/conversations${caseId ? `?caseId=${caseId}` : ''}`),
  getConversation: (id: string) => request<ApiConversation>(`/ai/conversations/${id}`),
  createConversation: (data: { title: string; caseId?: string }) =>
    request<ApiConversation>('/ai/conversations', { method: 'POST', body: JSON.stringify(data) }),
  deleteConversation: (id: string) =>
    request<void>(`/ai/conversations/${id}`, { method: 'DELETE' }),
  sendMessage: (conversationId: string, content: string, options?: { provider?: string; model?: string }) =>
    request<{ message: ApiAIMessage; model: string; provider: string }>(
      `/ai/conversations/${conversationId}/messages`,
      { method: 'POST', body: JSON.stringify({ content, ...options }) },
    ),
};

// ── API Types ────────────────────────────────────────────────────────────────

export interface ApiUser {
  id: string;
  email: string;
  profile: ApiProfile | null;
  createdAt: string;
}

export interface ApiProfile {
  id: string;
  userId: string;
  fullName: string;
  firmName: string | null;
  barNumber: string | null;
  primaryJurisdiction: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiClient {
  id: string;
  userId: string;
  name: string;
  type: 'INDIVIDUAL' | 'ORGANIZATION';
  email: string | null;
  phone: string | null;
  address: string | null;
  company: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCase {
  id: string;
  userId: string;
  clientId: string | null;
  client?: ApiClient | null;
  title: string;
  caseNumber: string;
  caseType: string;
  jurisdiction: string | null;
  description: string | null;
  status: 'OPEN' | 'ON_HOLD' | 'CLOSED' | 'ARCHIVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  opposingParty: string | null;
  assignedLawyer: string | null;
  createdAt: string;
  updatedAt: string;
  // included in detail view
  documents?: ApiDocument[];
  tasks?: ApiTask[];
  events?: ApiCalendarEvent[];
  notes?: ApiCaseNote[];
  timeline?: ApiTimelineEvent[];
  conversations?: ApiConversation[];
}

export interface ApiCaseNote {
  id: string;
  caseId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiTimelineEvent {
  id: string;
  caseId: string;
  userId: string;
  eventType: string;
  title: string;
  description: string | null;
  eventDate: string;
  createdAt: string;
}

export interface ApiDocument {
  id: string;
  userId: string;
  caseId: string | null;
  case?: ApiCase | null;
  title: string;
  category: 'GENERAL' | 'PLEADING' | 'CONTRACT' | 'EVIDENCE' | 'CORRESPONDENCE' | 'COURT_FILING' | 'RESEARCH' | 'OTHER';
  fileType: string;
  fileSize: number | null;
  storagePath: string | null;
  description: string | null;
  status: 'DRAFT' | 'REVIEW' | 'FINAL' | 'ARCHIVED';
  tags: string[];
  versions?: ApiDocumentVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiDocumentVersion {
  id: string;
  documentId: string;
  userId: string;
  versionNumber: number;
  storagePath: string | null;
  fileSize: number | null;
  changeNote: string | null;
  createdAt: string;
}

export interface ApiTask {
  id: string;
  userId: string;
  caseId: string | null;
  case?: ApiCase | null;
  title: string;
  description: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
  dueDate: string | null;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCalendarEvent {
  id: string;
  userId: string;
  caseId: string | null;
  case?: ApiCase | null;
  title: string;
  description: string | null;
  eventType: 'HEARING' | 'MEETING' | 'FILING_DEADLINE' | 'REMINDER' | 'OTHER';
  location: string | null;
  startTime: string;
  endTime: string;
  reminderMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiConversation {
  id: string;
  userId: string;
  caseId: string | null;
  case?: ApiCase | null;
  title: string;
  contextSummary: string | null;
  messages?: ApiAIMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiAIMessage {
  id: string;
  conversationId: string;
  userId: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ApiDashboard {
  stats: {
    totalCases: number;
    openCases: number;
    urgentCases: number;
    pendingTasks: number;
    overdueTasks: number;
  };
  upcomingEvents: ApiCalendarEvent[];
  recentDocuments: ApiDocument[];
  recentCases: ApiCase[];
}

export interface ApiPaginated<T> {
  data?: T[];
  // Some endpoints return { cases/tasks/documents: T[] }
  cases?: T[];
  tasks?: T[];
  documents?: T[];
  total: number;
  page: number;
  limit: number;
  pages?: number;
}
