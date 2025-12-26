import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Trash2, Plus, Brain } from 'lucide-react';

interface MindmapMeta {
  id: string;
  name: string;
  path: string;
  updatedAt: string;
}

interface MindmapListProps {
  vaultPath: string | null;
  currentMindmapId: string | null;
  onSelect: (mindmap: MindmapMeta) => void;
  onDelete: (mindmap: MindmapMeta) => void;
  onNew: () => void;
}

/**
 * Component for displaying a list of saved mindmaps in the sidebar.
 * Similar to NoteTree but for mindmaps.
 */
export const MindmapList: React.FC<MindmapListProps> = ({
  vaultPath,
  currentMindmapId,
  onSelect,
  onDelete,
  onNew,
}) => {
  const [mindmaps, setMindmaps] = useState<MindmapMeta[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMindmaps = useCallback(async () => {
    if (!vaultPath) {
      setMindmaps([]);
      return;
    }

    setLoading(true);
    try {
      const result = await window.appBridge?.listMindmaps?.(vaultPath);
      if (result?.ok) {
        setMindmaps(result.mindmaps);
      }
    } catch (error) {
      console.error('Error loading mindmaps:', error);
    } finally {
      setLoading(false);
    }
  }, [vaultPath]);

  useEffect(() => {
    loadMindmaps();
  }, [loadMindmaps]);

  // Refresh list when vault changes
  useEffect(() => {
    loadMindmaps();
  }, [vaultPath, loadMindmaps]);

  if (!vaultPath) {
    return (
      <div className="px-4 py-8 text-center text-sm text-slate-500">
        <Brain size={32} className="mx-auto mb-2 text-slate-300" />
        <p>Open a vault to view mindmaps</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-purple-600" />
          <span className="text-sm font-semibold text-slate-800">Mind Maps</span>
          <span className="text-xs text-slate-500">({mindmaps.length})</span>
        </div>
        <button
          onClick={onNew}
          className="p-1 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-800 transition-colors"
          title="New Mind Map"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            Loading...
          </div>
        ) : mindmaps.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            <Brain size={32} className="mx-auto mb-2 text-slate-300" />
            <p>No mindmaps yet</p>
            <button
              onClick={onNew}
              className="mt-3 px-3 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
            >
              Create your first mindmap
            </button>
          </div>
        ) : (
          <div className="py-1">
            {mindmaps.map((mindmap) => (
              <div
                key={mindmap.id}
                onClick={() => onSelect(mindmap)}
                className={`group flex items-center justify-between px-3 py-2 mx-1 rounded-lg cursor-pointer transition-colors ${
                  currentMindmapId === mindmap.id
                    ? 'bg-purple-50 border border-purple-200'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileText
                    size={16}
                    className={`flex-shrink-0 ${
                      currentMindmapId === mindmap.id
                        ? 'text-purple-600'
                        : 'text-slate-400'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm truncate ${
                        currentMindmapId === mindmap.id
                          ? 'font-semibold text-purple-900'
                          : 'text-slate-700'
                      }`}
                      title={mindmap.name}
                    >
                      {mindmap.name}
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(mindmap.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete "${mindmap.name}"? This cannot be undone.`)) {
                      onDelete(mindmap);
                    }
                  }}
                  className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                  title="Delete mindmap"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

