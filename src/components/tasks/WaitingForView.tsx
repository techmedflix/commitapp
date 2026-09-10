import React, { useMemo } from 'react';
import { useTaskContext } from '../../context/TaskContext';
import { TaskRow } from './TaskRow';
import type { Task } from '../../types';
import { formatDateLabel } from '../../utils/formatters';
import { Clock, AlertOctagon, Plus, CheckCircle2 } from 'lucide-react';

export const WaitingForView: React.FC = () => {
  const { activeUser, orgTasks, searchQuery, setIsCreateModalOpen } = useTaskContext();

  // Filter tasks created by activeUser and assigned to OTHER users (excluding completed)
  const waitingForTasks = useMemo(() => {
    if (!activeUser) return [];
    return orgTasks.filter((t) => {
      if (t.creatorId !== activeUser.id) return false;
      if (t.assigneeId === activeUser.id) return false; // Exclude self-assigned
      if (t.status === 'completed') return false;

      // Global search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().replace(/^#/, '');
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchNote = t.note?.toLowerCase().includes(q) || false;
        const matchNum = t.taskNumber?.toLowerCase().includes(q) || false;
        if (!matchTitle && !matchNote && !matchNum) return false;
      }

      return true;
    });
  }, [orgTasks, activeUser?.id, searchQuery]);

  // Simplified 2-Group System: "Needs Attention" vs "Pending Work"
  const needsAttentionTasks: Task[] = [];
  const pendingTasks: Task[] = [];

  waitingForTasks.forEach((t) => {
    const isOverdue = t.requestedDeadline ? formatDateLabel(t.requestedDeadline).isOverdue : false;
    const isBlocked = t.status === 'blocked';

    if (isBlocked || isOverdue) {
      needsAttentionTasks.push(t);
    } else {
      pendingTasks.push(t);
    }
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
      {/* Header Bar */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white shadow-2xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <Clock className="w-5 h-5 text-amber-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">WAITING FOR</h1>
            <span className="bg-amber-50 text-amber-700 text-xs px-2.5 py-0.5 rounded-full border border-amber-200 font-semibold">
              {waitingForTasks.length} pending
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Everything you assigned to other team members that remains incomplete.
          </p>
        </div>
      </div>

      {/* Simplified Task Groups */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
        {waitingForTasks.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-800">Nothing pending from others</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              You aren't waiting on any open commitments from team members right now.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg inline-flex items-center space-x-2 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Assign Task</span>
            </button>
          </div>
        ) : (
          <>
            {/* 1. NEEDS ATTENTION (Blocked or Overdue) */}
            {needsAttentionTasks.length > 0 && (
              <div>
                <div className="px-6 py-3 bg-rose-50 border-b border-rose-200 text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center space-x-2">
                  <AlertOctagon className="w-4 h-4 text-rose-600 animate-pulse" />
                  <span>Needs Attention ({needsAttentionTasks.length}) — Blocked or Overdue</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {needsAttentionTasks.map((task) => (
                    <TaskRow key={task.id} task={task} mode="waiting_for" />
                  ))}
                </div>
              </div>
            )}

            {/* 2. PENDING WORK (All other active tasks) */}
            {pendingTasks.length > 0 && (
              <div>
                <div className="px-6 py-3 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>Pending Work ({pendingTasks.length})</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {pendingTasks.map((task) => (
                    <TaskRow key={task.id} task={task} mode="waiting_for" />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
