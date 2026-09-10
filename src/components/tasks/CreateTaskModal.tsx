import React, { useState, useEffect, useRef } from 'react';
import { useTaskContext } from '../../context/TaskContext';
import {
  X,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
  Link,
  AlignLeft,
  Sparkles,
} from 'lucide-react';

export const CreateTaskModal: React.FC = () => {
  const {
    orgUsers,
    activeUser,
    isCreateModalOpen,
    setIsCreateModalOpen,
    createTask,
    setSelectedTaskId,
  } = useTaskContext();

  const titleInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState(activeUser?.id || '');
  const [requestedDeadline, setRequestedDeadline] = useState<string>('');
  const [showDetails, setShowDetails] = useState(false);
  const [note, setNote] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');

  // Auto focus title input on open
  useEffect(() => {
    if (isCreateModalOpen) {
      setTitle('');
      setAssigneeId(activeUser?.id || (orgUsers[0]?.id || ''));
      setRequestedDeadline('');
      setShowDetails(false);
      setNote('');
      setReferenceUrl('');
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 50);
    }
  }, [isCreateModalOpen, activeUser?.id]);

  if (!isCreateModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTask = createTask({
      title,
      assigneeId,
      requestedDeadline: requestedDeadline || undefined,
      note: note || undefined,
      referenceUrl: referenceUrl || undefined,
    });

    setIsCreateModalOpen(false);
    setSelectedTaskId(newTask.id);
  };

  // Shortcut date helpers
  const setQuickDate = (offsetDays: number) => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    setRequestedDeadline(date.toISOString().split('T')[0]);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-sm">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-2.5 font-bold text-slate-900 text-base">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <span>Create Task</span>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(false)}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          {/* Task Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              ref={titleInputRef}
              type="text"
              required
              placeholder="e.g. Prepare revised Sanofi proposal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition font-medium"
            />
          </div>

          {/* Grid: Doer, Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Doer */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Doer (Assigned to)</span>
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 font-semibold focus:outline-none focus:border-indigo-500 transition cursor-pointer"
              >
                {activeUser && (
                  <option value={activeUser.id} className="bg-white">
                    Myself ({activeUser.name})
                  </option>
                )}
                {orgUsers
                  .filter((u) => u.id !== activeUser?.id)
                  .map((u) => (
                    <option key={u.id} value={u.id} className="bg-white">
                      {u.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Requested Deadline */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Deadline</span>
              </label>
              <input
                type="date"
                value={requestedDeadline}
                onChange={(e) => setRequestedDeadline(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 font-semibold focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500 font-medium">Quick deadline:</span>
            <button
              type="button"
              onClick={() => setQuickDate(0)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1 rounded-md transition border border-slate-200 cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(1)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1 rounded-md transition border border-slate-200 cursor-pointer"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(3)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1 rounded-md transition border border-slate-200 cursor-pointer"
            >
              In 3 days
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(7)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1 rounded-md transition border border-slate-200 cursor-pointer"
            >
              Next week
            </button>
          </div>

          {/* Collapsible Details Toggle */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="text-indigo-600 hover:underline text-sm font-semibold flex items-center space-x-1.5 transition cursor-pointer"
            >
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <span>{showDetails ? 'Hide details' : '+ Add details (Note & Reference link)'}</span>
            </button>
          </div>

          {/* Optional Fields Container */}
          {showDetails && (
            <div className="space-y-3 pt-2">
              {/* Note / Context */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                  <AlignLeft className="w-3.5 h-3.5 text-slate-400" />
                  <span>Note (Optional short context)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Include updated Q3 projected numbers and team slide."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition"
                />
              </div>

              {/* Reference Link */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                  <Link className="w-3.5 h-3.5 text-slate-400" />
                  <span>Reference Link (Slack, WhatsApp, Google Docs, etc.)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://docs.google.com/..."
                  value={referenceUrl}
                  onChange={(e) => setReferenceUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-lg text-slate-600 hover:text-slate-900 font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2 rounded-lg shadow-sm transition cursor-pointer active:scale-95"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
