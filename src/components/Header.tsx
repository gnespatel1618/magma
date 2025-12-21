import React from 'react';
import {
  Search,
  GitCommit,
  UploadCloud,
  DownloadCloud,
  Sparkles,
  Settings,
  NotebookPen,
} from 'lucide-react';

/**
 * Header component for the main application view.
 * Contains the app title, search bar, and action buttons (Git operations, AI, Settings).
 * 
 * @param onGitAction - Callback function for Git operations (snapshot, push, pull)
 */
export const Header: React.FC<{
  onGitAction: (action: 'snapshot' | 'push' | 'pull') => void;
}> = ({ onGitAction }) => {
  return (
    <header className="col-span-2 flex items-center justify-between px-4 py-3 bg-white shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-indigo-700 font-semibold">
          <NotebookPen size={18} />
          Note Hub
        </div>
        <div className="hidden md:flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm w-72">
          <Search size={16} className="text-slate-500" />
          <input className="w-full text-sm outline-none" placeholder="Search notes, tasks, projects" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onGitAction('snapshot')}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-soft hover:bg-indigo-700"
        >
          <GitCommit size={16} /> Snapshot
        </button>
        <button
          onClick={() => onGitAction('push')}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-slate-50 transition-colors"
        >
          <UploadCloud size={16} /> Push
        </button>
        <button
          onClick={() => onGitAction('pull')}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-slate-50 transition-colors"
        >
          <DownloadCloud size={16} /> Pull
        </button>
        <button
          onClick={() => alert('AI summary stub')}
          className="inline-flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
        >
          <Sparkles size={16} /> AI
        </button>
        <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-slate-50 transition-colors">
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
};

