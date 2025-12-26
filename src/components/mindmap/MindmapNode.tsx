import React, { memo } from 'react';
import { FileText, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import type { LayoutNode } from './hooks/useTreeLayout';

interface MindmapNodeProps {
  node: LayoutNode;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (id: string) => void;
  onDoubleClick: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onHover: (id: string | null) => void;
  style?: React.CSSProperties;
}

const nodeColors = {
  folder: {
    bg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
    border: 'border-blue-200',
    hoverBorder: 'hover:border-blue-300',
    selectedBorder: 'border-blue-500',
    icon: 'text-blue-500',
    shadow: 'shadow-blue-100/50',
  },
  file: {
    bg: 'bg-gradient-to-br from-white to-slate-50',
    border: 'border-slate-200',
    hoverBorder: 'hover:border-slate-300',
    selectedBorder: 'border-rose-500',
    icon: 'text-slate-400',
    shadow: 'shadow-slate-100/50',
  },
};

export const MindmapNode = memo(function MindmapNode({
  node,
  isSelected,
  isHovered,
  onSelect,
  onDoubleClick,
  onToggleCollapse,
  onHover,
  style,
}: MindmapNodeProps) {
  const isFolder = node.data.type === 'folder';
  const hasChildren = node.childrenIds.length > 0 || (node.data.children && node.data.children.length > 0);
  const colors = isFolder ? nodeColors.folder : nodeColors.file;
  
  // Truncate title
  const maxLength = 20;
  const displayTitle = node.data.title.length > maxLength 
    ? node.data.title.slice(0, maxLength) + '…' 
    : node.data.title;

  return (
    <div
      data-mindmap-node
      className={`
        absolute flex items-center gap-2 px-3 py-2 rounded-xl
        border-2 cursor-pointer select-none
        transition-all duration-200 ease-out
        ${colors.bg} ${isSelected ? colors.selectedBorder : colors.border}
        ${!isSelected && colors.hoverBorder}
        ${isHovered || isSelected ? 'shadow-lg scale-105' : 'shadow-md'}
        ${isSelected ? 'ring-2 ring-rose-500/20' : ''}
        hover:shadow-lg
      `}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        animationDelay: `${node.depth * 50}ms`,
        ...style,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick(node.id);
      }}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Collapse/Expand Button */}
      {hasChildren && (
        <button
          className={`
            flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center
            transition-colors duration-150
            ${isFolder ? 'bg-blue-100 hover:bg-blue-200 text-blue-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}
          `}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse(node.id);
          }}
        >
          {node.isCollapsed ? (
            <ChevronRight size={14} />
          ) : (
            <ChevronDown size={14} />
          )}
        </button>
      )}

      {/* Icon */}
      <div className={`flex-shrink-0 ${colors.icon}`}>
        {isFolder ? (
          node.isCollapsed ? <Folder size={16} /> : <FolderOpen size={16} />
        ) : (
          <FileText size={16} />
        )}
      </div>

      {/* Title */}
      <span className={`
        flex-1 text-sm font-medium truncate
        ${isFolder ? 'text-slate-700' : 'text-slate-600'}
      `}>
        {displayTitle}
      </span>

      {/* Children count badge */}
      {hasChildren && node.isCollapsed && node.data.children && (
        <span className={`
          flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full
          ${isFolder ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}
        `}>
          {node.data.children.length}
        </span>
      )}

      {/* Animated pulse ring on hover */}
      {isHovered && !isSelected && (
        <div className="absolute inset-0 rounded-xl border-2 border-slate-300 animate-pulse pointer-events-none" />
      )}
    </div>
  );
});

