import React from 'react';
import { Link2, Info } from 'lucide-react';

type NoteMeta = { id: string; path: string; title: string; type?: 'file' | 'folder'; children?: NoteMeta[] };

/**
 * Backlinks panel component showing linked and unlinked mentions.
 * Similar to Obsidian's right sidebar panel.
 */
export const BacklinksPanel: React.FC<{
  selectedNote: NoteMeta | null;
  allNotes: NoteMeta[];
  noteContent: string;
}> = ({ selectedNote, allNotes, noteContent }) => {
  // Extract backlinks from note content (simple implementation)
  const extractBacklinks = (content: string): string[] => {
    // Match [[note name]] or [[note name|display text]]
    const matches = content.match(/\[\[([^\]]+)\]\]/g) || [];
    return matches.map(m => m.replace(/\[\[|\]\]/g, '').split('|')[0].trim());
  };

  // Find notes that link to the current note
  const findLinkedMentions = (): NoteMeta[] => {
    if (!selectedNote) return [];
    
    // This would need to scan all notes - for now, return empty
    // In a full implementation, we'd parse all notes for backlinks
    return [];
  };

  // Find unlinked mentions (notes mentioned but not linked)
  const findUnlinkedMentions = (): NoteMeta[] => {
    if (!selectedNote || !noteContent) return [];
    
    const mentioned = extractBacklinks(noteContent);
    return allNotes.filter(note => 
      note.type === 'file' && 
      mentioned.includes(note.title) &&
      note.id !== selectedNote.id
    );
  };

  const linkedMentions = findLinkedMentions();
  const unlinkedMentions = findUnlinkedMentions();

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
            {linkedMentions.map(note => (
              <div
                key={note.id}
                className="text-xs text-rose-brand hover:text-rose-dark cursor-pointer hover:bg-rose-light/50 p-1.5 rounded"
              >
                {note.title}
              </div>
            ))}
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
            {unlinkedMentions.map(note => (
              <div
                key={note.id}
                className="text-xs text-slate-600 hover:text-rose-brand cursor-pointer hover:bg-slate-50 p-1.5 rounded flex items-center gap-1"
              >
                <Link2 size={10} />
                {note.title}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

