import React, { useMemo } from 'react';
import { useTaskContext } from '../../context/TaskContext';
import { TaskRow } from './TaskRow';
import { CheckCircle2 } from 'lucide-react';

export const CompletedView: React.FC = () => {
  const { orgTasks, searchQuery } = useTaskContext();

  const completedTasks = useMemo(() => {
    return orgTasks.filter((t) => {
      if (t.status !== 'completed') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().replace(/^#/, '');
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchNote = t.note?.toLowerCase().includes(q) || false;
        const matchComment = t.completionComment?.toLowerCase().includes(q) || false;
        const matchNum = t.taskNumber?.toLowerCase().includes(q) || false;
        if (!matchTitle && !matchNote && !matchComment && !matchNum) return false;
      }
      return true;
    });
  }, [orgTasks, searchQuery]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#fcfcfd] dark:bg-[#09090b]">
      {/* Header Bar */}
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between bg-white dark:bg-[#121215]">
        <div>
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">COMPLETED</h1>
            <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 text-xs px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20 font-semibold">
              {completedTasks.length} finished
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Archived record of all completed commitments in your workspace.
          </p>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-white/5">
        {completedTasks.length === 0 ? (
          <div className="p-16 text-center text-zinc-500">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-600" />
            <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-300">No completed tasks found</h3>
            <p className="text-sm text-zinc-500 mt-1 max-w-sm mx-auto">
              Completed tasks will appear here as team members finish their work.
            </p>
          </div>
        ) : (
          completedTasks.map((task) => <TaskRow key={task.id} task={task} mode="completed" />)
        )}
      </div>
    </div>
  );
};
