export type UserRole = 'Workspace Admin' | 'Member';

export interface Organization {
  id: string;
  name: string;
  inviteCode: string;
  adminId: string;
  createdAt: string;
}

export interface JoinRequest {
  id: string;
  orgId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  orgId: string | null;
  orgIds?: string[];
}

export type TaskStatus =
  | 'awaiting_acknowledgement'
  | 'accepted'
  | 'in_progress'
  | 'blocked'
  | 'completed';

export interface Task {
  id: string;
  orgId: string;
  taskNumber: string; // e.g. "26/9/101" (Year/Month/SeqID)
  title: string;
  note?: string;
  creatorId: string; // Creator
  assigneeId: string; // Doer
  requestedDeadline?: string; // YYYY-MM-DD format
  assigneeEta?: string; // Doer's ETA estimate
  status: TaskStatus;
  blockedReason?: string;
  completionComment?: string;
  referenceUrl?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  lastNudgedAt?: string;
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  text: string;
  createdAt: string;
}

export type ActivityType =
  | 'created'
  | 'accepted'
  | 'status_changed'
  | 'eta_updated'
  | 'deadline_updated'
  | 'blocked'
  | 'unblocked'
  | 'nudged'
  | 'comment_added'
  | 'completed';

export interface Activity {
  id: string;
  taskId: string;
  userId: string;
  type: ActivityType;
  details: string;
  createdAt: string;
}

export type NotificationType =
  | 'assigned'
  | 'modified'
  | 'deadline_changed'
  | 'blocked'
  | 'completed'
  | 'nudged'
  | 'overdue';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  taskId: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
}

export type ActiveTab = 'my_work' | 'waiting_for' | 'completed' | 'team' | 'settings';
