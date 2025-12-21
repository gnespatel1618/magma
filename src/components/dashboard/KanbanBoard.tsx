import React from 'react';
import { KanbanSquare, CheckCircle2, Clock3 } from 'lucide-react';
import type { ParsedTask } from '../../lib/taskParser';
import { Badge } from '../ui/Badge';

/**
 * Status tone mapping for task badges.
 */
const statusTone: Record<'todo' | 'doing' | 'done', string> = {
  todo: 'bg-slate-100 text-gray-800',
  doing: 'bg-rose-light text-rose-dark',
  done: 'bg-emerald-100 text-emerald-700',
};

/**
 * Priority tone mapping for task badges.
 */
const priorityTone: Record<'low' | 'med' | 'high', string> = {
  low: 'bg-slate-100 text-gray-800',
  med: 'bg-amber-100 text-amber-700',
  high: 'bg-rose-100 text-rose-700',
};

/**
 * Kanban board component displaying tasks grouped by status (todo, doing, done).
 * 
 * @param tasks - Array of all tasks to display
 */
export const KanbanBoard: React.FC<{ tasks: ParsedTask[] }> = ({ tasks }) => {
  /**
   * Groups tasks by their status.
   */
  const grouped = React.useMemo(
    () =>
      tasks.reduce<Record<'todo' | 'doing' | 'done', ParsedTask[]>>(
        (acc, t) => {
          acc[t.status].push(t);
          return acc;
        },
        { todo: [], doing: [], done: [] }
      ),
    [tasks]
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
          <KanbanSquare size={16} /> Kanban
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
            <CheckCircle2 size={12} /> Done
          </div>
          <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-amber-700">
            <Clock3 size={12} /> Due soon
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {(['todo', 'doing', 'done'] as Array<'todo' | 'doing' | 'done'>).map((col) => (
          <div key={col} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-gray-800">{col}</span>
              <span className="text-xs text-slate-500">{grouped[col].length}</span>
            </div>
            {grouped[col].map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Individual task card component for the Kanban board.
 * 
 * @param task - The task to display
 */
const TaskCard: React.FC<{ task: ParsedTask }> = ({ task }) => {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm space-y-2 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-slate-900">{task.title}</p>
        {task.priority && <Badge label={task.priority} tone={priorityTone[task.priority]} />}
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {task.owner && <span>{task.owner}</span>}
        {task.project && (
          <>
            <span>•</span>
            <span>{task.project}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Badge label={task.status} tone={statusTone[task.status]} />
        {task.due && (
          <div className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 rounded-full px-2 py-1">
            <Clock3 size={12} /> {task.due}
          </div>
        )}
      </div>
    </div>
  );
};

