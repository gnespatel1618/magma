import React from 'react';
import { ChevronRight } from 'lucide-react';

type NoteMeta = { id: string; path: string; title: string; type?: 'file' | 'folder'; children?: NoteMeta[] };

/**
 * Breadcrumb navigation component showing the path to the current note.
 * Similar to Obsidian's breadcrumb navigation.
 */
export const Breadcrumbs: React.FC<{
  selectedNote: NoteMeta | null;
  notes: NoteMeta[];
}> = ({ selectedNote, notes }) => {
  // Find the path to the selected note
  const findPath = (items: NoteMeta[], targetId: string, path: NoteMeta[] = []): NoteMeta[] | null => {
    for (const item of items) {
      const currentPath = [...path, item];
      if (item.id === targetId) {
        return currentPath;
      }
      if (item.children) {
        const found = findPath(item.children, targetId, currentPath);
        if (found) return found;
      }
    }
    return null;
  };

  if (!selectedNote) return null;

  const path = findPath(notes, selectedNote.id);
  if (!path || path.length === 0) return null;

  return (
    <div className="flex items-center gap-1 text-xs text-slate-600 mb-2 px-1">
      {path.map((item, index) => (
        <React.Fragment key={item.id}>
          <span className={index === path.length - 1 ? 'text-gray-800 font-semibold' : 'hover:text-rose-brand cursor-pointer'}>
            {item.title}
          </span>
          {index < path.length - 1 && (
            <ChevronRight size={12} className="text-slate-400" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

