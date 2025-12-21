import React from 'react';
import { 
  KanbanSquare, 
  NotebookPen, 
  LayoutGrid, 
  Edit3, 
  Plus, 
  ArrowUpDown,
  ExternalLink,
  X,
  FileText,
  Layers,
  Calendar,
  Minus,
  HelpCircle,
  Settings,
  List
} from 'lucide-react';

/**
 * Extracts the folder name from a full path.
 * Works with both Unix (/) and Windows (\) path separators.
 */
const getFolderName = (path: string | null): string => {
  if (!path) return 'No vault selected';
  // Handle both Unix and Windows path separators
  const parts = path.split(/[/\\]/).filter(Boolean);
  return parts[parts.length - 1] || path;
};

/**
 * Sidebar component with Obsidian-style navigation.
 * Features icon-based top navigation and hierarchical note tree.
 */
export const Sidebar: React.FC<{
  vaultPath: string | null;
  currentSection: 'dashboard' | 'notes' | 'tasks' | 'settings';
  onOpenVault: () => void;
  onSectionChange: (section: 'dashboard' | 'notes' | 'tasks' | 'settings') => void;
  children?: React.ReactNode;
}> = ({ vaultPath, currentSection, onOpenVault, onSectionChange, children }) => {
  return (
    <aside className="row-start-2 col-start-1 bg-warm-gray border-r border-slate-200 flex flex-col h-full overflow-hidden">
      {/* Top Icon Navigation Bar (Obsidian-style) */}
      <div className="p-2 border-b border-slate-200 space-y-1">
        {/* First row of icons */}
        <div className="flex items-center gap-1">
          <IconButton 
            icon={<LayoutGrid size={16} />} 
            active={currentSection === 'dashboard'}
            onClick={() => onSectionChange('dashboard')}
            title="Dashboard"
          />
          <IconButton 
            icon={<Edit3 size={16} />} 
            active={currentSection === 'notes'}
            onClick={() => onSectionChange('notes')}
            title="Notes"
          />
          <IconButton 
            icon={<List size={16} />} 
            active={currentSection === 'tasks'}
            onClick={() => onSectionChange('tasks')}
            title="Tasks"
          />
          <IconButton 
            icon={<Plus size={16} />} 
            onClick={() => {}}
            title="New note"
          />
          <IconButton 
            icon={<ArrowUpDown size={16} />} 
            onClick={() => {}}
            title="Sort"
          />
          <IconButton 
            icon={<ExternalLink size={16} />} 
            onClick={() => {}}
            title="Open in external app"
          />
          <IconButton 
            icon={<X size={16} />} 
            onClick={() => {}}
            title="Close"
          />
        </div>
        {/* Second row of icons */}
        <div className="flex items-center gap-1">
          <IconButton 
            icon={<FileText size={16} />} 
            onClick={() => {}}
            title="Files"
          />
          <IconButton 
            icon={<Layers size={16} />} 
            onClick={() => {}}
            title="Graph view"
          />
          <IconButton 
            icon={<LayoutGrid size={16} />} 
            onClick={() => {}}
            title="Canvas"
          />
          <IconButton 
            icon={<Calendar size={16} />} 
            onClick={() => {}}
            title="Calendar"
          />
          <IconButton 
            icon={<Minus size={16} />} 
            onClick={() => {}}
            title="Minimize"
          />
        </div>
      </div>

      {/* Vault Info */}
      <div className="px-3 py-2 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 truncate">Vault</p>
            <p className="text-sm font-semibold text-slate-800 truncate" title={vaultPath ?? undefined}>
              {getFolderName(vaultPath)}
            </p>
          </div>
          <button
            onClick={onOpenVault}
            className="text-xs font-semibold text-rose-brand hover:text-rose-dark ml-2 flex-shrink-0"
          >
            Change
          </button>
        </div>
      </div>

      {/* Main Content Area - Note Tree will be rendered here by parent */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>

      {/* Bottom Bar (Obsidian-style) */}
      <div className="p-2 border-t border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-slate-600">
          <span className="truncate">{getFolderName(vaultPath)}</span>
        </div>
        <div className="flex items-center gap-1">
          <IconButton 
            icon={<HelpCircle size={14} />} 
            onClick={() => {}}
            title="Help"
          />
          <IconButton 
            icon={<Settings size={14} />} 
            active={currentSection === 'settings'}
            onClick={() => onSectionChange('settings')}
            title="Settings"
          />
        </div>
      </div>
    </aside>
  );
};

/**
 * Icon button component for the top navigation bar.
 */
const IconButton: React.FC<{
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  title: string;
}> = ({ icon, active = false, onClick, title }) => (
  <button
    onClick={onClick}
    className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
      active ? 'bg-rose-light text-rose-dark' : 'text-slate-700'
    }`}
    title={title}
  >
    {icon}
  </button>
);

