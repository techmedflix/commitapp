import React, { useState } from 'react';
import { useTaskContext } from '../../context/TaskContext';
import {
  getStatusBadgeClass,
  getStatusLabel,
  formatDateLabel,
  getUrlDomainLabel,
  formatRelativeTime,
} from '../../utils/formatters';
import {
  X,
  ArrowRight,
  Calendar,
  Clock,
  ExternalLink,
  Bell,
  Check,
  Play,
  AlertOctagon,
  MessageSquare,
  History,
  Send,
  AlertCircle,
  Copy,
} from 'lucide-react';

export const TaskDetailDrawer: React.FC = () => {
  const {
    tasks,
    selectedTaskId,
    setSelectedTaskId,
    activeUser,
    getUserById,
    acceptTask,
    startTask,
    markBlocked,
    unblockTask,
    markComplete,
    nudgeAssignee,
    comments,
    addComment,
    activities,
    showToast,
  } = useTaskContext();

  const [etaInput, setEtaInput] = useState('');
  const [showEtaModal, setShowEtaModal] = useState(false);

  const [blockedReasonInput, setBlockedReasonInput] = useState('');
  const [showBlockModal, setShowBlockModal] = useState(false);

  const [completionCommentInput, setCompletionCommentInput] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const [newCommentText, setNewCommentText] = useState('');
  const [justNudged, setJustNudged] = useState(false);

  if (!selectedTaskId) return null;

  const task = tasks.find((t) => t.id === selectedTaskId);
  if (!task) return null;

  const creator = getUserById(task.creatorId);
  const doer = getUserById(task.assigneeId);

  const isDoer = Boolean(activeUser && task.assigneeId === activeUser.id);
  const isCreator = Boolean(activeUser && task.creatorId === activeUser.id);

  const deadlineInfo = formatDateLabel(task.requestedDeadline);
  const linkInfo = getUrlDomainLabel(task.referenceUrl);

  const taskComments = comments.filter((c) => c.taskId === task.id);
  const taskActivities = activities.filter((a) => a.taskId === task.id);

  const handleAcceptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    acceptTask(task.id, etaInput || undefined);
    setShowEtaModal(false);
    setEtaInput('');
  };

  const handleBlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockedReasonInput.trim()) return;
    markBlocked(task.id, blockedReasonInput);
    setShowBlockModal(false);
    setBlockedReasonInput('');
  };

  const handleCompleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    markComplete(task.id, completionCommentInput || undefined);
    setShowCompleteModal(false);
    setCompletionCommentInput('');
  };

  const handleAddCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    addComment(task.id, newCommentText);
    setNewCommentText('');
  };

  const handleNudge = async () => {
    const res = await nudgeAssignee(task.id);
    if (res.success) {
      setJustNudged(true);
      setTimeout(() => setJustNudged(false), 3000);
    }
  };

  const displayTaskNumber = task.taskNumber || `26/9/${100 + (parseInt(task.id.replace(/\D/g, '')) || 1)}`;

  const handleCopyTaskId = () => {
    navigator.clipboard.writeText(`#${displayTaskNumber}`);
    showToast(`Copied task ID #${displayTaskNumber} to clipboard!`, 'info');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 flex justify-end">
      <div className="w-full max-w-lg bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 text-sm">
        {/* Top Navigation Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center space-x-2.5">
            <button
              onClick={handleCopyTaskId}
              className="text-xs font-mono font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 flex items-center space-x-1.5 transition cursor-pointer"
              title="Click to copy task ID"
            >
              <span>#{displayTaskNumber}</span>
              <Copy className="w-3 h-3 text-slate-400" />
            </button>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getStatusBadgeClass(
                task.status
              )}`}
            >
              {getStatusLabel(task.status)}
            </span>
          </div>

          <button
            onClick={() => setSelectedTaskId(null)}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition hover:bg-slate-100 cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* NUDGE NOTIFICATION BANNER FOR DOER */}
          {isDoer && task.lastNudgedAt && task.status !== 'completed' && (
            <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-xl flex items-start space-x-3 text-amber-900 shadow-2xs">
              <Bell className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm">Nudged by Creator</div>
                <p className="text-xs text-amber-800 mt-0.5">
                  {creator?.name || 'Creator'} nudged you about this task ({formatRelativeTime(task.lastNudgedAt)}).
                </p>
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-snug">
              {task.title}
            </h2>
          </div>

          {/* Creator -> Doer Flow Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src={creator?.avatar}
                alt={creator?.name}
                className="w-7 h-7 rounded-full object-cover border border-slate-200"
              />
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Creator</div>
                <div className="font-bold text-slate-900">{creator?.name}</div>
              </div>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-400" />

            <div className="flex items-center space-x-3">
              <img
                src={doer?.avatar}
                alt={doer?.name}
                className="w-7 h-7 rounded-full object-cover border border-slate-200"
              />
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Doer</div>
                <div className="font-bold text-slate-900">{doer?.name}</div>
              </div>
            </div>
          </div>

          {/* Core Concept: Requested Deadline vs Doer ETA */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-200 p-4 rounded-xl">
            {/* Requested Deadline (Creator Expectation) */}
            <div>
              <div className="text-xs uppercase font-bold text-slate-500 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Requested Deadline</span>
              </div>
              <div className="mt-1">
                <span
                  className={`font-bold text-sm ${
                    deadlineInfo.isOverdue
                      ? 'text-rose-600'
                      : deadlineInfo.isToday
                      ? 'text-amber-600'
                      : 'text-slate-800'
                  }`}
                >
                  {deadlineInfo.label}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Creator's expectation</div>
            </div>

            {/* Doer ETA (Doer Commitment) */}
            <div>
              <div className="text-xs uppercase font-bold text-indigo-600 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Doer ETA</span>
              </div>
              <div className="mt-1">
                {task.assigneeEta ? (
                  <span className="font-bold text-sm text-indigo-700">{task.assigneeEta}</span>
                ) : (
                  <span className="text-slate-400 italic font-normal text-xs">No ETA set yet</span>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Doer's commitment</div>
            </div>
          </div>

          {/* Blocked Reason Alert (If blocked) */}
          {task.status === 'blocked' && (
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-900 space-y-1">
              <div className="flex items-center space-x-2 font-bold text-rose-700">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Task Blocked Reason</span>
              </div>
              <p className="text-sm text-rose-800 leading-relaxed">
                {task.blockedReason || 'No reason specified'}
              </p>
            </div>
          )}

          {/* Context Note */}
          {task.note && (
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Note & Context
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                {task.note}
              </div>
            </div>
          )}

          {/* Reference Link */}
          {task.referenceUrl && (
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Reference Link
              </div>
              <a
                href={task.referenceUrl}
                target="_blank"
                rel="noreferrer"
                className="bg-slate-50 border border-slate-200 hover:border-indigo-500/50 p-3 rounded-xl flex items-center justify-between text-indigo-700 hover:text-indigo-800 transition font-semibold text-xs"
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <ExternalLink className="w-4 h-4 shrink-0 text-indigo-600" />
                  <span className="truncate">{task.referenceUrl}</span>
                </div>
                <span className="bg-indigo-100 px-2 py-0.5 rounded text-indigo-800 font-semibold">
                  {linkInfo.label}
                </span>
              </a>
            </div>
          )}

          {/* Workflow Action Buttons Toolbar */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="text-xs uppercase font-bold text-slate-500 tracking-wider">
              Workflow Actions
            </div>

            <div className="flex flex-wrap gap-2.5">
              {/* Doer Actions */}
              {isDoer && task.status === 'awaiting_acknowledgement' && (
                <button
                  onClick={() => setShowEtaModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg flex items-center space-x-2 transition cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Accept Task (Set Doer ETA)</span>
                </button>
              )}

              {isDoer && task.status === 'accepted' && (
                <button
                  onClick={() => startTask(task.id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg flex items-center space-x-2 transition cursor-pointer shadow-xs"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Working</span>
                </button>
              )}

              {/* BOTH Creator AND Doer can Mark Complete! */}
              {(isDoer || isCreator) && task.status !== 'completed' && (
                <button
                  onClick={() => setShowCompleteModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg flex items-center space-x-2 transition cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Mark Complete</span>
                </button>
              )}

              {isDoer && (task.status === 'in_progress' || task.status === 'accepted') && (
                <button
                  onClick={() => setShowBlockModal(true)}
                  className="bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-200 font-semibold px-4 py-2 rounded-lg flex items-center space-x-2 transition cursor-pointer"
                >
                  <AlertOctagon className="w-4 h-4" />
                  <span>Mark Blocked</span>
                </button>
              )}

              {task.status === 'blocked' && (isDoer || isCreator) && (
                <button
                  onClick={() => unblockTask(task.id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg flex items-center space-x-2 transition cursor-pointer shadow-xs"
                >
                  <Play className="w-4 h-4" />
                  <span>Unblock & Resume</span>
                </button>
              )}

              {/* Creator Nudge button with feedback */}
              {isCreator && !isDoer && task.status !== 'completed' && (
                <button
                  onClick={handleNudge}
                  className={`font-bold px-4 py-2 rounded-lg flex items-center space-x-2 border transition cursor-pointer ${
                    justNudged
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-200'
                  }`}
                >
                  {justNudged ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-700" />
                      <span>✓ Nudge Sent!</span>
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4 text-amber-700" />
                      <span>Nudge Doer</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Activity Log History */}
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center space-x-2">
              <History className="w-4 h-4 text-slate-400" />
              <span>Activity History</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3 max-h-48 overflow-y-auto">
              {taskActivities.length === 0 ? (
                <div className="text-slate-400 text-center py-2 text-xs">No activity recorded yet</div>
              ) : (
                taskActivities.map((act) => {
                  const actUser = getUserById(act.userId);
                  return (
                    <div key={act.id} className="flex items-start space-x-2.5 text-xs">
                      <img
                        src={actUser?.avatar}
                        alt={actUser?.name}
                        className="w-4 h-4 rounded-full object-cover shrink-0 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-slate-900">{actUser?.name || 'User'}: </span>
                        <span className="text-slate-600">{act.details}</span>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">
                        {formatRelativeTime(act.createdAt)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Primitive Comments Section */}
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              <span>Comments ({taskComments.length})</span>
            </div>

            {/* Comment Thread */}
            <div className="space-y-2.5 mb-3">
              {taskComments.map((c) => {
                const author = getUserById(c.userId);
                return (
                  <div key={c.id} className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center space-x-2">
                        <img
                          src={author?.avatar}
                          alt={author?.name}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                        <span className="font-bold text-slate-900">{author?.name}</span>
                      </div>
                      <span className="text-xs text-slate-400">{formatRelativeTime(c.createdAt)}</span>
                    </div>
                    <p className="text-slate-700 text-xs leading-relaxed">{c.text}</p>
                  </div>
                );
              })}
            </div>

            {/* Add Comment Input */}
            <form onSubmit={handleAddCommentSubmit} className="flex space-x-2">
              <input
                type="text"
                placeholder="Add a lightweight comment..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 font-medium"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-lg font-semibold flex items-center space-x-1 transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Accept & Set ETA Modal */}
      {showEtaModal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleAcceptSubmit}
            className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl"
          >
            <h3 className="font-bold text-slate-900 text-base">Accept Task & Set Doer ETA</h3>
            <p className="text-xs text-slate-600">
              The requested deadline is <strong>{deadlineInfo.label}</strong>. When do you commit to completing this?
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                Your ETA Estimate (Doer Commitment)
              </label>
              <input
                type="text"
                placeholder="e.g. Thursday 6 PM or Tomorrow 2 PM"
                value={etaInput}
                onChange={(e) => setEtaInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEtaModal(false)}
                className="px-4 py-2 text-slate-600 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold cursor-pointer"
              >
                Confirm & Accept
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mark Blocked Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleBlockSubmit}
            className="bg-white border border-rose-200 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl"
          >
            <h3 className="font-bold text-rose-700 text-base flex items-center space-x-2">
              <AlertOctagon className="w-5 h-5 text-rose-600" />
              <span>Mark Task Blocked</span>
            </h3>
            <p className="text-xs text-slate-600">
              Enter a short reason explaining what is preventing progress (e.g. waiting for finance numbers from Raj).
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                Block Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                placeholder="Waiting for..."
                value={blockedReasonInput}
                onChange={(e) => setBlockedReasonInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-500 font-medium"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                className="px-4 py-2 text-slate-600 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-semibold cursor-pointer"
              >
                Submit & Notify Creator
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mark Complete Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCompleteSubmit}
            className="bg-white border border-emerald-200 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl"
          >
            <h3 className="font-bold text-emerald-800 text-base flex items-center space-x-2">
              <Check className="w-5 h-5 text-emerald-600" />
              <span>Mark Task Complete</span>
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                Completion Note (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Revised deck uploaded to Drive."
                value={completionCommentInput}
                onChange={(e) => setCompletionCommentInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                className="px-4 py-2 text-slate-600 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold cursor-pointer"
              >
                Complete Task
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
