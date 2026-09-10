import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
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
import confetti from 'canvas-confetti';
import { api, hasToken, setToken, type BootstrapPayload } from '../api/client';

interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'warning';
}

interface TaskContextType {
  organizations: Organization[];
  activeOrg: Organization | null;
  joinRequests: JoinRequest[];
  pendingInviteCode: string | null;
  setPendingInviteCode: (code: string | null) => void;
  isGoogleAuthModalOpen: boolean;
  setIsGoogleAuthModalOpen: (open: boolean) => void;
  isPendingRequestsModalOpen: boolean;
  setIsPendingRequestsModalOpen: (open: boolean) => void;
  isBootstrapping: boolean;

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

  signInWithGoogle: (
    email: string,
    name: string,
    avatarUrl: string,
    credential?: string
  ) => Promise<User>;
  createOrganization: (orgName: string) => Promise<Organization>;
  requestToJoinOrg: (
    inviteCode: string
  ) => Promise<{ success: boolean; message: string; org?: Organization; request?: JoinRequest }>;
  approveJoinRequest: (requestId: string) => Promise<void>;
  rejectJoinRequest: (requestId: string) => Promise<void>;
  switchOrganization: (orgId: string) => Promise<void>;
  regenerateInviteCode: (orgId: string) => Promise<string>;
  getOrgByInviteCode: (code: string) => Promise<Organization | undefined>;

  createTask: (data: {
    title: string;
    assigneeId: string;
    requestedDeadline?: string;
    note?: string;
    referenceUrl?: string;
  }) => Promise<Task>;
  acceptTask: (taskId: string, eta?: string) => Promise<void>;
  startTask: (taskId: string) => Promise<void>;
  markBlocked: (taskId: string, reason: string) => Promise<void>;
  unblockTask: (taskId: string) => Promise<void>;
  markComplete: (taskId: string, comment?: string) => Promise<void>;
  nudgeAssignee: (taskId: string) => Promise<{ success: boolean; message: string }>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  addComment: (taskId: string, text: string) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  inviteTeamMember: (name: string, email: string, role: UserRole) => Promise<void>;
  resetDemoData: () => void;
  showToast: (message: string, type?: Toast['type']) => void;

  unreadNotificationCount: number;
  pendingRequestsCount: number;
  getUserById: (id: string) => User | undefined;
  orgUsers: User[];
  orgTasks: Task[];
  pendingRequestsForActiveOrg: JoinRequest[];
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const [activeTab, setActiveTab] = useState<ActiveTab>('my_work');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null);
  const [isGoogleAuthModalOpen, setIsGoogleAuthModalOpen] = useState(false);
  const [isPendingRequestsModalOpen, setIsPendingRequestsModalOpen] = useState(false);

  const applyBundle = useCallback((bundle: BootstrapPayload) => {
    setActiveUser(bundle.user);
    setOrganizations(bundle.organizations);
    setActiveOrg(bundle.activeOrg);
    setUsers(bundle.users);
    setJoinRequests(bundle.joinRequests);
    setTasks(bundle.tasks);
    setComments(bundle.comments);
    setActivities(bundle.activities);
    setNotifications(bundle.notifications);
  }, []);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const toast: Toast = { id: 'toast-' + Date.now(), message, type };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 3500);
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteParam = urlParams.get('invite');
    if (inviteParam) setPendingInviteCode(inviteParam);

    let cancelled = false;
    (async () => {
      if (!hasToken()) {
        if (!cancelled) {
          setIsBootstrapping(false);
          setIsGoogleAuthModalOpen(true);
        }
        return;
      }
      try {
        const bundle = await api.bootstrap();
        if (!cancelled) {
          applyBundle(bundle);
          if (!bundle.activeOrg) setIsGoogleAuthModalOpen(true);
        }
      } catch {
        setToken(null);
        if (!cancelled) setIsGoogleAuthModalOpen(true);
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyBundle]);

  const getUserById = (id: string) => users.find((u) => u.id === id);

  const orgUsers = useMemo(() => users, [users]);
  const orgTasks = useMemo(() => tasks, [tasks]);

  const pendingRequestsForActiveOrg = useMemo(
    () => joinRequests.filter((r) => r.status === 'pending'),
    [joinRequests]
  );

  const unreadNotificationCount = useMemo(() => {
    if (!activeUser) return 0;
    return notifications.filter((n) => n.userId === activeUser.id && !n.read).length;
  }, [notifications, activeUser?.id]);

  const pendingRequestsCount = pendingRequestsForActiveOrg.length;

  const signInWithGoogle = async (
    email: string,
    name: string,
    avatarUrl: string,
    credential?: string
  ): Promise<User> => {
    const payload = credential
      ? await api.authGoogle({ credential, name, avatar: avatarUrl })
      : await api.authEmail({ email, name, avatar: avatarUrl });

    setToken(payload.token);
    applyBundle(payload);
    showToast(
      payload.organizations.length
        ? `Welcome back, ${payload.user.name}!`
        : `Account ready for ${payload.user.name}!`,
      'success'
    );
    return payload.user;
  };

  const createOrganization = async (orgName: string): Promise<Organization> => {
    const bundle = await api.createOrg(orgName);
    applyBundle(bundle);
    if (!bundle.activeOrg) throw new Error('Organization create failed');
    showToast(`Created organization "${bundle.activeOrg.name}"`, 'success');
    return bundle.activeOrg;
  };

  const requestToJoinOrg = async (inviteCode: string) => {
    try {
      const res = await api.joinOrg(inviteCode);
      if (res.user) applyBundle(res);
      showToast(res.message, res.success ? 'info' : 'warning');
      return { success: res.success, message: res.message, org: res.org };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join';
      showToast(message, 'warning');
      return { success: false, message };
    }
  };

  const approveJoinRequest = async (requestId: string) => {
    const bundle = await api.approveJoin(requestId);
    applyBundle(bundle);
    showToast('Approved join request!', 'success');
  };

  const rejectJoinRequest = async (requestId: string) => {
    const bundle = await api.rejectJoin(requestId);
    applyBundle(bundle);
    showToast('Rejected join request.', 'info');
  };

  const switchOrganization = async (orgId: string) => {
    const bundle = await api.switchOrg(orgId);
    applyBundle(bundle);
    showToast(`Switched workspace to ${bundle.activeOrg?.name}`, 'info');
  };

  const regenerateInviteCode = async (orgId: string): Promise<string> => {
    const res = await api.regenerateInvite(orgId);
    setOrganizations((prev) =>
      prev.map((o) => (o.id === orgId ? res.organization : o))
    );
    if (activeOrg?.id === orgId) setActiveOrg(res.organization);
    showToast(`Generated new invite link for ${res.organization.name}`, 'success');
    return res.inviteCode;
  };

  const getOrgByInviteCode = async (code: string) => {
    try {
      const res = await api.getOrgByInvite(code);
      return res.organization;
    } catch {
      return undefined;
    }
  };

  const createTask = async (data: {
    title: string;
    assigneeId: string;
    requestedDeadline?: string;
    note?: string;
    referenceUrl?: string;
  }): Promise<Task> => {
    const res = await api.createTask(data);
    applyBundle(res);
    showToast(`Created task "${res.task.title}"`, 'success');
    return res.task;
  };

  const acceptTask = async (taskId: string, eta?: string) => {
    applyBundle(await api.acceptTask(taskId, eta));
    showToast('Accepted task', 'success');
  };

  const startTask = async (taskId: string) => {
    applyBundle(await api.startTask(taskId));
    showToast('Moved to In Progress', 'info');
  };

  const markBlocked = async (taskId: string, reason: string) => {
    applyBundle(await api.blockTask(taskId, reason));
    showToast('Marked task as blocked', 'warning');
  };

  const unblockTask = async (taskId: string) => {
    applyBundle(await api.unblockTask(taskId));
    showToast('Unblocked task', 'success');
  };

  const markComplete = async (taskId: string, comment?: string) => {
    applyBundle(await api.completeTask(taskId, comment));
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    showToast('🎉 Task completed!', 'success');
  };

  const nudgeAssignee = async (taskId: string) => {
    try {
      const res = await api.nudgeTask(taskId);
      applyBundle(res);
      const doerName = getUserById(tasks.find((t) => t.id === taskId)?.assigneeId || '')?.name || 'Doer';
      showToast(`🔔 Nudge sent to ${doerName}!`, 'info');
      return { success: true, message: res.message };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nudge failed';
      showToast(message, 'warning');
      return { success: false, message };
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    applyBundle(await api.updateTask(taskId, updates));
    showToast('Updated task details', 'success');
  };

  const addComment = async (taskId: string, text: string) => {
    applyBundle(await api.addComment(taskId, text));
  };

  const markNotificationRead = async (notificationId: string) => {
    applyBundle(await api.markNotificationRead(notificationId));
  };

  const markAllNotificationsRead = async () => {
    applyBundle(await api.markAllNotificationsRead());
  };

  const inviteTeamMember = async (name: string, email: string, role: UserRole) => {
    if (!activeOrg) return;
    applyBundle(await api.inviteMember(activeOrg.id, { name, email, role }));
    showToast(`Added ${name} to ${activeOrg.name}`, 'success');
  };

  const resetDemoData = () => {
    setToken(null);
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
    showToast('Signed out and cleared local session', 'info');
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
        isBootstrapping,

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
