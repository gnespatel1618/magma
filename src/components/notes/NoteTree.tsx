import React, { useState, useRef, useEffect } from 'react';
import { Folder, FolderOpen, NotebookPen, ChevronRight, ChevronDown, Trash2 } from 'lucide-react';
import type { NoteMeta } from '../../types/notes';
import { ContextMenu } from '../ui/ContextMenu';

/**
 * Recursive tree component for displaying notes and folders in a hierarchical structure.
 * Supports expanding/collapsing folders and selecting notes or folders.
 * 
 * @param items - Array of note/folder items to display
 * @param selectedNote - Currently selected note (for highlighting)
 * @param selectedFolder - Currently selected folder (for highlighting)
 * @param onSelect - Callback when a note is clicked
 * @param onSelectFolder - Optional callback when a folder is clicked
 * @param onDelete - Optional callback when delete button is clicked
 * @param onRename - Optional callback when an item is renamed
 * @param level - Current nesting level (used for indentation, default: 0)
 */
export const NoteTree: React.FC<{
  items: NoteMeta[];
  selectedNote: NoteMeta | null;
  selectedFolder: NoteMeta | null;
  onSelect: (note: NoteMeta) => void;
  onSelectFolder?: (folder: NoteMeta | null) => void;
  onDelete?: (note: NoteMeta) => void;
  onRename?: (note: NoteMeta, newName: string) => void;
  level?: number;
}> = ({ items, selectedNote, selectedFolder, onSelect, onSelectFolder, onDelete, onRename, level = 0 }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: NoteMeta } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Toggles the expanded state of a folder.
   * 
   * @param id - The ID of the folder to toggle
   */
  const toggle = (id: string): void => {
    const next = new Set(expanded);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpanded(next);
  };

  /**
   * Starts editing an item's name.
   * 
   * @param item - The item to start editing
   */
  const startEditing = (item: NoteMeta): void => {
    setEditingId(item.id);
    setEditingValue(item.title);
  };

  /**
   * Saves the edited name.
   */
  const saveEdit = (): void => {
    if (!editingId || !onRename) return;
    const item = findItemById(items, editingId);
    if (item && editingValue.trim()) {
      onRename(item, editingValue.trim());
    }
    setEditingId(null);
    setEditingValue('');
  };

  /**
   * Cancels editing.
   */
  const cancelEdit = (): void => {
    setEditingId(null);
    setEditingValue('');
  };

  /**
   * Helper function to find an item by ID in the tree.
   */
  const findItemById = (items: NoteMeta[], id: string): NoteMeta | null => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children) {
        const found = findItemById(item.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  /**
   * Handles right-click to show context menu.
   * Only shows custom menu for non-editable elements.
   */
  const handleContextMenu = (e: React.MouseEvent, item: NoteMeta): void => {
    // Don't show custom menu if clicking on an input/textarea/editable element
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      // Let the native context menu show for editable elements
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  /**
   * Closes the context menu.
   */
  const closeContextMenu = (): void => {
    setContextMenu(null);
  };

  return (
    <>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          items={[
            {
              label: 'Rename',
              onClick: () => {
                if (onRename) {
                  startEditing(contextMenu.item);
                }
              },
            },
            ...(onDelete
              ? [
                  {
                    label: 'Delete',
                    onClick: () => {
                      onDelete(contextMenu.item);
                    },
                  },
                ]
              : []),
          ]}
        />
      )}
      <div className="space-y-0.5">
        {items.map((item) => {
        const isExpanded = expanded.has(item.id);
        const isSelected = selectedNote?.id === item.id;
        const isFolderSelected = selectedFolder?.id === item.id;
        const isFolder = item.type === 'folder';
        const indentPx = 8 + level * 20;

        if (isFolder) {
          const isEditing = editingId === item.id;
          return (
            <div key={item.id} className="group relative">
              <div
                className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm hover:bg-slate-50 transition-colors ${
                  isFolderSelected
                    ? 'bg-rose-light text-rose-dark border border-rose-light'
                    : isSelected
                    ? 'bg-rose-light text-rose-dark'
                    : 'text-gray-800'
                }`}
                style={{ paddingLeft: `${indentPx}px` }}
                onContextMenu={(e) => {
                  // Only handle context menu if not on an input
                  const target = e.target as HTMLElement;
                  if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
                    handleContextMenu(e, item);
                  }
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(item.id);
                  }}
                  className="flex-shrink-0 hover:bg-slate-200 rounded p-0.5"
                  title={isExpanded ? 'Collapse' : 'Expand'}
                  disabled={isEditing}
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />}
                {isEditing ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        saveEdit();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelEdit();
                      }
                    }}
                    onBlur={saveEdit}
                    onContextMenu={(e) => {
                      // Don't prevent default - let native menu show
                      e.stopPropagation();
                    }}
                    spellCheck={true}
                    className="flex-1 px-1 py-0.5 rounded border border-rose-brand bg-white text-slate-900 text-sm outline-none focus:ring-2 focus:ring-rose-light"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <button
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (onRename) startEditing(item);
                    }}
                    onClick={(e) => {
                      // Only select folder on left-click, not right-click
                      if (e.button === 0 || e.detail > 0) {
                        onSelectFolder?.(isFolderSelected ? null : item);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.stopPropagation();
                      handleContextMenu(e, item);
                    }}
                    className="flex items-center gap-2 flex-1 text-left"
                    title="Right-click to rename, double-click to rename, click to select"
                  >
                    <span className="truncate">{item.title}</span>
                  </button>
                )}
              </div>
              {onDelete && !isEditing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded border border-rose-error text-rose-error hover:bg-rose-error/10 transition-opacity"
                  title="Delete folder"
                >
                  <Trash2 size={12} />
                </button>
              )}
              {isExpanded && item.children && (
                <NoteTree
                  items={item.children}
                  selectedNote={selectedNote}
                  selectedFolder={selectedFolder}
                  onSelect={onSelect}
                  onSelectFolder={onSelectFolder}
                  onDelete={onDelete}
                  onRename={onRename}
                  level={level + 1}
                />
              )}
            </div>
          );
        }

        const isEditing = editingId === item.id;
        return (
          <div key={item.id} className="group relative">
            <div
              className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm hover:bg-slate-50 ${
                isSelected ? 'bg-rose-light text-rose-dark border border-rose-light' : 'text-gray-800'
              }`}
              style={{ paddingLeft: `${indentPx}px` }}
              onContextMenu={(e) => {
                // Only handle context menu if not on an input
                const target = e.target as HTMLElement;
                if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
                  handleContextMenu(e, item);
                }
              }}
            >
              <NotebookPen size={14} className="text-slate-400" />
              {isEditing ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      saveEdit();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      cancelEdit();
                    }
                  }}
                  onBlur={saveEdit}
                  onContextMenu={(e) => {
                    // Don't prevent default - let native menu show
                    e.stopPropagation();
                  }}
                  spellCheck={true}
                  className="flex-1 px-1 py-0.5 rounded border border-indigo-400 bg-white text-slate-900 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <button
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (onRename) startEditing(item);
                  }}
                  onClick={() => onSelect(item)}
                  onContextMenu={(e) => {
                    e.stopPropagation();
                    handleContextMenu(e, item);
                  }}
                  className="truncate flex-1 text-left"
                  title="Right-click to rename, double-click to rename"
                >
                  {item.title}
                </button>
              )}
            </div>
            {onDelete && !isEditing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-red-600 transition-opacity"
                title="Delete note"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        );
      })}
      </div>
    </>
  );
};

