import React from 'react';
import { KanbanSquare, NotebookPen } from 'lucide-react';

/**
 * Sidebar component for navigation and vault information.
 * 
 * @param vaultPath - The current vault path or null if no vault is selected
 * @param currentSection - The currently active section ('dashboard' or 'notes')
 * @param onOpenVault - Callback to open vault selection dialog
 * @param onSectionChange - Callback when navigation section changes
 */
export const Sidebar: React.FC<{
  vaultPath: string | null;
  currentSection: 'dashboard' | 'notes';
  onOpenVault: () => void;
  onSectionChange: (section: 'dashboard' | 'notes') => void;
}> = ({ vaultPath, currentSection, onOpenVault, onSectionChange }) => {
  return (
    <aside className="row-start-2 bg-white border-r border-slate-200 px-4 py-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">Vault</p>
          <p className="text-sm font-semibold text-slate-800 truncate max-w-[180px]">
            {vaultPath ?? 'No vault selected'}
          </p>
        </div>
        <button
          onClick={onOpenVault}
          className="text-xs font-semibold text-indigo-700 hover:text-indigo-800"
        >
          Change
        </button>
      </div>
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">Navigation</p>
        <div className="space-y-2">
          <SidebarItem
            icon={<KanbanSquare size={16} />}
            label="Dashboard"
            active={currentSection === 'dashboard'}
            onClick={() => onSectionChange('dashboard')}
          />
          <SidebarItem
            icon={<NotebookPen size={16} />}
            label="Notes"
            active={currentSection === 'notes'}
            onClick={() => onSectionChange('notes')}
          />
        </div>
      </div>
    </aside>
  );
};

/**
 * Individual sidebar navigation item component.
 * 
 * @param icon - React node for the icon
 * @param label - Display text for the item
 * @param active - Whether this item is currently selected
 * @param onClick - Callback when the item is clicked
 */
const SidebarItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}> = ({ icon, label, active = false, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
      active
        ? 'bg-indigo-500 text-white shadow-sm'
        : 'text-gray-800 hover:bg-slate-100'
    }`}
  >
    {icon} {label}
  </button>
);

