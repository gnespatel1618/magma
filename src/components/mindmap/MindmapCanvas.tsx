import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MindmapNode } from './MindmapNode';
import { MindmapConnection } from './MindmapConnection';
import { MindmapControls } from './MindmapControls';
import { useCanvasTransform } from './hooks/useCanvasTransform';
import { useTreeLayout, type NoteMeta } from './hooks/useTreeLayout';

interface MindmapCanvasProps {
  notes: NoteMeta[];
  onNoteSelect?: (note: NoteMeta) => void;
  onNoteOpen?: (note: NoteMeta) => void;
}

export function MindmapCanvas({ notes, onNoteSelect, onNoteOpen }: MindmapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const { transform, handlers, zoomIn, zoomOut, resetTransform, fitToView } = useCanvasTransform();
  const { nodes, connections, bounds } = useTreeLayout(notes, collapsedNodes);

  // Track container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Handle fit to view
  const handleFitToView = useCallback(() => {
    if (bounds.width > 0 && bounds.height > 0) {
      fitToView(
        { width: bounds.width + 200, height: bounds.height + 200 },
        containerSize
      );
    }
  }, [bounds, containerSize, fitToView]);

  // Auto fit on initial load
  useEffect(() => {
    if (nodes.length > 0 && containerSize.width > 0) {
      const timer = setTimeout(handleFitToView, 100);
      return () => clearTimeout(timer);
    }
  }, [nodes.length > 0, containerSize.width > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNodeSelect = useCallback((id: string) => {
    setSelectedNodeId(id);
    const node = nodes.find(n => n.id === id);
    if (node && onNoteSelect) {
      onNoteSelect(node.data);
    }
  }, [nodes, onNoteSelect]);

  const handleNodeDoubleClick = useCallback((id: string) => {
    const node = nodes.find(n => n.id === id);
    if (node && onNoteOpen) {
      onNoteOpen(node.data);
    }
  }, [nodes, onNoteOpen]);

  const handleToggleCollapse = useCallback((id: string) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Get highlighted connections (connected to selected or hovered node)
  const getHighlightedConnections = useCallback(() => {
    const activeId = hoveredNodeId || selectedNodeId;
    if (!activeId) return new Set<string>();

    const highlighted = new Set<string>();
    connections.forEach(conn => {
      if (conn.sourceId === activeId || conn.targetId === activeId) {
        highlighted.add(conn.id);
      }
    });
    return highlighted;
  }, [connections, selectedNodeId, hoveredNodeId]);

  const highlightedConnections = getHighlightedConnections();

  // Handle click on empty canvas to deselect
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest('[data-mindmap-node]')) {
      setSelectedNodeId(null);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 rounded-xl"
      style={{ cursor: 'grab' }}
      {...handlers}
      onClick={handleCanvasClick}
    >
      {/* Dot Grid Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, #E2E8F0 1px, transparent 1px)`,
          backgroundSize: `${24 * transform.scale}px ${24 * transform.scale}px`,
          backgroundPosition: `${transform.x % (24 * transform.scale)}px ${transform.y % (24 * transform.scale)}px`,
        }}
      />

      {/* Decorative gradient orbs */}
      <div 
        className="absolute w-96 h-96 rounded-full opacity-30 pointer-events-none blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(225, 29, 72, 0.15) 0%, transparent 70%)',
          left: '10%',
          top: '10%',
        }}
      />
      <div 
        className="absolute w-80 h-80 rounded-full opacity-20 pointer-events-none blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)',
          right: '15%',
          bottom: '20%',
        }}
      />

      {/* Canvas Content */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0',
        }}
      >
        {/* SVG for connections */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
          style={{ minWidth: bounds.width + 400, minHeight: bounds.height + 400 }}
        >
          <defs>
            {/* Gradient for connections */}
            <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#94A3B8" />
              <stop offset="100%" stopColor="#CBD5E1" />
            </linearGradient>
            <linearGradient id="connectionGradientActive" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E11D48" />
              <stop offset="100%" stopColor="#FB7185" />
            </linearGradient>
          </defs>
          
          {connections.map((connection, index) => (
            <MindmapConnection
              key={connection.id}
              connection={connection}
              isHighlighted={highlightedConnections.has(connection.id)}
              animationDelay={index * 30}
            />
          ))}
        </svg>

        {/* Nodes */}
        {nodes.map((node, index) => (
          <MindmapNode
            key={node.id}
            node={node}
            isSelected={selectedNodeId === node.id}
            isHovered={hoveredNodeId === node.id}
            onSelect={handleNodeSelect}
            onDoubleClick={handleNodeDoubleClick}
            onToggleCollapse={handleToggleCollapse}
            onHover={setHoveredNodeId}
            style={{
              animation: `mindmap-node-enter 0.4s ease-out ${index * 40}ms both`,
            }}
          />
        ))}
      </div>

      {/* Controls */}
      <MindmapControls
        scale={transform.scale}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFitToView={handleFitToView}
        onReset={resetTransform}
      />

      {/* Empty state */}
      {notes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <p className="text-slate-500 font-medium">No notes to display</p>
            <p className="text-slate-400 text-sm">Create some notes to see them here</p>
          </div>
        </div>
      )}

      {/* Keyboard hint */}
      <div className="absolute bottom-4 left-4 text-xs text-slate-400 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-100">
        <span className="font-medium">Scroll</span> to zoom • <span className="font-medium">Drag</span> to pan • <span className="font-medium">Double-click</span> to open
      </div>
    </div>
  );
}

