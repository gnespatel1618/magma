import React from 'react';
import { Map as MapIcon } from 'lucide-react';

type NoteMeta = { id: string; path: string; title: string; type?: 'file' | 'folder'; children?: NoteMeta[] };

/**
 * Mindmap section component displaying notes as connected nodes.
 * Currently shows a simple list of note pills; auto-generation from headings/backlinks is stubbed.
 * 
 * @param notes - Array of note metadata to display
 */
export const MindmapSection: React.FC<{ notes: NoteMeta[] }> = ({ notes }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <MapIcon size={16} /> Mindmap (auto)
      </div>
      <div className="flex flex-wrap gap-2">
        {notes.map((n) => (
          <div
            key={n.id}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-gray-800 shadow-sm hover:bg-slate-100 hover:shadow-md transition-all cursor-pointer"
          >
            {n.title}
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-gray-800">
        Auto-generated from headings/backlinks. Edits in mindmap will sync back to linked notes/tasks (stubbed).
      </div>
    </div>
  );
};

