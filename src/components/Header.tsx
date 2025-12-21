import React from 'react';
import {
  Search,
  GitCommit,
  UploadCloud,
  DownloadCloud,
  Sparkles,
  Settings,
} from 'lucide-react';
import { Logo } from './ui/Logo';

/**
 * Header component for the main application view.
 * Contains the app title, search bar, and action buttons (Git operations, AI, Settings).
 * 
 * @param onGitAction - Callback function for Git operations (snapshot, push, pull)
 */
export const Header: React.FC<{
  onGitAction: (action: 'snapshot' | 'push' | 'pull') => void;
  onSettingsClick?: () => void;
}> = ({ onGitAction, onSettingsClick }) => {
  return (
    <header className="col-span-2 flex items-center justify-between px-4 py-3 bg-white shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full bg-rose-light px-3 py-1.5 text-rose-dark font-semibold">
          <Logo size={18} />
          Magma
        </div>
        <div className="hidden md:flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm w-72">
          <Search size={16} className="text-slate-500" />
          <input className="w-full text-sm outline-none" placeholder="Search notes, tasks, projects" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onGitAction('snapshot')}
          className="inline-flex items-center gap-2 rounded-lg bg-rose-brand px-3 py-2 text-sm font-semibold text-white shadow-soft hover:opacity-90 transition-opacity"
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
          className="inline-flex items-center gap-2 rounded-lg border border-rose-light bg-rose-light px-3 py-2 text-sm font-semibold text-rose-dark hover:bg-rose-light/80 transition-colors"
        >
          <Sparkles size={16} /> AI
        </button>
        <button 
          onClick={onSettingsClick}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-slate-50 transition-colors"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
};

