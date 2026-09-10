import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type {
  User,
  Task,
  Comment,
  Activity,
  Notification,
  ActiveTab,
  UserRole,
  Organization,
  JoinRequest,
} from '../types';
import {
  INITIAL_ORGS,
  INITIAL_USERS,
  INITIAL_JOIN_REQUESTS,
  INITIAL_TASKS,
  INITIAL_COMMENTS,
  INITIAL_ACTIVITIES,
  INITIAL_NOTIFICATIONS,
} from '../data/initialData';
import confetti from 'canvas-confetti';

interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'warning';
}

interface TaskContextType {
  // Multi-Tenant Orgs & Requests
  organizations: Organization[];
  activeOrg: Organization | null;
  joinRequests: JoinRequest[];
  pendingInviteCode: string | null;
  setPendingInviteCode: (code: string | null) => void;
  isGoogleAuthModalOpen: boolean;
  setIsGoogleAuthModalOpen: (open: boolean) => void;
  isPendingRequestsModalOpen: boolean;
  setIsPendingRequestsModalOpen: (open: boolean) => void;

  users: User[];
  activeUser: User | null;
  setActiveUser: (user: User | null) => void;
  tasks: Task[];
  comments: Comment[];
  activities: Activity[];
  notifications: Notification[];
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  selectedTeamMemberId: string | null;
  setSelectedTeamMemberId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  toasts: Toast[];

  // Multi-Tenant Org Actions
  signInWithGoogle: (email: string, name: string, avatarUrl: string) => User;
  createOrganization: (orgName: string) => Organization;
  requestToJoinOrg: (inviteCode: string) => { success: boolean; message: string; org?: Organization; request?: JoinRequest };
  approveJoinRequest: (requestId: string) => void;
  rejectJoinRequest: (requestId: string) => void;
  switchOrganization: (orgId: string) => void;
  regenerateInviteCode: (orgId: string) => string;
  getOrgByInviteCode: (code: string) => Organization | undefined;

  // Task Actions
  createTask: (data: {
    title: string;
    assigneeId: string;
    requestedDeadline?: string;
    note?: string;
    referenceUrl?: string;
  }) => Task;
  acceptTask: (taskId: string, eta?: string) => void;
  startTask: (taskId: string) => void;
  markBlocked: (taskId: string, reason: string) => void;
  unblockTask: (taskId: string) => void;
  markComplete: (taskId: string, comment?: string) => void;
  nudgeAssignee: (taskId: string) => { success: boolean; message: string };
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  addComment: (taskId: string, text: string) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  inviteTeamMember: (name: string, email: string, role: UserRole) => void;
  resetDemoData: () => void;
  showToast: (message: string, type?: Toast['type']) => void;

  // Computed data getters
  unreadNotificationCount: number;
  pendingRequestsCount: number;
  getUserById: (id: string) => User | undefined;
  orgUsers: User[];
  orgTasks: Task[];
  pendingRequestsForActiveOrg: JoinRequest[];
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Organizations State
  const [organizations, setOrganizations] = useState<Organization[]>(() => {
    const saved = localStorage.getItem('commit_orgs');
    return saved ? JSON.parse(saved) : INITIAL_ORGS;
  });

  const [activeOrg, setActiveOrg] = useState<Organization | null>(() => {
    const saved = localStorage.getItem('commit_active_org');
    if (saved) {
      const parsed = JSON.parse(saved);
      const found = organizations.find((o) => o.id === parsed.id);
      if (found) return found;
    }
    return organizations[0] || null;
  });

  // 2. Join Requests State
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>(() => {
    const saved = localStorage.getItem('commit_join_requests');
    return saved ? JSON.parse(saved) : INITIAL_JOIN_REQUESTS;
  });

  // 3. Users & Active User State
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('commit_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [activeUser, setActiveUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('commit_active_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      const found = users.find((u) => u.id === parsed.id);
      if (found) return found;
    }
    return users[0] || null;
  });

  // 4. Tasks, Comments, Activities, Notifications
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('commit_tasks');
    const rawTasks: Task[] = saved ? JSON.parse(saved) : INITIAL_TASKS;
    return rawTasks.map((t, index) => {
      return {
        ...t,
        orgId: t.orgId || activeOrg?.id || '',
        taskNumber: t.taskNumber || `26/9/${101 + index}`,
      };
    });
  });

  const [comments, setComments] = useState<Comment[]>(() => {
    const saved = localStorage.getItem('commit_comments');
    return saved ? JSON.parse(saved) : INITIAL_COMMENTS;
  });

  const [activities, setActivities] = useState<Activity[]>(() => {
    const saved = localStorage.getItem('commit_activities');
    return saved ? JSON.parse(saved) : INITIAL_ACTIVITIES;
  });

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem('commit_notifications');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  // 5. UI Controls
  const [activeTab, setActiveTab] = useState<ActiveTab>('my_work');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null);
  const [isGoogleAuthModalOpen, setIsGoogleAuthModalOpen] = useState<boolean>(() => {
    return !activeUser || !activeOrg;
  });
  const [isPendingRequestsModalOpen, setIsPendingRequestsModalOpen] = useState<boolean>(false);

  // Auto-detect ?invite=CODE or open modal if no user/org
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteParam = urlParams.get('invite');
    if (inviteParam) {
      setPendingInviteCode(inviteParam);
      setIsGoogleAuthModalOpen(true);
    } else if (!activeUser || !activeOrg) {
      setIsGoogleAuthModalOpen(true);
    }
  }, [activeUser, activeOrg]);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('commit_orgs', JSON.stringify(organizations));
  }, [organizations]);

  useEffect(() => {
    if (activeOrg) {
      localStorage.setItem('commit_active_org', JSON.stringify(activeOrg));
    } else {
      localStorage.removeItem('commit_active_org');
    }
  }, [activeOrg]);

  useEffect(() => {
    localStorage.setItem('commit_join_requests', JSON.stringify(joinRequests));
  }, [joinRequests]);

  useEffect(() => {
    localStorage.setItem('commit_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (activeUser) {
      localStorage.setItem('commit_active_user', JSON.stringify(activeUser));
    } else {
      localStorage.removeItem('commit_active_user');
    }
  }, [activeUser]);

  useEffect(() => {
    localStorage.setItem('commit_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('commit_comments', JSON.stringify(comments));
  }, [comments]);

  useEffect(() => {
    localStorage.setItem('commit_activities', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem('commit_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Toast Helper
  const showToast = (message: string, type: Toast['type'] = 'info') => {
    const toast: Toast = { id: 'toast-' + Date.now(), message, type };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 3500);
  };

  // Helper getters
  const getUserById = (id: string) => users.find((u) => u.id === id);

  const getOrgByInviteCode = (code: string) => {
    return organizations.find((o) => o.inviteCode.toLowerCase() === code.trim().toLowerCase());
  };

  // Multi-Tenant Scoped Computed Properties
  const orgUsers = useMemo(() => {
    if (!activeOrg) return [];
    return users.filter((u) => u.orgIds?.includes(activeOrg.id) || u.orgId === activeOrg.id);
  }, [users, activeOrg?.id]);

  const orgTasks = useMemo(() => {
    if (!activeOrg) return [];
    return tasks.filter((t) => t.orgId === activeOrg.id);
  }, [tasks, activeOrg?.id]);

  const pendingRequestsForActiveOrg = useMemo(() => {
    if (!activeOrg) return [];
    return joinRequests.filter((r) => r.orgId === activeOrg.id && r.status === 'pending');
  }, [joinRequests, activeOrg?.id]);

  const unreadNotificationCount = useMemo(() => {
    if (!activeUser) return 0;
    return notifications.filter((n) => n.userId === activeUser.id && !n.read).length;
  }, [notifications, activeUser?.id]);

  const pendingRequestsCount = pendingRequestsForActiveOrg.length;

  // Logging Activity helper
  const logActivity = (taskId: string, type: Activity['type'], details: string) => {
    if (!activeUser) return;
    const newAct: Activity = {
      id: 'act-' + Date.now() + Math.random().toString(36).substring(2, 5),
      taskId,
      userId: activeUser.id,
      type,
      details,
      createdAt: new Date().toISOString(),
    };
    setActivities((prev) => [newAct, ...prev]);
  };

  // Notification helper
  const addNotification = (
    userId: string,
    title: string,
    message: string,
    taskId: string,
    type: Notification['type']
  ) => {
    const newNotif: Notification = {
      id: 'notif-' + Date.now() + Math.random().toString(36).substring(2, 5),
      userId,
      title,
      message,
      taskId,
      type,
      read: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // ==========================================
  // MULTI-TENANT ACTIONS
  // ==========================================

  // 1. Sign in with Google (creates or finds user by email)
  const signInWithGoogle = (email: string, name: string, avatarUrl: string): User => {
    const cleanEmail = email.trim().toLowerCase();
    const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (existing) {
      const updatedUser = {
        ...existing,
        name: name.trim() || existing.name,
        avatar: avatarUrl || existing.avatar,
      };
      setUsers((prev) => prev.map((u) => (u.id === existing.id ? updatedUser : u)));
      setActiveUser(updatedUser);
      showToast(`Welcome back, ${updatedUser.name}!`, 'success');
      return updatedUser;
    }

    // New Google User
    const newUser: User = {
      id: 'user-' + Date.now(),
      name: name.trim() || 'New Member',
      email: cleanEmail,
      avatar: avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
      role: 'Member',
      orgId: null,
      orgIds: [],
    };

    setUsers((prev) => [...prev, newUser]);
    setActiveUser(newUser);
    showToast(`Account created for ${newUser.name}!`, 'success');
    return newUser;
  };

  // 2. Create Organization
  const createOrganization = (orgName: string): Organization => {
    const slug = orgName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
    const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
    const creatorId = activeUser ? activeUser.id : 'user-' + Date.now();
    
    const newOrg: Organization = {
      id: 'org-' + Date.now(),
      name: orgName.trim(),
      inviteCode: `${slug}-${randomCode}`,
      adminId: creatorId,
      createdAt: new Date().toISOString(),
    };

    setOrganizations((prev) => [...prev, newOrg]);

    if (activeUser) {
      // Update user as Admin of this new org
      const updatedUser: User = {
        ...activeUser,
        role: 'Workspace Admin',
        orgId: newOrg.id,
        orgIds: Array.from(new Set([...(activeUser.orgIds || []), newOrg.id])),
      };

      setUsers((prev) => prev.map((u) => (u.id === activeUser.id ? updatedUser : u)));
      setActiveUser(updatedUser);
    }
    setActiveOrg(newOrg);

    showToast(`Created organization "${newOrg.name}"`, 'success');
    return newOrg;
  };

  // 3. Request to Join Organization via Invite Code
  const requestToJoinOrg = (inviteCode: string) => {
    const targetOrg = getOrgByInviteCode(inviteCode);
    if (!targetOrg) {
      return { success: false, message: 'Invalid or expired invite link.' };
    }
    if (!activeUser) {
      return { success: false, message: 'Please sign in first to join an organization.' };
    }

    // Check if user is already a member
    if (activeUser.orgIds?.includes(targetOrg.id) || activeUser.orgId === targetOrg.id) {
      setActiveOrg(targetOrg);
      return { success: true, message: `You are already a member of ${targetOrg.name}.`, org: targetOrg };
    }

    // Check if user already submitted a pending request
    const existingReq = joinRequests.find(
      (r) => r.orgId === targetOrg.id && r.userId === activeUser.id && r.status === 'pending'
    );
    if (existingReq) {
      return {
        success: true,
        message: `Your join request for ${targetOrg.name} is already pending Admin approval.`,
        org: targetOrg,
        request: existingReq,
      };
    }

    const newRequest: JoinRequest = {
      id: 'req-' + Date.now(),
      orgId: targetOrg.id,
      userId: activeUser.id,
      userName: activeUser.name,
      userEmail: activeUser.email,
      userAvatar: activeUser.avatar || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setJoinRequests((prev) => [...prev, newRequest]);

    // Notify Org Admin
    const admin = getUserById(targetOrg.adminId);
    if (admin) {
      addNotification(
        admin.id,
        'New Join Request',
        `${activeUser.name} requested to join ${targetOrg.name}.`,
        '',
        'assigned'
      );
    }

    showToast(`Join request sent to ${targetOrg.name} Admin!`, 'info');
    return { success: true, message: `Join request submitted! Waiting for Admin approval.`, org: targetOrg, request: newRequest };
  };

  // 4. Approve Join Request
  const approveJoinRequest = (requestId: string) => {
    const req = joinRequests.find((r) => r.id === requestId);
    if (!req) return;

    setJoinRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'approved' } : r))
    );

    // Add user to Organization
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === req.userId) {
          const userOrgIds = Array.from(new Set([...(u.orgIds || []), req.orgId]));
          return {
            ...u,
            orgId: u.orgId || req.orgId,
            orgIds: userOrgIds,
            role: 'Member',
          };
        }
        return u;
      })
    );

    showToast(`Approved ${req.userName}'s request to join!`, 'success');
  };

  // 5. Reject Join Request
  const rejectJoinRequest = (requestId: string) => {
    const req = joinRequests.find((r) => r.id === requestId);
    if (!req) return;

    setJoinRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'rejected' } : r))
    );

    showToast(`Rejected join request from ${req.userName}.`, 'info');
  };

  // 6. Switch Active Organization
  const switchOrganization = (orgId: string) => {
    const target = organizations.find((o) => o.id === orgId);
    if (target) {
      setActiveOrg(target);
      // Update user's active orgId
      if (activeUser) {
        const updatedUser: User = { ...activeUser, orgId: target.id };
        setActiveUser(updatedUser);
        setUsers((prev) => prev.map((u) => (u.id === activeUser.id ? updatedUser : u)));
      }
      showToast(`Switched workspace to ${target.name}`, 'info');
    }
  };

  // 7. Regenerate Invite Code
  const regenerateInviteCode = (orgId: string): string => {
    const target = organizations.find((o) => o.id === orgId);
    if (!target) return '';
    const slug = target.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
    const newCode = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;

    setOrganizations((prev) =>
      prev.map((o) => (o.id === orgId ? { ...o, inviteCode: newCode } : o))
    );
    showToast(`Generated new invite link for ${target.name}`, 'success');
    return newCode;
  };

  // Helper to generate unique task number in format YY/M/ID e.g. 26/9/107
  const generateNextTaskNumber = (currentTasks: Task[]): string => {
    const d = new Date();
    const year = d.getFullYear().toString().slice(-2);
    const month = d.getMonth() + 1;

    let maxSeq = 100;
    currentTasks.forEach((t) => {
      if (t.taskNumber) {
        const parts = t.taskNumber.split('/');
        if (parts.length === 3) {
          const seq = parseInt(parts[2], 10);
          if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
          }
        }
      }
    });
    return `${year}/${month}/${maxSeq + 1}`;
  };

  // 1. Create Task
  const createTask = (data: {
    title: string;
    assigneeId: string;
    requestedDeadline?: string;
    note?: string;
    referenceUrl?: string;
  }): Task => {
    const now = new Date().toISOString();
    const taskNumber = generateNextTaskNumber(tasks);
    const newTask: Task = {
      id: 'task-' + Date.now(),
      orgId: activeOrg ? activeOrg.id : '',
      taskNumber,
      title: data.title.trim(),
      note: data.note?.trim(),
      creatorId: activeUser ? activeUser.id : '',
      assigneeId: data.assigneeId,
      requestedDeadline: data.requestedDeadline,
      status: 'awaiting_acknowledgement',
      referenceUrl: data.referenceUrl?.trim(),
      createdAt: now,
      updatedAt: now,
    };

    setTasks((prev) => [newTask, ...prev]);

    const doerName = getUserById(data.assigneeId)?.name || 'Someone';
    logActivity(
      newTask.id,
      'created',
      `Task created for Doer: ${activeUser && data.assigneeId === activeUser.id ? 'themselves' : doerName}`
    );

    if (activeUser && data.assigneeId !== activeUser.id) {
      addNotification(
        data.assigneeId,
        'New Task Assigned',
        `${activeUser.name} assigned you "${newTask.title}".`,
        newTask.id,
        'assigned'
      );
    }

    showToast(`Created task "${newTask.title}"`, 'success');
    return newTask;
  };

  // 2. Accept Task
  const acceptTask = (taskId: string, eta?: string) => {
    const now = new Date().toISOString();
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            status: 'accepted',
            assigneeEta: eta || t.assigneeEta,
            updatedAt: now,
          };
        }
        return t;
      })
    );

    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      logActivity(
        taskId,
        'accepted',
        eta ? `Accepted task with Doer ETA: ${eta}` : 'Accepted task'
      );

      if (activeUser && task.creatorId !== activeUser.id) {
        addNotification(
          task.creatorId,
          'Task Accepted',
          `${activeUser.name} accepted "${task.title}".`,
          taskId,
          'modified'
        );
      }
    }
    showToast('Accepted task', 'success');
  };

  // 3. Start Task
  const startTask = (taskId: string) => {
    const now = new Date().toISOString();
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            status: 'in_progress',
            updatedAt: now,
          };
        }
        return t;
      })
    );

    logActivity(taskId, 'status_changed', 'Changed status to In Progress');
    showToast('Moved to In Progress', 'info');
  };

  // 4. Mark Blocked
  const markBlocked = (taskId: string, reason: string) => {
    const now = new Date().toISOString();
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            status: 'blocked',
            blockedReason: reason,
            updatedAt: now,
          };
        }
        return t;
      })
    );

    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      logActivity(taskId, 'blocked', `Marked blocked: ${reason}`);

      if (activeUser && task.creatorId !== activeUser.id) {
        addNotification(
          task.creatorId,
          'Task Blocked',
          `${activeUser.name} marked "${task.title}" as blocked. Reason: ${reason}`,
          taskId,
          'blocked'
        );
      }
    }
    showToast('Marked task as blocked', 'warning');
  };

  // 5. Unblock Task
  const unblockTask = (taskId: string) => {
    const now = new Date().toISOString();
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            status: 'in_progress',
            blockedReason: undefined,
            updatedAt: now,
          };
        }
        return t;
      })
    );

    logActivity(taskId, 'unblocked', 'Unblocked task, returned to In Progress');
    showToast('Unblocked task', 'success');
  };

  // 6. Mark Complete
  const markComplete = (taskId: string, comment?: string) => {
    const now = new Date().toISOString();
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            status: 'completed',
            completionComment: comment || t.completionComment,
            completedAt: now,
            updatedAt: now,
          };
        }
        return t;
      })
    );

    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      logActivity(taskId, 'completed', 'Marked task as completed');

      if (activeUser) {
        // Notify the other party
        const notifyUserId = task.creatorId === activeUser.id ? task.assigneeId : task.creatorId;
        if (notifyUserId !== activeUser.id) {
          addNotification(
            notifyUserId,
            'Task Completed',
            `${activeUser.name} completed "${task.title}".`,
            taskId,
            'completed'
          );
        }
      }
    }

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    showToast('🎉 Task completed!', 'success');
  };

  // 7. Nudge Assignee
  const nudgeAssignee = (taskId: string): { success: boolean; message: string } => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return { success: false, message: 'Task not found.' };

    const now = new Date();
    if (task.lastNudgedAt) {
      const lastNudge = new Date(task.lastNudgedAt);
      const diffMinutes = (now.getTime() - lastNudge.getTime()) / (1000 * 60);
      if (diffMinutes < 5) {
        showToast('Nudged recently. Please wait a few minutes before nudging again.', 'warning');
        return {
          success: false,
          message: 'Nudged recently. Please wait a few minutes before nudging again.',
        };
      }
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, lastNudgedAt: now.toISOString() } : t))
    );

    logActivity(taskId, 'nudged', 'Creator sent a nudge reminder to Doer');
    if (activeUser) {
      addNotification(
        task.assigneeId,
        'Nudge Reminder',
        `${activeUser.name} nudged you on task "${task.title}".`,
        taskId,
        'nudged'
      );
    }

    const doerName = getUserById(task.assigneeId)?.name || 'Doer';
    showToast(`🔔 Nudge sent to ${doerName}!`, 'info');
    return { success: true, message: 'Nudge sent successfully!' };
  };

  // 8. Update Task
  const updateTask = (taskId: string, updates: Partial<Task>) => {
    const now = new Date().toISOString();
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates, updatedAt: now } : t))
    );
    showToast('Updated task details', 'success');
  };

  // 9. Add Comment
  const addComment = (taskId: string, text: string) => {
    if (!activeUser) return;
    const newComment: Comment = {
      id: 'comment-' + Date.now(),
      taskId,
      userId: activeUser.id,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    setComments((prev) => [...prev, newComment]);
    logActivity(taskId, 'comment_added', `Added comment: "${text.trim().substring(0, 30)}..."`);
  };

  // 10. Notifications
  const markNotificationRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    if (!activeUser) return;
    setNotifications((prev) =>
      prev.map((n) => (n.userId === activeUser.id ? { ...n, read: true } : n))
    );
  };

  // 11. Invite Team Member directly
  const inviteTeamMember = (name: string, email: string, role: UserRole) => {
    const newUser: User = {
      id: 'user-' + Date.now(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200`,
      role,
      orgId: activeOrg ? activeOrg.id : null,
      orgIds: activeOrg ? [activeOrg.id] : [],
    };
    setUsers((prev) => [...prev, newUser]);
    if (activeOrg) {
      showToast(`Added ${name} to ${activeOrg.name}`, 'success');
    }
  };

  // 12. Reset / Clear All Data
  const resetDemoData = () => {
    localStorage.removeItem('commit_orgs');
    localStorage.removeItem('commit_active_org');
    localStorage.removeItem('commit_join_requests');
    localStorage.removeItem('commit_users');
    localStorage.removeItem('commit_active_user');
    localStorage.removeItem('commit_tasks');
    localStorage.removeItem('commit_comments');
    localStorage.removeItem('commit_activities');
    localStorage.removeItem('commit_notifications');

    setOrganizations([]);
    setActiveOrg(null);
    setJoinRequests([]);
    setUsers([]);
    setActiveUser(null);
    setTasks([]);
    setComments([]);
    setActivities([]);
    setNotifications([]);
    setIsGoogleAuthModalOpen(true);

    showToast('Cleared all local application & workspace data', 'info');
  };

  return (
    <TaskContext.Provider
      value={{
        organizations,
        activeOrg,
        joinRequests,
        pendingInviteCode,
        setPendingInviteCode,
        isGoogleAuthModalOpen,
        setIsGoogleAuthModalOpen,
        isPendingRequestsModalOpen,
        setIsPendingRequestsModalOpen,

        users,
        activeUser,
        setActiveUser,
        tasks,
        comments,
        activities,
        notifications,
        activeTab,
        setActiveTab,
        selectedTaskId,
        setSelectedTaskId,
        selectedTeamMemberId,
        setSelectedTeamMemberId,
        searchQuery,
        setSearchQuery,
        isCreateModalOpen,
        setIsCreateModalOpen,
        toasts,

        signInWithGoogle,
        createOrganization,
        requestToJoinOrg,
        approveJoinRequest,
        rejectJoinRequest,
        switchOrganization,
        regenerateInviteCode,
        getOrgByInviteCode,

        createTask,
        acceptTask,
        startTask,
        markBlocked,
        unblockTask,
        markComplete,
        nudgeAssignee,
        updateTask,
        addComment,
        markNotificationRead,
        markAllNotificationsRead,
        inviteTeamMember,
        resetDemoData,
        showToast,

        unreadNotificationCount,
        pendingRequestsCount,
        getUserById,
        orgUsers,
        orgTasks,
        pendingRequestsForActiveOrg,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
};
