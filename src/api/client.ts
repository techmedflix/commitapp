import type {
  Activity,
  Comment,
  JoinRequest,
  Notification,
  Organization,
  Task,
  User,
  UserRole,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const TOKEN_KEY = 'commit_token';

export type BootstrapPayload = {
  user: User;
  organizations: Organization[];
  activeOrg: Organization | null;
  users: User[];
  joinRequests: JoinRequest[];
  tasks: Task[];
  comments: Comment[];
  activities: Activity[];
  notifications: Notification[];
};

export type AuthPayload = BootstrapPayload & { token: string };

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function hasToken() {
  return Boolean(getToken());
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data && (data.error || data.message)) || `Request failed (${res.status})`;
    throw Object.assign(new Error(message), { status: res.status, data });
  }
  return data as T;
}

export const api = {
  health: () => request<{ ok: boolean }>('/health'),

  authGoogle: (body: { credential: string; name?: string; avatar?: string }) =>
    request<AuthPayload>('/auth/google', { method: 'POST', body: JSON.stringify(body) }),

  authEmail: (body: { email: string; name: string; avatar?: string }) =>
    request<AuthPayload>('/auth/email', { method: 'POST', body: JSON.stringify(body) }),

  bootstrap: () => request<BootstrapPayload>('/bootstrap'),

  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),

  getOrgByInvite: (code: string) =>
    request<{ organization: Organization }>(`/orgs/by-invite/${encodeURIComponent(code)}`),

  createOrg: (name: string) =>
    request<BootstrapPayload>('/orgs', { method: 'POST', body: JSON.stringify({ name }) }),

  joinOrg: (inviteCode: string) =>
    request<
      BootstrapPayload & {
        success: boolean;
        message: string;
        org?: Organization;
      }
    >('/orgs/join', { method: 'POST', body: JSON.stringify({ inviteCode }) }),

  switchOrg: (orgId: string) =>
    request<BootstrapPayload>(`/orgs/${orgId}/switch`, { method: 'POST' }),

  regenerateInvite: (orgId: string) =>
    request<{ inviteCode: string; organization: Organization }>(
      `/orgs/${orgId}/regenerate-invite`,
      { method: 'POST' }
    ),

  approveJoin: (id: string) =>
    request<BootstrapPayload>(`/join-requests/${id}/approve`, { method: 'POST' }),

  rejectJoin: (id: string) =>
    request<BootstrapPayload>(`/join-requests/${id}/reject`, { method: 'POST' }),

  inviteMember: (orgId: string, body: { name: string; email: string; role: UserRole }) =>
    request<BootstrapPayload & { user: User }>(`/orgs/${orgId}/members`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  createTask: (body: {
    title: string;
    assigneeId: string;
    requestedDeadline?: string;
    note?: string;
    referenceUrl?: string;
  }) =>
    request<BootstrapPayload & { task: Task }>('/tasks', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  acceptTask: (id: string, eta?: string) =>
    request<BootstrapPayload>(`/tasks/${id}/accept`, {
      method: 'POST',
      body: JSON.stringify({ eta }),
    }),

  startTask: (id: string) =>
    request<BootstrapPayload>(`/tasks/${id}/start`, { method: 'POST' }),

  blockTask: (id: string, reason: string) =>
    request<BootstrapPayload>(`/tasks/${id}/block`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  unblockTask: (id: string) =>
    request<BootstrapPayload>(`/tasks/${id}/unblock`, { method: 'POST' }),

  completeTask: (id: string, comment?: string) =>
    request<BootstrapPayload>(`/tasks/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),

  nudgeTask: (id: string) =>
    request<BootstrapPayload & { success: boolean; message: string }>(`/tasks/${id}/nudge`, {
      method: 'POST',
    }),

  updateTask: (id: string, updates: Partial<Task>) =>
    request<BootstrapPayload>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  addComment: (id: string, text: string) =>
    request<BootstrapPayload>(`/tasks/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  markNotificationRead: (id: string) =>
    request<BootstrapPayload>(`/notifications/${id}/read`, { method: 'POST' }),

  markAllNotificationsRead: () =>
    request<BootstrapPayload>('/notifications/read-all', { method: 'POST' }),
};
