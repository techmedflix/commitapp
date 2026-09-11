import React, { useState } from 'react';
import type { Task } from '../../types';
import { useTaskContext } from '../../context/TaskContext';
import {
  getStatusBadgeClass,
  getStatusLabel,
  formatDateLabel,
  getUrlDomainLabel,
  formatRelativeTime,
} from '../../utils/formatters';
import {
  ExternalLink,
  Bell,
  Check,
  Play,
  AlertOctagon,
  Clock,
  AlertCircle,
  MessageSquare,
  Loader2,
} from 'lucide-react';

interface TaskRowProps {
  task: Task;
  mode: 'my_work' | 'waiting_for' | 'completed';
}

export const TaskRow: React.FC<TaskRowProps> = ({ task, mode }) => {
  const {
    activeUser,
    getUserById,
    setSelectedTaskId,
    acceptTask,
    startTask,
    markComplete,
    nudgeAssignee,
    comments,
  } = useTaskContext();

  const [justNudged, setJustNudged] = useState(false);
  const [loadingAction, setLoadingAction] = useState<'accept' | 'start' | 'complete' | 'nudge' | null>(null);

  const creator = getUserById(task.creatorId);
  const doer = getUserById(task.assigneeId);

  const deadlineInfo = formatDateLabel(task.requestedDeadline);
  const linkInfo = getUrlDomainLabel(task.referenceUrl);
  const taskComments = comments.filter((c) => c.taskId === task.id);

  const isDoer = Boolean(activeUser && task.assigneeId === activeUser.id);
  const isCreator = Boolean(activeUser && task.creatorId === activeUser.id);

  const handleNudge = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loadingAction) return;
    setLoadingAction('nudge');
    const res = await nudgeAssignee(task.id);
    setLoadingAction(null);
    if (res.success) {
      setJustNudged(true);
      setTimeout(() => setJustNudged(false), 3000);
    }
  };

  const handleQuickAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loadingAction) return;
    setLoadingAction('accept');
    await new Promise((resolve) => setTimeout(resolve, 250));
    acceptTask(task.id);
    setLoadingAction(null);
  };

  const handleQuickStart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loadingAction) return;
    setLoadingAction('start');
    await new Promise((resolve) => setTimeout(resolve, 250));
    startTask(task.id);
    setLoadingAction(null);
  };

  const handleQuickComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loadingAction) return;
    setLoadingAction('complete');
    await new Promise((resolve) => setTimeout(resolve, 250));
    markComplete(task.id);
    setLoadingAction(null);
  };

  const displayTaskNumber = task.taskNumber || `26/9/${100 + (parseInt(task.id.replace(/\D/g, '')) || 1)}`;

  return (
    <div
      onClick={() => setSelectedTaskId(task.id)}
      className={`group px-5 py-3.5 bg-white hover:bg-slate-50 border-b border-slate-100 transition flex items-center justify-between cursor-pointer text-sm select-none ${
        task.status === 'blocked' ? 'bg-rose-50/70 hover:bg-rose-100/70' : ''
      }`}
    >
      {/* Left Column: Title + Context Tags + Nudge Banner */}
      <div className="flex items-center space-x-3.5 min-w-0 flex-1 pr-4">
        {/* Task Title & Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
            {/* Task Number Badge */}
            <span className="shrink-0 text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-700 group-hover:border-indigo-200 transition">
              #{displayTaskNumber}
            </span>

            <span
              className={`font-semibold text-sm truncate ${
                task.status === 'completed'
                  ? 'line-through text-slate-400'
                  : task.status === 'blocked'
                  ? 'text-rose-900'
                  : 'text-slate-900 group-hover:text-indigo-600'
              }`}
            >
              {task.title}
            </span>

            {/* NUDGE CALLOUT BADGE FOR DOER IN MY WORK */}
            {isDoer && task.lastNudgedAt && task.status !== 'completed' && (
              <span className="shrink-0 bg-amber-100 text-amber-900 text-xs px-2.5 py-0.5 rounded-full flex items-center space-x-1 font-bold border border-amber-300 animate-pulse">
                <Bell className="w-3.5 h-3.5 text-amber-700" />
                <span>Nudged by {creator?.name || 'Creator'} ({formatRelativeTime(task.lastNudgedAt)})</span>
              </span>
            )}

            {/* Reference URL Pill */}
            {task.referenceUrl && (
              <a
                href={task.referenceUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-md flex items-center space-x-1 border border-indigo-200 transition font-medium"
              >
                <ExternalLink className="w-3 h-3" />
                <span>{linkInfo.label}</span>
              </a>
            )}

            {/* Comments count indicator */}
            {taskComments.length > 0 && (
              <span className="shrink-0 text-xs text-slate-400 flex items-center space-x-1 font-medium">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{taskComments.length}</span>
              </span>
            )}
          </div>

          {/* Subtitle / Note Preview or Block Reason */}
          {task.status === 'blocked' && task.blockedReason ? (
            <div className="text-xs text-rose-600 font-medium flex items-center space-x-1 mt-0.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Reason: {task.blockedReason}</span>
            </div>
          ) : task.note ? (
            <div className="text-xs text-slate-500 truncate mt-0.5 max-w-xl">
              {task.note}
            </div>
          ) : null}
        </div>
      </div>

      {/* Right Column: User Pill, Status Badge, ETA/Deadline & Quick Actions with FIXED COLUMN WIDTHS for vertical alignment */}
      <div className="flex items-center space-x-4 shrink-0">
        {/* User Pill (Show Doer in 'Waiting For', Creator in 'My Work') */}
        <div className="hidden sm:flex items-center space-x-2 w-28 text-slate-700 truncate text-xs font-semibold shrink-0">
          <img
            src={mode === 'waiting_for' ? doer?.avatar : creator?.avatar}
            alt={mode === 'waiting_for' ? doer?.name : creator?.name}
            className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0"
          />
          <span className="truncate text-slate-900 font-bold">
            {mode === 'waiting_for' ? doer?.name || 'Unassigned' : creator?.name || 'Self'}
          </span>
        </div>

        {/* Status Badge - Fixed Width */}
        <div className="w-32 shrink-0 flex justify-start">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center space-x-1 ${getStatusBadgeClass(
              task.status
            )}`}
          >
            {task.status === 'blocked' && <AlertOctagon className="w-3.5 h-3.5 mr-1 shrink-0" />}
            {task.status === 'in_progress' && <Play className="w-3 h-3 mr-1 fill-current shrink-0" />}
            <span>{getStatusLabel(task.status)}</span>
          </span>
        </div>

        {/* ETA vs Deadline Column - Fixed Width */}
        <div className="w-36 shrink-0 text-right text-xs flex flex-col justify-center font-medium">
          {task.status === 'completed' ? (
            <span className="text-slate-400">Done</span>
          ) : (
            <>
              {/* Requested Deadline */}
              <span
                className={`${
                  deadlineInfo.isOverdue
                    ? 'text-rose-600 font-bold'
                    : deadlineInfo.isToday
                    ? 'text-amber-600 font-semibold'
                    : 'text-slate-600'
                }`}
              >
                {deadlineInfo.label}
              </span>

              {/* Doer ETA commitment if present */}
              {task.assigneeEta && (
                <span className="text-xs text-indigo-600 flex items-center justify-end space-x-1 mt-0.5 font-semibold">
                  <Clock className="w-3 h-3 shrink-0" />
                  <span className="truncate max-w-[110px]">ETA: {task.assigneeEta}</span>
                </span>
              )}
            </>
          )}
        </div>

        {/* Action Toolbar - FIXED WIDTH w-48 (192px) so all columns stay vertically aligned! */}
        <div className="w-48 shrink-0 flex items-center justify-end space-x-1.5">
          {/* Nudge button with clear instant feedback */}
          {mode === 'waiting_for' && task.status !== 'completed' && (
            <button
              onClick={handleNudge}
              disabled={Boolean(loadingAction)}
              className={`text-xs font-bold px-2.5 py-1 rounded-md flex items-center space-x-1 border transition cursor-pointer shrink-0 disabled:opacity-50 ${
                justNudged
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300'
              }`}
              title="Nudge doer"
            >
              {loadingAction === 'nudge' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700 shrink-0" />
              ) : justNudged ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>Nudged!</span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Nudge</span>
                </>
              )}
            </button>
          )}

          {/* Doer Accept */}
          {isDoer && task.status === 'awaiting_acknowledgement' && (
            <button
              onClick={handleQuickAccept}
              disabled={Boolean(loadingAction)}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold px-2.5 py-1 rounded-md flex items-center space-x-1 transition cursor-pointer shadow-2xs shrink-0"
              title="Accept Task"
            >
              {loadingAction === 'accept' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <Check className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>Accept</span>
            </button>
          )}

          {/* Doer Start */}
          {isDoer && task.status === 'accepted' && (
            <button
              onClick={handleQuickStart}
              disabled={Boolean(loadingAction)}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold px-2.5 py-1 rounded-md flex items-center space-x-1 transition cursor-pointer shadow-2xs shrink-0"
              title="Start working"
            >
              {loadingAction === 'start' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current shrink-0" />
              )}
              <span>Start</span>
            </button>
          )}

          {/* BOTH Creator AND Doer can Mark Complete! */}
          {(isDoer || isCreator) && task.status !== 'completed' && task.status !== 'awaiting_acknowledgement' && (
            <button
              onClick={handleQuickComplete}
              disabled={Boolean(loadingAction)}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold px-2.5 py-1 rounded-md flex items-center space-x-1 transition cursor-pointer shadow-2xs shrink-0"
              title="Mark Complete"
            >
              {loadingAction === 'complete' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <Check className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>Complete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
