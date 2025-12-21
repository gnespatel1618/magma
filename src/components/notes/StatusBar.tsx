import React from 'react';

/**
 * Status bar component showing note statistics.
 * Similar to Obsidian's bottom status bar.
 */
export const StatusBar: React.FC<{
  noteContent: string;
  backlinksCount?: number;
}> = ({ noteContent, backlinksCount = 0 }) => {
  const wordCount = noteContent.trim() ? noteContent.trim().split(/\s+/).length : 0;
  const charCount = noteContent.length;
  const lineCount = noteContent.split('\n').length;

  return (
    <div className="h-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between px-4 text-xs text-slate-600">
      <div className="flex items-center gap-4">
        <span>{backlinksCount} backlinks</span>
        <span>{wordCount} words</span>
        <span>{charCount} characters</span>
        {lineCount > 0 && <span>{lineCount} lines</span>}
      </div>
      <div className="flex items-center gap-2">
        {/* Future: Add more status indicators here */}
      </div>
    </div>
  );
};

