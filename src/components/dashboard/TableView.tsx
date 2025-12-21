import React from 'react';
import { Table } from 'lucide-react';
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
 * Table view component displaying all tasks in a tabular format.
 * 
 * @param tasks - Array of all tasks to display
 */
export const TableView: React.FC<{ tasks: ParsedTask[] }> = ({ tasks }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Table size={16} /> Table view
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-gray-800">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Task</th>
              <th className="px-3 py-2 text-left font-semibold">Status</th>
              <th className="px-3 py-2 text-left font-semibold">Owner</th>
              <th className="px-3 py-2 text-left font-semibold">Due</th>
              <th className="px-3 py-2 text-left font-semibold">Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.map((t) => (
              <tr key={t.id} className="bg-white hover:bg-slate-50 transition-colors">
                <td className="px-3 py-2 font-semibold text-slate-900">{t.title}</td>
                <td className="px-3 py-2">
                  <Badge label={t.status} tone={statusTone[t.status]} />
                </td>
                <td className="px-3 py-2 text-gray-800">{t.owner ?? '—'}</td>
                <td className="px-3 py-2 text-gray-800">{t.due ?? '—'}</td>
                <td className="px-3 py-2">
                  {t.priority ? <Badge label={t.priority} tone={priorityTone[t.priority]} /> : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

