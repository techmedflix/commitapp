import React, { useState, useMemo } from 'react';
import { useTaskContext } from '../../context/TaskContext';
import { TaskRow } from './TaskRow';
import type { Task } from '../../types';
import { formatDateLabel } from '../../utils/formatters';
import { Inbox, Filter, AlertCircle, Plus } from 'lucide-react';

export const MyWorkView: React.FC = () => {
  const { activeUser, orgTasks, searchQuery, setIsCreateModalOpen } = useTaskContext();

  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter tasks assigned to activeUser (excluding completed)
  const myWorkTasks = useMemo(() => {
    if (!activeUser) return [];
    return orgTasks.filter((t) => {
      if (t.assigneeId !== activeUser.id) return false;
      if (t.status === 'completed') return false;

      // Global search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().replace(/^#/, '');
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchNote = t.note?.toLowerCase().includes(q) || false;
        const matchNum = t.taskNumber?.toLowerCase().includes(q) || false;
        if (!matchTitle && !matchNote && !matchNum) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;

      return true;
    });
  }, [orgTasks, activeUser?.id, searchQuery, statusFilter]);

  // Groupings
  const overdueTasks: Task[] = [];
  const todayTasks: Task[] = [];
  const upcomingTasks: Task[] = [];
  const noDeadlineTasks: Task[] = [];

  myWorkTasks.forEach((t) => {
    if (!t.requestedDeadline) {
      noDeadlineTasks.push(t);
    } else {
      const dateInfo = formatDateLabel(t.requestedDeadline);
      if (dateInfo.isOverdue) {
        overdueTasks.push(t);
      } else if (dateInfo.isToday) {
        todayTasks.push(t);
      } else {
        upcomingTasks.push(t);
      }
    }
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
      {/* Header & Filter Controls Bar */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white shadow-2xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <Inbox className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">MY WORK</h1>
            <span className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-0.5 rounded-full border border-indigo-200 font-semibold">
              {myWorkTasks.length} tasks
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Everything currently assigned to you (by team members or yourself).
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-3 text-sm">
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 shadow-2xs">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-900 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-white">All</option>
              <option value="awaiting_acknowledgement" className="bg-white">Awaiting Ack</option>
              <option value="accepted" className="bg-white">Accepted</option>
              <option value="in_progress" className="bg-white">In Progress</option>
              <option value="blocked" className="bg-white">Blocked</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task Groups Container */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
        {myWorkTasks.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <Inbox className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-800">You're all caught up!</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              No tasks currently assigned to you. Create a new task for yourself or your team.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg inline-flex items-center space-x-2 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          </div>
        ) : (
          <>
            {/* OVERDUE GROUP */}
            {overdueTasks.length > 0 && (
              <div>
                <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-200 text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>Overdue ({overdueTasks.length})</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {overdueTasks.map((task) => (
                    <TaskRow key={task.id} task={task} mode="my_work" />
                  ))}
                </div>
              </div>
            )}

            {/* TODAY GROUP */}
            {todayTasks.length > 0 && (
              <div>
                <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-xs font-bold text-amber-800 uppercase tracking-wider">
                  Today ({todayTasks.length})
                </div>
                <div className="divide-y divide-slate-100">
                  {todayTasks.map((task) => (
                    <TaskRow key={task.id} task={task} mode="my_work" />
                  ))}
                </div>
              </div>
            )}

            {/* UPCOMING GROUP */}
            {upcomingTasks.length > 0 && (
              <div>
                <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Upcoming ({upcomingTasks.length})
                </div>
                <div className="divide-y divide-slate-100">
                  {upcomingTasks.map((task) => (
                    <TaskRow key={task.id} task={task} mode="my_work" />
                  ))}
                </div>
              </div>
            )}

            {/* NO DEADLINE GROUP */}
            {noDeadlineTasks.length > 0 && (
              <div>
                <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  No deadline ({noDeadlineTasks.length})
                </div>
                <div className="divide-y divide-slate-100">
                  {noDeadlineTasks.map((task) => (
                    <TaskRow key={task.id} task={task} mode="my_work" />
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
