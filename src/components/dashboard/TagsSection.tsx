import React from 'react';
import { Link2 } from 'lucide-react';
import { getTagColor } from '../../lib/tagColors';

/**
 * Tags section component displaying all hashtags found in notes.
 * 
 * @param tags - Set of all unique tags found across all notes
 */
export const TagsSection: React.FC<{ tags: Set<string> }> = ({ tags }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Link2 size={16} /> Tags
      </div>
      {tags.size > 0 ? (
        <div className="flex flex-wrap gap-2">
          {Array.from(tags).map((tag) => {
            const colors = getTagColor(tag);
            return (
              <span
                key={tag}
                className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${colors.bg} ${colors.text} ${colors.border} ${colors.hover} cursor-pointer transition-colors`}
                title={`Click to filter notes with #${tag}`}
              >
                #{tag}
              </span>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-slate-500 italic">
          No tags yet. Add tags to your notes using #hashtag syntax.
        </div>
      )}
    </div>
  );
};

