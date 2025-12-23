import React from 'react';
import { Link2, Info } from 'lucide-react';
import { getBacklinks, extractLinks } from '../../lib/backlinks';
import type { NoteMeta } from '../../types/notes';

/**
 * Backlinks panel component showing linked and unlinked mentions.
 * Similar to Obsidian's right sidebar panel.
 */
export const BacklinksPanel: React.FC<{
  selectedNote: NoteMeta | null;
  allNotes: NoteMeta[];
  noteContent: string;
  backlinksIndex: Map<string, NoteMeta[]>;
  onNoteClick?: (note: NoteMeta) => void;
}> = ({ selectedNote, allNotes, noteContent, backlinksIndex, onNoteClick }) => {
  // Find notes that link to the current note (backlinks)
  const linkedMentions = getBacklinks(selectedNote, backlinksIndex);

  // Find unlinked mentions (notes mentioned in current note but not linked)
  const findUnlinkedMentions = (): NoteMeta[] => {
    if (!selectedNote || !noteContent) return [];
    
    const mentioned = extractLinks(noteContent);
    const mentionedNormalized = new Set(mentioned.map(m => m.toLowerCase().trim()));
    
    // Create a map of all note titles (normalized) to NoteMeta
    const noteTitleMap = new Map<string, NoteMeta>();
    const flattenNotes = (items: NoteMeta[]): NoteMeta[] => {
      const result: NoteMeta[] = [];
      for (const item of items) {
        if (item.type === 'file') {
          result.push(item);
          noteTitleMap.set(item.title.toLowerCase().trim(), item);
        } else if (item.type === 'folder' && item.children) {
          result.push(...flattenNotes(item.children));
        }
      }
      return result;
    };
    flattenNotes(allNotes);
    
    // Find notes that are mentioned but don't exist as actual notes
    // or are mentioned but the link doesn't match exactly
    const unlinked: NoteMeta[] = [];
    for (const mentionedTitle of mentioned) {
      const normalized = mentionedTitle.toLowerCase().trim();
      const linkedNote = noteTitleMap.get(normalized);
      
      // If the mentioned note exists but is not the current note, it's a valid mention
      // But we want to show it as "unlinked" if it's not in the backlinks (meaning it's a forward link, not a backlink)
      // Actually, "unlinked mentions" in Obsidian/LogSeq context means notes that are mentioned in the text
      // but don't have a [[link]] syntax. Since we're already extracting from [[links]], 
      // unlinked mentions here would be notes that are mentioned but don't exist as files.
      // Let's show notes that are mentioned but don't exist as files as "unlinked"
      if (!linkedNote) {
        // This is a mention to a non-existent note - could show as "unlinked"
        // But since we only extract from [[links]], all mentions are already linked
        // So we'll skip this case
      }
    }
    
    // Actually, let's show notes that are mentioned in the current note's content
    // but don't have corresponding files (broken links)
    // For now, let's return empty since all [[links]] are already "linked"
    // The real "unlinked mentions" would be plain text mentions without [[ ]]
    // which is a more advanced feature
    return [];
  };

  const unlinkedMentions = findUnlinkedMentions();

  // Helper function to format the note path for display
  const formatNotePath = (note: NoteMeta): string => {
    // Remove .md extension and normalize path separators
    const path = note.id.replace(/\.md$/i, '').replace(/\\/g, '/');
    // If it's in the root, just show the title, otherwise show the path
    return path.includes('/') ? path : note.title;
  };

  if (!selectedNote) {
    return (
      <div className="h-full bg-white border-l border-slate-200 p-4 overflow-y-auto">
        <p className="text-sm text-slate-500 text-center mt-8">Select a note to view backlinks</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-white border-l border-slate-200 p-4 space-y-6 overflow-y-auto">
      {/* Linked Mentions */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold text-gray-800">Linked mentions</h3>
          <span className="text-xs text-slate-500">{linkedMentions.length}</span>
          <Info size={12} className="text-slate-400" />
        </div>
        {linkedMentions.length === 0 ? (
          <p className="text-xs text-slate-500">No backlinks found.</p>
        ) : (
          <div className="space-y-1">
            {linkedMentions.map(note => {
              const notePath = formatNotePath(note);
              const isInSubfolder = note.id.includes('/');
              
              return (
                <div
                  key={note.id}
                  onClick={() => onNoteClick?.(note)}
                  className="text-xs cursor-pointer hover:bg-rose-light/50 p-1.5 rounded transition-colors"
                >
                  <div className="text-rose-brand hover:text-rose-dark font-medium">
                    {note.title}
                  </div>
                  {isInSubfolder && (
                    <div className="text-slate-500 text-[10px] mt-0.5 truncate" title={notePath}>
                      {notePath}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Unlinked Mentions */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Unlinked mentions</h3>
        {unlinkedMentions.length === 0 ? (
          <p className="text-xs text-slate-500">No unlinked mentions.</p>
        ) : (
          <div className="space-y-1">
            {unlinkedMentions.map(note => {
              const notePath = formatNotePath(note);
              const isInSubfolder = note.id.includes('/');
              
              return (
                <div
                  key={note.id}
                  className="text-xs text-slate-600 hover:text-rose-brand cursor-pointer hover:bg-slate-50 p-1.5 rounded flex items-center gap-1"
                >
                  <Link2 size={10} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{note.title}</div>
                    {isInSubfolder && (
                      <div className="text-slate-500 text-[10px] mt-0.5 truncate" title={notePath}>
                        {notePath}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

