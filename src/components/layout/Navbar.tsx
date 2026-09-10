import React, { useState, useRef, useEffect } from 'react';
import { useTaskContext } from '../../context/TaskContext';
import {
  CheckSquare,
  Plus,
  Search,
  Bell,
  UserCheck,
  ChevronDown,
  X,
  AlertCircle,
  Building2,
  Copy,
  UserPlus,
  ShieldAlert,
} from 'lucide-react';
import { formatRelativeTime } from '../../utils/formatters';

interface NavbarProps {
  onOpenOnboarding: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenOnboarding }) => {
  const {
    organizations,
    activeOrg,
    switchOrganization,
    pendingRequestsCount,
    setIsPendingRequestsModalOpen,
    setIsGoogleAuthModalOpen,
    users,
    activeUser,
    setActiveUser,
    searchQuery,
    setSearchQuery,
    unreadNotificationCount,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    setIsCreateModalOpen,
    setSelectedTaskId,
    showToast,
  } = useTaskContext();

  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);

  const orgDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(e.target as Node)) {
        setIsOrgDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setIsUserDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        setIsNotifDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut listener ('C' or 'c' to open Create Task modal, '/' to focus search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setIsCreateModalOpen(true);
      }
      if (e.key === '/') {
        e.preventDefault();
        document.getElementById('global-search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsCreateModalOpen]);

  const handleCopyInviteLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeOrg) return;
    const inviteUrl = `${window.location.origin}/?invite=${activeOrg.inviteCode}`;
    navigator.clipboard.writeText(inviteUrl);
    showToast(`Copied ${activeOrg.name} invite link to clipboard!`, 'info');
  };

  const activeUserNotifs = notifications.filter((n) => activeUser && n.userId === activeUser.id);
  const isAdmin = Boolean(activeUser && (activeUser.role === 'Workspace Admin' || (activeOrg && activeOrg.adminId === activeUser.id)));

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 select-none shadow-xs">
      {/* Brand & Organization Switcher */}
      <div className="flex items-center space-x-3.5">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-xs">
            <CheckSquare className="w-4 h-4" />
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-900 hidden sm:inline">
            Commit
          </span>
        </div>

        {/* Organization Dropdown Selector */}
        <div className="relative" ref={orgDropdownRef}>
          <button
            onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
            className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-900 rounded-lg px-3 py-1.5 font-bold text-sm transition cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span className="max-w-[130px] sm:max-w-[180px] truncate">{activeOrg?.name || 'No Organization'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isOrgDropdownOpen && (
            <div className="absolute left-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden text-sm animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/80">
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  Organization Workspaces
                </div>
                <div className="text-xs font-semibold text-slate-700 mt-0.5">
                  Current: {activeOrg?.name || 'None'}
                </div>
              </div>

              <div className="py-1 max-h-52 overflow-y-auto divide-y divide-slate-50">
                {organizations.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No active organization workspaces yet
                  </div>
                ) : (
                  organizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => {
                        switchOrganization(org.id);
                        setIsOrgDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 transition text-left cursor-pointer ${
                        activeOrg && org.id === activeOrg.id ? 'bg-indigo-50/60 font-bold text-indigo-900' : 'text-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <Building2 className={`w-4 h-4 shrink-0 ${activeOrg && org.id === activeOrg.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span className="truncate">{org.name}</span>
                      </div>
                      {activeOrg && org.id === activeOrg.id && (
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                          Active
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>

              <div className="p-2 border-t border-slate-100 bg-slate-50/80 space-y-1">
                {activeOrg && (
                  <button
                    onClick={handleCopyInviteLink}
                    className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold py-2 rounded-lg transition flex items-center justify-center space-x-1.5 cursor-pointer border border-indigo-200"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Team Invite Link</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsOrgDropdownOpen(false);
                    setIsGoogleAuthModalOpen(true);
                  }}
                  className="w-full text-slate-600 hover:text-slate-900 text-xs py-1.5 font-bold flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Create or Join New Org</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center Search Bar */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="global-search-input"
            type="text"
            placeholder="Search by title, note, #ID... (Press '/')"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-9 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Right Controls: Pending Requests Badge, Quick Add, Notifs, User */}
      <div className="flex items-center space-x-2.5">
        {/* Pending Requests Badge for Org Admin */}
        {isAdmin && pendingRequestsCount > 0 && (
          <button
            onClick={() => setIsPendingRequestsModalOpen(true)}
            className="bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 border border-amber-300 transition animate-pulse cursor-pointer shadow-2xs"
            title="Pending Join Requests"
          >
            <ShieldAlert className="w-4 h-4 text-amber-700" />
            <span className="hidden sm:inline">{pendingRequestsCount} Pending Join</span>
            <span className="sm:hidden">{pendingRequestsCount}</span>
          </button>
        )}

        {/* Create Task Button */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-3.5 py-1.5 rounded-lg flex items-center space-x-1.5 transition shadow-2xs cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden sm:inline">Add task</span>
          <kbd className="hidden md:inline-block ml-1 text-[10px] bg-indigo-700/60 px-1.5 py-0.5 rounded text-indigo-100 font-sans">
            C
          </kbd>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifDropdownRef}>
          <button
            onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 relative transition cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
            )}
          </button>

          {isNotifDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden text-sm">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900">Notifications</span>
                  {unreadNotificationCount > 0 && (
                    <span className="bg-rose-50 text-rose-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                      {unreadNotificationCount} new
                    </span>
                  )}
                </div>
                {activeUserNotifs.some((n) => !n.read) && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-indigo-600 hover:underline text-xs font-semibold"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {activeUserNotifs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No notifications yet
                  </div>
                ) : (
                  activeUserNotifs.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        markNotificationRead(n.id);
                        setSelectedTaskId(n.taskId);
                        setIsNotifDropdownOpen(false);
                      }}
                      className={`p-3.5 cursor-pointer transition hover:bg-slate-50 flex items-start space-x-3 ${
                        !n.read ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {n.type === 'blocked' ? (
                          <AlertCircle className="w-4 h-4 text-rose-600" />
                        ) : n.type === 'nudged' ? (
                          <Bell className="w-4 h-4 text-amber-600" />
                        ) : (
                          <UserCheck className="w-4 h-4 text-indigo-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 truncate">{n.title}</span>
                          <span className="text-xs text-slate-400 shrink-0 ml-2">
                            {formatRelativeTime(n.createdAt)}
                          </span>
                        </div>
                        <p className="text-slate-600 text-xs mt-0.5 line-clamp-2">{n.message}</p>
                      </div>
                      {!n.read && (
                        <div className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1.5" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Account / Switcher Dropdown */}
        <div className="relative" ref={userDropdownRef}>
          <button
            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
            className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg px-2.5 py-1.5 transition text-sm cursor-pointer"
          >
            {activeUser ? (
              <>
                <img
                  src={activeUser.avatar}
                  alt={activeUser.name}
                  className="w-6 h-6 rounded-full object-cover border border-slate-300 shrink-0"
                />
                <span className="font-bold text-slate-900 max-w-[80px] truncate hidden sm:inline">
                  {activeUser.name}
                </span>
              </>
            ) : (
              <span className="font-bold text-indigo-600 text-xs">Sign In</span>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {isUserDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden text-sm">
              {activeUser && (
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                  <div className="font-bold text-slate-900 text-sm">{activeUser.name}</div>
                  <div className="text-xs text-slate-500 truncate">{activeUser.email}</div>
                  <div className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-full inline-block mt-1">
                    {activeUser.role}
                  </div>
                </div>
              )}

              {/* User Switcher list */}
              {users.length > 0 && (
                <div className="py-1">
                  <div className="px-4 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Switch Active Member
                  </div>
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setActiveUser(u);
                        setIsUserDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2 flex items-center justify-between hover:bg-slate-50 transition text-left cursor-pointer ${
                        activeUser && u.id === activeUser.id ? 'bg-indigo-50/50 text-indigo-700 font-semibold' : 'text-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <img
                          src={u.avatar}
                          alt={u.name}
                          className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                        <span className="truncate font-semibold text-xs">{u.name}</span>
                      </div>
                      {activeUser && u.id === activeUser.id && (
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                          Active
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="p-2 border-t border-slate-100 bg-slate-50/80 space-y-1">
                <button
                  onClick={() => {
                    setIsUserDropdownOpen(false);
                    setIsGoogleAuthModalOpen(true);
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 rounded-lg transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Google Sign In / Register</span>
                </button>

                <button
                  onClick={() => {
                    setIsUserDropdownOpen(false);
                    onOpenOnboarding();
                  }}
                  className="w-full text-slate-600 hover:text-slate-900 text-xs py-1.5 font-semibold text-center cursor-pointer block"
                >
                  Product Workflow Guide
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
