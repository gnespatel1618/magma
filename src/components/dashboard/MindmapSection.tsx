import React, { useState } from 'react';
import { Map as MapIcon, Maximize2, Minimize2 } from 'lucide-react';
import { MindmapCanvas } from '../mindmap/MindmapCanvas';

type NoteMeta = { id: string; path: string; title: string; type?: 'file' | 'folder'; children?: NoteMeta[] };

interface MindmapSectionProps {
  notes: NoteMeta[];
  onNoteSelect?: (note: NoteMeta) => void;
  onNoteOpen?: (note: NoteMeta) => void;
}

/**
 * Mindmap section component displaying notes as an interactive mind map.
 * Features Whimsical-style design with pan, zoom, and animated connections.
 * 
 * @param notes - Array of note metadata to display
 * @param onNoteSelect - Callback when a note is selected
 * @param onNoteOpen - Callback when a note is double-clicked to open
 */
export const MindmapSection: React.FC<MindmapSectionProps> = ({ 
  notes, 
  onNoteSelect,
  onNoteOpen 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-sm p-4">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <div className="p-2 rounded-lg bg-gradient-to-br from-rose-50 to-pink-50">
                <MapIcon size={18} className="text-rose-600" />
              </div>
              <span className="text-lg">Mind Map</span>
              <span className="text-xs text-slate-400 font-normal">
                {notes.length} {notes.length === 1 ? 'note' : 'notes'}
              </span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
              title="Exit fullscreen"
            >
              <Minimize2 size={20} />
            </button>
          </div>

          {/* Canvas */}
          <div className="flex-1 rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
            <MindmapCanvas 
              notes={notes} 
              onNoteSelect={onNoteSelect}
              onNoteOpen={onNoteOpen}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-soft overflow-hidden h-[400px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-rose-50 to-pink-50">
            <MapIcon size={14} className="text-rose-600" />
          </div>
          <span>Mind Map</span>
          <span className="text-xs text-slate-400 font-normal px-2 py-0.5 bg-slate-50 rounded-full">
            {notes.length} {notes.length === 1 ? 'note' : 'notes'}
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(true)}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          title="Expand to fullscreen"
        >
          <Maximize2 size={16} />
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <MindmapCanvas 
          notes={notes} 
          onNoteSelect={onNoteSelect}
          onNoteOpen={onNoteOpen}
        />
      </div>
    </div>
  );
};
