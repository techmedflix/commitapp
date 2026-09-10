import type {
  Activity,
  Comment,
  JoinRequest,
  Notification,
  Organization,
  Task,
  User,
  UserRole,
} from '../src/types/index.ts';

export function mapUser(
  row: Record<string, unknown>,
  opts?: { role?: UserRole; orgIds?: string[]; orgId?: string | null }
): User {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    avatar: row.avatar ? String(row.avatar) : undefined,
    role: opts?.role ?? 'Member',
    orgId: opts?.orgId !== undefined ? opts.orgId : row.active_org_id ? String(row.active_org_id) : null,
    orgIds: opts?.orgIds ?? [],
  };
}

export function mapOrg(row: Record<string, unknown>): Organization {
  return {
    id: String(row.id),
    name: String(row.name),
    inviteCode: String(row.invite_code),
    adminId: String(row.admin_id),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export function mapJoinRequest(row: Record<string, unknown>): JoinRequest {
  return {
    id: String(row.id),
    orgId: String(row.org_id),
    userId: String(row.user_id),
    userName: String(row.user_name ?? ''),
    userEmail: String(row.user_email ?? ''),
    userAvatar: String(row.user_avatar ?? ''),
    status: row.status as JoinRequest['status'],
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export function mapTask(row: Record<string, unknown>): Task {
  const dateOnly = (v: unknown) => (v ? String(v).slice(0, 10) : undefined);
  return {
    id: String(row.id),
    orgId: String(row.org_id),
    taskNumber: String(row.task_number),
    title: String(row.title),
    note: row.note ? String(row.note) : undefined,
    creatorId: String(row.creator_id),
    assigneeId: String(row.assignee_id),
    requestedDeadline: dateOnly(row.requested_deadline),
    assigneeEta: dateOnly(row.assignee_eta),
    status: row.status as Task['status'],
    blockedReason: row.blocked_reason ? String(row.blocked_reason) : undefined,
    completionComment: row.completion_comment ? String(row.completion_comment) : undefined,
    referenceUrl: row.reference_url ? String(row.reference_url) : undefined,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    completedAt: row.completed_at ? new Date(String(row.completed_at)).toISOString() : undefined,
    lastNudgedAt: row.last_nudged_at ? new Date(String(row.last_nudged_at)).toISOString() : undefined,
  };
}

export function mapComment(row: Record<string, unknown>): Comment {
  return {
    id: String(row.id),
    taskId: String(row.task_id),
    userId: String(row.user_id),
    text: String(row.text),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export function mapActivity(row: Record<string, unknown>): Activity {
  return {
    id: String(row.id),
    taskId: String(row.task_id),
    userId: String(row.user_id),
    type: row.type as Activity['type'],
    details: String(row.details),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export function mapNotification(row: Record<string, unknown>): Notification {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title),
    message: String(row.message),
    taskId: row.task_id ? String(row.task_id) : '',
    type: row.type as Notification['type'],
    read: Boolean(row.read),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}
