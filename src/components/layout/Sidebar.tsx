import React from 'react';
import { useTaskContext } from '../../context/TaskContext';
import {
  Inbox,
  Clock,
  CheckCircle2,
  Users,
  Settings,
  AlertTriangle,
} from 'lucide-react';
import type { ActiveTab } from '../../types';

export const Sidebar: React.FC = () => {
  const { activeUser, tasks, activeTab, setActiveTab } = useTaskContext();

  // My Work count: assigned to active user, not completed
  const myWorkCount = tasks.filter(
    (t) => activeUser && t.assigneeId === activeUser.id && t.status !== 'completed'
  ).length;

  // Waiting For count: created by active user, assigned to others, not completed
  const waitingForTasks = tasks.filter(
    (t) => activeUser && t.creatorId === activeUser.id && t.assigneeId !== activeUser.id && t.status !== 'completed'
  );
  const waitingForCount = waitingForTasks.length;
  const blockedWaitingCount = waitingForTasks.filter((t) => t.status === 'blocked').length;

  const navItems: { id: ActiveTab; label: string; icon: React.ElementType; badge?: number; badgeType?: 'normal' | 'rose' }[] = [
    {
      id: 'my_work',
      label: 'My Work',
      icon: Inbox,
      badge: myWorkCount,
      badgeType: 'normal',
    },
    {
      id: 'waiting_for',
      label: 'Waiting For',
      icon: Clock,
      badge: waitingForCount,
      badgeType: blockedWaitingCount > 0 ? 'rose' : 'normal',
    },
    {
      id: 'completed',
      label: 'Completed',
      icon: CheckCircle2,
    },
    {
      id: 'team',
      label: 'Team',
      icon: Users,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 select-none py-4">
      {/* Top Nav Links */}
      <div className="space-y-1.5 px-3">
        <div className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-400">
          Views
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && item.badge > 0 && (
                <div className="flex items-center space-x-1.5">
                  {item.id === 'waiting_for' && blockedWaitingCount > 0 && (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                  )}
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      item.badgeType === 'rose'
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : isActive
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom User Info Card */}
      <div className="px-3 pt-3 border-t border-slate-100">
        {activeUser ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center space-x-3">
            <img
              src={activeUser.avatar}
              alt={activeUser.name}
              className="w-8 h-8 rounded-full object-cover border border-slate-200"
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 truncate">{activeUser.name}</div>
              <div className="text-xs text-slate-500 truncate">{activeUser.email}</div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center text-xs text-slate-500 font-semibold">
            Not Signed In
          </div>
        )}
      </div>
    </aside>
  );
};
