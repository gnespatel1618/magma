import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { 
  Trash2, 
  Plus, 
  Palette, 
  Save, 
  FileText, 
  X, 
  ChevronDown,
  Bold,
  Italic,
  Link2,
  MessageSquare,
  Copy,
  MinusCircle,
  Slash,
  Underline
} from 'lucide-react';

// Node and connection types for the freeform mind map
export interface MindMapNode {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  width: number;
  height: number;
  fontWeight?: 'normal' | '600' | '700';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  branchColor?: string;
  lineStyle?: 'solid' | 'dashed';
  collapsed?: boolean;
  commentCount?: number;
  href?: string;
}

export interface MindMapConnection {
  id: string;
  sourceId: string;
  targetId: string;
}

export interface MindMapData {
  nodes: MindMapNode[];
  connections: MindMapConnection[];
}

interface MindmapMeta {
  id: string;
  name: string;
  path: string;
  updatedAt: string;
}

// Beautiful color palette inspired by Whimsical
const NODE_COLORS = [
  { name: 'White', value: '#FFFFFF', border: '#E2E8F0' },
  { name: 'Rose', value: '#FFF1F2', border: '#FECDD3' },
  { name: 'Orange', value: '#FFF7ED', border: '#FED7AA' },
  { name: 'Yellow', value: '#FEFCE8', border: '#FEF08A' },
  { name: 'Green', value: '#F0FDF4', border: '#BBF7D0' },
  { name: 'Cyan', value: '#ECFEFF', border: '#A5F3FC' },
  { name: 'Blue', value: '#EFF6FF', border: '#BFDBFE' },
  { name: 'Purple', value: '#FAF5FF', border: '#E9D5FF' },
  { name: 'Pink', value: '#FDF2F8', border: '#FBCFE8' },
];

// Branch colors matching Whimsical's palette
const BRANCH_COLORS = [
  '#8B5CF6', // Purple
  '#3B82F6', // Blue
  '#06B6D4', // Teal/Cyan
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#EF4444', // Red
  '#A855F7', // Dark Purple
  '#0EA5E9', // Light Blue
  '#059669', // Dark Green
  '#92400E', // Brown
];

interface MindMapEditorProps {
  vaultPath: string | null;
  onMindmapChange?: (mindmapId: string | null, mindmapName: string) => void;
  initialMindmapId?: string | null;
}

export function MindMapEditor({ vaultPath, onMindmapChange, initialMindmapId }: MindMapEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [connections, setConnections] = useState<MindMapConnection[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Interaction state
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragFrameRef = useRef<number | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Transform state (pan and zoom)
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  
  // File management state
  const [currentMindmapId, setCurrentMindmapId] = useState<string | null>(null);
  const [currentMindmapName, setCurrentMindmapName] = useState<string>('Untitled');
  const [savedMindmaps, setSavedMindmaps] = useState<MindmapMeta[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  
  // Refs to access current values in effects without causing re-renders
  const currentMindmapIdRef = useRef<string | null>(null);
  const hasUnsavedChangesRef = useRef(false);
  const nodesRef = useRef<MindMapNode[]>([]);
  
  // Keep refs in sync
  useEffect(() => {
    currentMindmapIdRef.current = currentMindmapId;
  }, [currentMindmapId]);
  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Load list of saved mindmaps
  const loadMindmapsList = useCallback(async () => {
    if (!vaultPath) return;
    const result = await window.appBridge?.listMindmaps?.(vaultPath);
    if (result?.ok) {
      setSavedMindmaps(result.mindmaps);
    }
  }, [vaultPath]);

  useEffect(() => {
    loadMindmapsList();
  }, [loadMindmapsList]);

  // Track previous initialMindmapId to detect when it changes to null
  const prevInitialMindmapIdRef = useRef<string | null | undefined>(initialMindmapId);
  const isLoadingRef = useRef(false);
  
  // Load mindmap when initialMindmapId changes (from sidebar selection)
  useEffect(() => {
    if (!vaultPath) return;
    
    const prevId = prevInitialMindmapIdRef.current;
    
    // Only process if initialMindmapId actually changed
    if (prevId === initialMindmapId) return;
    
    // Prevent concurrent loads
    if (isLoadingRef.current) return;
    
    prevInitialMindmapIdRef.current = initialMindmapId;
    
    if (initialMindmapId) {
      // Load the mindmap only if it's different from current
      if (initialMindmapId === currentMindmapIdRef.current) return;
      
      isLoadingRef.current = true;
      (async () => {
        try {
          const result = await window.appBridge?.loadMindmap?.(vaultPath, initialMindmapId);
          if (result?.ok && result.data) {
            const data = result.data as MindMapData;
            setNodes(data.nodes || []);
            setConnections(data.connections || []);
            setCurrentMindmapId(initialMindmapId);
            // Get the name
            const listResult = await window.appBridge?.listMindmaps?.(vaultPath);
            if (listResult?.ok) {
              const mindmap = listResult.mindmaps.find(m => m.id === initialMindmapId);
              setCurrentMindmapName(mindmap?.name || initialMindmapId);
              setSavedMindmaps(listResult.mindmaps);
            } else {
              setCurrentMindmapName(initialMindmapId);
            }
            setHasUnsavedChanges(false);
          }
        } finally {
          isLoadingRef.current = false;
        }
      })();
    } else if (initialMindmapId === null && prevId !== null && prevId !== undefined) {
      // Clear if initialMindmapId changed from a value to null (user clicked "New")
      const currentId = currentMindmapIdRef.current;
      const currentNodes = nodesRef.current;
      const hasChanges = hasUnsavedChangesRef.current;
      
      // Check if we actually need to clear
      if (currentId === null && currentNodes.length === 0) return;
      
      // Check for unsaved changes
      if (hasChanges) {
        if (!confirm('You have unsaved changes. Continue without saving?')) {
          // Revert the change
          prevInitialMindmapIdRef.current = prevId;
          return;
        }
      }
      
      // Clear everything
      setNodes([]);
      setConnections([]);
      setCurrentMindmapId(null);
      setCurrentMindmapName('Untitled');
      setHasUnsavedChanges(false);
      setTransform({ x: 0, y: 0, scale: 1 });
    }
  }, [initialMindmapId, vaultPath]);
  
  // Notify parent of mindmap changes (only when it actually changes, not during loads)
  const prevNotifiedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (currentMindmapId !== prevNotifiedIdRef.current && !isLoadingRef.current) {
      prevNotifiedIdRef.current = currentMindmapId;
      onMindmapChange?.(currentMindmapId, currentMindmapName);
    }
  }, [currentMindmapId, currentMindmapName, onMindmapChange]);

  // Generate unique ID
  const generateId = () => `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (screenX - rect.left - transform.x) / transform.scale,
      y: (screenY - rect.top - transform.y) / transform.scale,
    };
  }, [transform]);

  // Pick a branch color that matches Whimsical's per-branch palette:
  // - Root children get distinct colors based on their sibling index
  // - Deeper descendants inherit their parent's branch color
  const pickBranchColor = useCallback((parentId: string | null, existingConnections: MindMapConnection[] = connections) => {
    if (!parentId) return BRANCH_COLORS[0];

    const parentNode = nodes.find(n => n.id === parentId);
    if (!parentNode) return BRANCH_COLORS[0];

    // Check if parent has a parent (i.e., is it a root node?)
    const parentHasParent = existingConnections.some(c => c.targetId === parentId);

    // If parent is a root node, assign distinct colors to its children
    if (!parentHasParent) {
      // Count existing siblings (children of this parent) to determine color index
      const siblingCount = existingConnections.filter(c => c.sourceId === parentId).length;
      return BRANCH_COLORS[siblingCount % BRANCH_COLORS.length];
    }

    // If parent is not root, inherit parent's branch color to keep branch consistent
    if (parentNode.branchColor) {
      return parentNode.branchColor;
    }

    // Fallback: if parent doesn't have a branch color, assign one based on its position
    return BRANCH_COLORS[0];
  }, [connections, nodes]);

  // Create a new node
  const createNode = useCallback((screenX?: number, screenY?: number) => {
    let x: number, y: number;
    
    if (screenX !== undefined && screenY !== undefined) {
      const canvasPos = screenToCanvas(screenX, screenY);
      x = canvasPos.x - 80;
      y = canvasPos.y - 24;
    } else {
      // Center of viewport
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const center = screenToCanvas(rect.left + rect.width / 2, rect.top + rect.height / 2);
        x = center.x - 80;
        y = center.y - 24;
      } else {
        x = 100;
        y = 100;
      }
    }
    
    const newNode: MindMapNode = {
      id: generateId(),
      x,
      y,
      text: 'New idea',
      color: '#FFFFFF',
      branchColor: pickBranchColor(null),
      lineStyle: 'solid',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      collapsed: false,
      commentCount: 0,
      width: 200,
      height: 56,
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    setEditingNodeId(newNode.id);
    setHasUnsavedChanges(true);
  }, [screenToCanvas, pickBranchColor]);

  // Handle canvas double-click to create node
  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-mindmap-node]') || target.closest('[data-toolbar]') || target.closest('[data-dialog]')) {
      return;
    }
    createNode(e.clientX, e.clientY);
  }, [createNode]);

  // Handle canvas mouse down (for panning)
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Don't start panning if clicking on node, toolbar, or dialog
    if (target.closest('[data-mindmap-node]') || target.closest('[data-toolbar]') || target.closest('[data-dialog]')) {
      return;
    }
    
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  }, [transform]);

  // Create a child node connected to the parent (Whimsical-style) - to the right
  const createChildNode = useCallback((parentNodeId: string) => {
    const parentNode = nodes.find(n => n.id === parentNodeId);
    if (!parentNode) return;
    
    // Use functional update to get the latest connections state
    setConnections(prevConnections => {
      // Calculate branch color using the LATEST connections state
      // This ensures we count existing siblings correctly
      const branchColor = pickBranchColor(parentNodeId, prevConnections);
      
      // Create new node to the right of parent
      const newNode: MindMapNode = {
        id: generateId(),
        x: parentNode.x + parentNode.width + 200, // 200px to the right
        y: parentNode.y, // Same vertical position
        text: 'New idea',
        color: '#FFFFFF',
        branchColor: branchColor,
        lineStyle: parentNode.lineStyle || 'solid',
        fontWeight: parentNode.fontWeight || 'normal',
        fontStyle: parentNode.fontStyle || 'normal',
        textDecoration: parentNode.textDecoration || 'none',
        collapsed: false,
        commentCount: 0,
        width: 200,
        height: 56,
      };
      
      // Create connection automatically
      const newConnection: MindMapConnection = {
        id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sourceId: parentNodeId,
        targetId: newNode.id,
      };
      
      setNodes(prev => [...prev, newNode]);
      setSelectedNodeId(newNode.id);
      setEditingNodeId(newNode.id);
      setHasUnsavedChanges(true);
      
      return [...prevConnections, newConnection];
    });
  }, [nodes, pickBranchColor]);

  // Create a sibling node below the parent (Whimsical-style)
  const createSiblingNode = useCallback((nodeId: string) => {
    // Find the current node
    const currentNode = nodes.find(n => n.id === nodeId);
    if (!currentNode) return;
    
    // Use functional update to get the latest connections state
    setConnections(prevConnections => {
      // Find the parent of this node (if it exists) using latest connections
      const parentConnection = prevConnections.find(c => c.targetId === nodeId);
      const parentNode = parentConnection ? nodes.find(n => n.id === parentConnection.sourceId) : null;
      
      if (!parentNode) {
        // If no parent, create as a child of the current node instead
        createChildNode(nodeId);
        return prevConnections;
      }
      // Find all siblings using the latest connections
      const siblings = prevConnections
        .filter(c => c.sourceId === parentNode.id)
        .map(c => nodes.find(n => n.id === c.targetId))
        .filter(n => n !== undefined && n.id !== nodeId) as MindMapNode[];
      
      // Calculate Y position - place below the lowest sibling or below current node
      const allSiblingNodes = [...siblings, currentNode];
      const lowestY = Math.max(...allSiblingNodes.map(n => n.y + n.height));
      
      // Calculate branch color using the LATEST connections state
      const branchColor = pickBranchColor(parentNode.id, prevConnections);
      
      // Create new node below siblings, connected to the same parent
      const newNode: MindMapNode = {
        id: generateId(),
        x: parentNode.x + parentNode.width + 200, // Same X as siblings
        y: lowestY + 60, // Below the lowest sibling
        text: 'New idea',
        color: '#FFFFFF',
        branchColor: branchColor,
        lineStyle: parentNode.lineStyle || 'solid',
        fontWeight: parentNode.fontWeight || 'normal',
        fontStyle: parentNode.fontStyle || 'normal',
        textDecoration: parentNode.textDecoration || 'none',
        collapsed: false,
        commentCount: 0,
        width: 200,
        height: 56,
      };
      
      // Create connection to parent
      const newConnection: MindMapConnection = {
        id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sourceId: parentNode.id,
        targetId: newNode.id,
      };
      
      setNodes(prev => [...prev, newNode]);
      setSelectedNodeId(newNode.id);
      setEditingNodeId(newNode.id);
      setHasUnsavedChanges(true);
      
      return [...prevConnections, newConnection];
    });
  }, [nodes, createChildNode, pickBranchColor]);

  // Handle node click - for selection only
  const handleNodeClick = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    
    // Don't handle if clicking on a connection button
    const target = e.target as HTMLElement;
    if (target.closest('[data-add-child-button]') || target.closest('[data-add-sibling-button]')) {
      return;
    }
    
    setSelectedNodeId(nodeId);
  }, []);

  // Handle node mouse down (for dragging)
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    
    // Don't start dragging if clicking on add button
    const target = e.target as HTMLElement;
    if (target.closest('[data-add-child-button]') || target.closest('[data-add-sibling-button]')) {
      return;
    }
    
    // Start dragging the node
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    setSelectedNodeId(nodeId);
    setIsDraggingNode(true);
    setDraggingNodeId(nodeId);
    
    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    setDragOffset({
      x: canvasPos.x - node.x,
      y: canvasPos.y - node.y,
    });
  }, [nodes, screenToCanvas]);

  // Handle global mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    
    if (isDraggingNode && draggingNodeId) {
      if (dragFrameRef.current) return;
      dragFrameRef.current = requestAnimationFrame(() => {
        setNodes(prev => prev.map(node => 
          node.id === draggingNodeId
            ? { ...node, x: canvasPos.x - dragOffset.x, y: canvasPos.y - dragOffset.y }
            : node
        ));
        dragFrameRef.current = null;
      });
    } else if (isPanning) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      }));
    }
  }, [isDraggingNode, draggingNodeId, dragOffset, isPanning, panStart, screenToCanvas]);

  // Handle global mouse up
  const handleMouseUp = useCallback(() => {
    setIsDraggingNode(false);
    setDraggingNodeId(null);
    setIsPanning(false);
    setHasUnsavedChanges(true);
  }, []);

  // Handle wheel for zooming
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const delta = -e.deltaY * 0.001;
    const newScale = Math.min(2, Math.max(0.25, transform.scale * (1 + delta)));
    
    // Zoom towards mouse position
    const scaleRatio = newScale / transform.scale;
    const newX = mouseX - (mouseX - transform.x) * scaleRatio;
    const newY = mouseY - (mouseY - transform.y) * scaleRatio;
    
    setTransform({ x: newX, y: newY, scale: newScale });
  }, [transform]);

  // Update node text
  const updateNodeText = useCallback((nodeId: string, text: string) => {
    setNodes(prev => prev.map(node =>
      node.id === nodeId ? { ...node, text } : node
    ));
    setHasUnsavedChanges(true);
  }, []);

  // Update node color
  const updateNodeColor = useCallback((nodeId: string, color: string) => {
    setNodes(prev => prev.map(node =>
      node.id === nodeId ? { ...node, color } : node
    ));
    setHasUnsavedChanges(true);
    setShowColorPicker(false);
  }, []);

  // Delete selected node
  const deleteSelectedNode = useCallback(() => {
    if (!selectedNodeId) return;
    setNodes(prev => prev.filter(n => n.id !== selectedNodeId));
    setConnections(prev => prev.filter(c => 
      c.sourceId !== selectedNodeId && c.targetId !== selectedNodeId
    ));
    setSelectedNodeId(null);
    setHasUnsavedChanges(true);
  }, [selectedNodeId]);

  // Toggle bold / italic / underline styles
  const toggleBold = useCallback((nodeId: string) => {
    setNodes(prev => prev.map(node =>
      node.id === nodeId
        ? { ...node, fontWeight: (node.fontWeight === '700' || node.fontWeight === '600') ? 'normal' : '700' }
        : node
    ));
    setHasUnsavedChanges(true);
  }, []);

  const toggleItalic = useCallback((nodeId: string) => {
    setNodes(prev => prev.map(node =>
      node.id === nodeId
        ? { ...node, fontStyle: node.fontStyle === 'italic' ? 'normal' : 'italic' }
        : node
    ));
    setHasUnsavedChanges(true);
  }, []);

  const toggleUnderline = useCallback((nodeId: string) => {
    setNodes(prev => prev.map(node =>
      node.id === nodeId
        ? { ...node, textDecoration: node.textDecoration === 'underline' ? 'none' : 'underline' }
        : node
    ));
    setHasUnsavedChanges(true);
  }, []);

  const toggleLineStyle = useCallback((nodeId: string) => {
    setNodes(prev => prev.map(node =>
      node.id === nodeId
        ? { ...node, lineStyle: node.lineStyle === 'dashed' ? 'solid' : 'dashed' }
        : node
    ));
    setHasUnsavedChanges(true);
  }, []);

  const toggleCollapse = useCallback((nodeId: string) => {
    setNodes(prev => prev.map(node =>
      node.id === nodeId
        ? { ...node, collapsed: !node.collapsed }
        : node
    ));
    setHasUnsavedChanges(true);
  }, []);

  const duplicateNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const parentConn = connections.find(c => c.targetId === nodeId);
    const newId = generateId();

    const clone: MindMapNode = {
      ...node,
      id: newId,
      x: node.x + 32,
      y: node.y + 32,
      text: `${node.text} (copy)`,
      collapsed: false,
      commentCount: 0,
    };

    const newConn = parentConn
      ? {
          id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          sourceId: parentConn.sourceId,
          targetId: newId,
        }
      : null;

    setNodes(prev => [...prev, clone]);
    if (newConn) {
      setConnections(prev => [...prev, newConn]);
    }
    setSelectedNodeId(newId);
    setEditingNodeId(null);
    setHasUnsavedChanges(true);
  }, [nodes, connections]);

  const setNodeLink = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const next = window.prompt('Set link (leave empty to clear)', node.href || '');
    if (next === null) return;
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, href: next.trim() || undefined } : n));
    setHasUnsavedChanges(true);
  }, [nodes]);

  const addCommentPlaceholder = useCallback((nodeId: string) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, commentCount: (n.commentCount || 0) + 1 } : n));
    setHasUnsavedChanges(true);
  }, []);

  const updateBranchColor = useCallback((nodeId: string, color: string) => {
    setNodes(prev => prev.map(node =>
      node.id === nodeId ? { ...node, branchColor: color } : node
    ));
    setHasUnsavedChanges(true);
  }, []);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingNodeId) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        e.preventDefault();
        deleteSelectedNode();
      }
      if (e.key === 'Escape') {
        setSelectedNodeId(null);
        setEditingNodeId(null);
        setShowColorPicker(false);
        setShowSaveDialog(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingNodeId, selectedNodeId, deleteSelectedNode]);

  // Save mind map
  const handleSave = useCallback(async () => {
    if (!vaultPath) {
      alert('Please open a vault first');
      return;
    }
    
    if (!currentMindmapId) {
      setSaveAsName(currentMindmapName);
      setShowSaveDialog(true);
      return;
    }
    
    const data: MindMapData = { nodes, connections };
    const result = await window.appBridge?.saveMindmap?.(vaultPath, currentMindmapId, data);
    
    if (result?.ok) {
      setHasUnsavedChanges(false);
      loadMindmapsList();
    } else {
      alert(result?.message || 'Failed to save');
    }
  }, [vaultPath, currentMindmapId, currentMindmapName, nodes, connections, loadMindmapsList]);

  // Save as new mind map
  const handleSaveAs = useCallback(async () => {
    if (!vaultPath || !saveAsName.trim()) return;
    
    const data: MindMapData = { nodes, connections };
    const result = await window.appBridge?.saveMindmap?.(vaultPath, saveAsName.trim(), data);
    
    if (result?.ok && result.id) {
      setCurrentMindmapId(result.id);
      setCurrentMindmapName(saveAsName.trim());
      setHasUnsavedChanges(false);
      setShowSaveDialog(false);
      loadMindmapsList();
    } else {
      alert(result?.message || 'Failed to save');
    }
  }, [vaultPath, saveAsName, nodes, connections, loadMindmapsList]);

  // Load a mind map
  const handleLoad = useCallback(async (mindmap: MindmapMeta) => {
    if (!vaultPath) return;
    
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Continue without saving?')) {
        return;
      }
    }
    
    const result = await window.appBridge?.loadMindmap?.(vaultPath, mindmap.id);
    
    if (result?.ok && result.data) {
      const data = result.data as MindMapData;
      setNodes(data.nodes || []);
      setConnections(data.connections || []);
      setCurrentMindmapId(mindmap.id);
      setCurrentMindmapName(mindmap.name);
      setHasUnsavedChanges(false);
    } else {
      alert(result?.message || 'Failed to load');
    }
  }, [vaultPath, hasUnsavedChanges]);

  // Create new mind map
  const handleNew = useCallback(() => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Continue without saving?')) {
        return;
      }
    }
    
    setNodes([]);
    setConnections([]);
    setNodes([]);
    setConnections([]);
    setCurrentMindmapId(null);
    setCurrentMindmapName('Untitled');
    setHasUnsavedChanges(false);
    setTransform({ x: 0, y: 0, scale: 1 });
  }, [hasUnsavedChanges]);

  // Delete a mind map
  const handleDeleteMindmap = useCallback(async (mindmap: MindmapMeta, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!vaultPath) return;
    
    if (!confirm(`Delete "${mindmap.name}"? This cannot be undone.`)) {
      return;
    }
    
    const result = await window.appBridge?.deleteMindmap?.(vaultPath, mindmap.id);
    
    if (result?.ok) {
      loadMindmapsList();
      if (currentMindmapId === mindmap.id) {
        handleNew();
      }
    } else {
      alert(result?.message || 'Failed to delete');
    }
  }, [vaultPath, currentMindmapId, handleNew, loadMindmapsList]);

  // Click on canvas to deselect
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('[data-mindmap-node]') && 
        !target.closest('[data-toolbar]') &&
        !target.closest('[data-dialog]') &&
        !target.closest('[data-add-child-button]') &&
        !target.closest('[data-add-sibling-button]')) {
      setSelectedNodeId(null);
      setEditingNodeId(null);
      setShowColorPicker(false);
    }
  }, []);

  // Map helpers for depth and visibility (collapse)
  const nodeMap = useMemo(() => {
    const map = new Map<string, MindMapNode>();
    nodes.forEach(n => map.set(n.id, n));
    return map;
  }, [nodes]);

  const depthMap = useMemo(() => {
    const depth = new Map<string, number>();
    const childrenByParent = new Map<string, string[]>();
    const incoming = new Map<string, number>();

    connections.forEach(c => {
      if (!childrenByParent.has(c.sourceId)) childrenByParent.set(c.sourceId, []);
      childrenByParent.get(c.sourceId)!.push(c.targetId);
      incoming.set(c.targetId, (incoming.get(c.targetId) || 0) + 1);
    });

    const roots = nodes.filter(n => !incoming.has(n.id));
    const queue: Array<{ id: string; d: number }> = roots.map(r => ({ id: r.id, d: 0 }));

    // Include isolated nodes as roots too
    nodes.forEach(n => {
      if (!depth.has(n.id) && !incoming.has(n.id)) {
        depth.set(n.id, 0);
      }
    });

    while (queue.length) {
      const current = queue.shift()!;
      if (depth.has(current.id) && (depth.get(current.id) as number) <= current.d) continue;
      depth.set(current.id, current.d);
      const kids = childrenByParent.get(current.id) || [];
      kids.forEach(childId => {
        queue.push({ id: childId, d: current.d + 1 });
      });
    }
    return depth;
  }, [nodes, connections]);

  const visibility = useMemo(() => {
    const visible = new Set<string>();
    const childrenByParent = new Map<string, string[]>();
    const incoming = new Map<string, number>();

    connections.forEach(c => {
      if (!childrenByParent.has(c.sourceId)) childrenByParent.set(c.sourceId, []);
      childrenByParent.get(c.sourceId)!.push(c.targetId);
      incoming.set(c.targetId, (incoming.get(c.targetId) || 0) + 1);
    });

    const roots = nodes.filter(n => !incoming.has(n.id));
    const queue: Array<{ id: string; blocked: boolean }> = [
      ...roots.map(r => ({ id: r.id, blocked: false })),
      // Ensure disconnected nodes still show
      ...nodes.filter(n => incoming.size === 0 && connections.length === 0).map(n => ({ id: n.id, blocked: false }))
    ];

    while (queue.length) {
      const current = queue.shift()!;
      if (current.blocked) continue;
      visible.add(current.id);
      const node = nodeMap.get(current.id);
      const collapsed = node?.collapsed;
      const children = childrenByParent.get(current.id) || [];
      children.forEach(childId => queue.push({ id: childId, blocked: Boolean(collapsed) }));
    }

    // Include any isolated nodes not reached
    nodes.forEach(n => {
      if (!visible.has(n.id) && !incoming.has(n.id)) visible.add(n.id);
    });

    if (visible.size === 0 && nodes.length > 0) {
      nodes.forEach(n => visible.add(n.id));
    }

    return { visibleNodes: visible };
  }, [nodes, connections, nodeMap]);

  const visibleNodes = visibility.visibleNodes;
  const filteredNodes = useMemo(() => nodes.filter(n => visibleNodes.has(n.id)), [nodes, visibleNodes]);
  const filteredConnections = useMemo(
    () => connections.filter(c => visibleNodes.has(c.sourceId) && visibleNodes.has(c.targetId)),
    [connections, visibleNodes]
  );

  // Get connection path (bezier curve) - Whimsical style
  // Connections go from RIGHT edge of parent to LEFT edge of child
  const getConnectionPath = (source: MindMapNode, target: MindMapNode) => {
    // Calculate connection points from node edges (not centers)
    // Source: right edge, vertical center
    const sx = source.x + source.width;
    const sy = source.y + source.height / 2;
    
    // Target: left edge, vertical center
    const tx = target.x;
    const ty = target.y + target.height / 2;
    
    // Calculate distance for bezier control points
    const dx = tx - sx;
    const dy = ty - sy;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Use smooth bezier curve with control points
    // Control points create a smooth horizontal curve (Whimsical style)
    const controlOffset = Math.min(120, Math.max(40, Math.abs(dx) * 0.4));
    
    // Whimsical uses smooth horizontal curves
    // The curve starts from right edge of source and ends at left edge of target
    const path = `M ${sx} ${sy} C ${sx + controlOffset} ${sy}, ${tx - controlOffset} ${ty}, ${tx} ${ty}`;
    return path;
  };

  // Zoom controls
  const zoomIn = () => setTransform(prev => ({ ...prev, scale: Math.min(2, prev.scale * 1.25) }));
  const zoomOut = () => setTransform(prev => ({ ...prev, scale: Math.max(0.25, prev.scale * 0.8) }));
  const resetView = () => setTransform({ x: 0, y: 0, scale: 1 });

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  // Cursor style
  const getCursor = () => {
    if (isDraggingNode) return 'grabbing';
    if (isPanning) return 'grabbing';
    return 'grab';
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden">

      {/* Toolbar - Whimsical style */}
      <div 
        data-toolbar
          className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-[#2D2D2D] backdrop-blur-sm rounded-lg shadow-lg px-2 py-1"
      >

        {/* Toolbar buttons - Whimsical style dark toolbar */}
        <button
          onClick={() => createNode()}
          className="p-2 rounded hover:bg-white/10 text-white transition-colors"
          title="Add Node"
        >
          <Plus size={18} />
        </button>

        {selectedNode && (
          <>
            <div className="w-px h-6 bg-white/20 mx-1" />
            
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-2 rounded hover:bg-white/10 text-white transition-colors"
                title="Change color"
              >
                <Palette size={18} />
              </button>
              
              {showColorPicker && (
                <div className="absolute top-full left-0 mt-2 p-2 bg-white rounded-xl shadow-lg border border-slate-200 grid grid-cols-3 gap-1 z-20">
                  {NODE_COLORS.map(color => (
                    <button
                      key={color.value}
                      onClick={() => updateNodeColor(selectedNodeId!, color.value)}
                      className="w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110"
                      style={{ backgroundColor: color.value, borderColor: color.border }}
                      title={color.name}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 pl-2">
              <button
                onClick={() => toggleBold(selectedNode.id)}
                className="p-2 rounded hover:bg-white/10 text-white transition-colors"
                title="Bold"
              >
                <Bold size={18} />
              </button>
              <button
                onClick={() => toggleItalic(selectedNode.id)}
                className="p-2 rounded hover:bg-white/10 text-white transition-colors"
                title="Italic"
              >
                <Italic size={18} />
              </button>
              <button
                onClick={() => toggleUnderline(selectedNode.id)}
                className="p-2 rounded hover:bg-white/10 text-white transition-colors"
                title="Underline"
              >
                <Underline size={18} />
              </button>
              <button
                onClick={() => toggleLineStyle(selectedNode.id)}
                className="p-2 rounded hover:bg-white/10 text-white transition-colors"
                title="Solid / dashed branch"
              >
                <Slash size={18} />
              </button>
              <button
                onClick={() => toggleCollapse(selectedNode.id)}
                className="p-2 rounded hover:bg-white/10 text-white transition-colors"
                title={selectedNode.collapsed ? 'Expand children' : 'Collapse children'}
              >
                <MinusCircle size={18} />
              </button>
              <button
                onClick={() => duplicateNode(selectedNode.id)}
                className="p-2 rounded hover:bg-white/10 text-white transition-colors"
                title="Duplicate node"
              >
                <Copy size={18} />
              </button>
              <button
                onClick={() => setNodeLink(selectedNode.id)}
                className="p-2 rounded hover:bg-white/10 text-white transition-colors"
                title="Set link"
              >
                <Link2 size={18} />
              </button>
              <button
                onClick={() => addCommentPlaceholder(selectedNode.id)}
                className="p-2 rounded hover:bg-white/10 text-white transition-colors"
                title="Add comment marker"
              >
                <MessageSquare size={18} />
              </button>
            </div>

            <button
              onClick={deleteSelectedNode}
              className="p-2 rounded hover:bg-white/10 text-white transition-colors"
              title="Delete node (Del)"
            >
              <Trash2 size={18} />
            </button>
          </>
        )}

        <div className="w-px h-6 bg-white/20 mx-1" />

        <button
          onClick={handleSave}
          disabled={!vaultPath}
          className={`p-2 rounded transition-colors ${
            !vaultPath 
              ? 'text-white/40 cursor-not-allowed'
              : hasUnsavedChanges 
                ? 'text-amber-400 hover:bg-white/10' 
                : 'text-white hover:bg-white/10'
          }`}
          title={!vaultPath ? 'Open a vault to save' : 'Save (Ctrl+S)'}
        >
          <Save size={18} />
        </button>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div data-dialog className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 w-80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Save Mind Map</h3>
              <button
                onClick={() => setShowSaveDialog(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>
            <input
              type="text"
              value={saveAsName}
              onChange={(e) => setSaveAsName(e.target.value)}
              placeholder="Mind map name..."
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveAs();
                e.stopPropagation();
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAs}
                disabled={!saveAsName.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 p-1">
        <button
          onClick={zoomOut}
          className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
        >
          −
        </button>
        <span className="px-2 text-sm text-slate-500 min-w-[50px] text-center">
          {Math.round(transform.scale * 100)}%
        </span>
        <button
          onClick={zoomIn}
          className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
        >
          +
        </button>
        <button
          onClick={resetView}
          className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
        >
          Reset
        </button>
      </div>

      {/* Canvas - Whimsical style background */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden bg-[#F8F9FA]"
        style={{ cursor: getCursor() }}
        onDoubleClick={handleCanvasDoubleClick}
        onClick={handleCanvasClick}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Dot Grid Background - Whimsical style */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, #E2E8F0 1px, transparent 1px)`,
            backgroundSize: `${24 * transform.scale}px ${24 * transform.scale}px`,
            backgroundPosition: `${transform.x % (24 * transform.scale)}px ${transform.y % (24 * transform.scale)}px`,
          }}
        />


        {/* SVG for connections - render before transform so it's behind nodes */}
        <div
          className="absolute pointer-events-none"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
            zIndex: 0,
            left: 0,
            top: 0
          }}
        >
          <svg 
            className="absolute" 
            style={{ 
              left: 0,
              top: 0,
              width: '50000px',
              height: '50000px',
              overflow: 'visible'
            }}
          >
            {/* Existing connections */}
            {filteredConnections.map(conn => {
              const source = nodeMap.get(conn.sourceId);
              const target = nodeMap.get(conn.targetId);
              if (!source || !target) {
                return null;
              }

              // Check if this is a direct child connection (parent to child)
              const isHighlighted = selectedNodeId === conn.sourceId || selectedNodeId === conn.targetId;

              // Calculate path coordinates - these match the node coordinates exactly
              const path = getConnectionPath(source, target);

              // Use the child node's branchColor (which is set when the node is created)
              // This ensures each branch has its own distinct color
              // The child node's branchColor represents the color of this entire branch
              const strokeColor = target.branchColor || '#8B5CF6';
              const strokeDash = source.lineStyle === 'dashed' ? '10 8' : undefined;

              return (
                <path
                  key={conn.id}
                  d={path}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isHighlighted ? 2.5 : 2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={strokeDash}
                  opacity={isHighlighted ? 1 : 0.8}
                />
              );
            })}

          </svg>
        </div>

        {/* Transform container for nodes */}
        <div
          className="absolute"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
          }}
        >

          {/* Nodes */}
          {filteredNodes.map(node => {
            const colorConfig = NODE_COLORS.find(c => c.value === node.color) || NODE_COLORS[0];
            const isSelected = selectedNodeId === node.id;
            const isEditing = editingNodeId === node.id;
            const isDragging = draggingNodeId === node.id;
            const nodeDepth = depthMap.get(node.id) ?? 0;

            return (
              <div
                key={node.id}
                data-mindmap-node
                data-node-id={node.id}
                className={`
                  absolute flex items-center justify-center group
                  rounded-2xl select-none bg-white
                  transition-all duration-150
                  ${isSelected ? 'border-2 border-[#8B5CF6] shadow-md' : nodeDepth === 0 ? 'border border-slate-200 shadow-sm' : 'shadow-sm'}
                  ${isDragging ? 'shadow-md' : ''}
                `}
                style={{
                  left: node.x,
                  top: node.y,
                  width: node.width,
                  minHeight: node.height,
                  backgroundColor: node.color,
                  borderColor: isSelected ? '#8B5CF6' : (nodeDepth === 0 ? colorConfig.border : 'transparent'),
                  borderWidth: isSelected ? '2px' : (nodeDepth === 0 ? '1px' : '0px'),
                  cursor: isDragging ? 'grabbing' : 'grab',
                  pointerEvents: 'auto',
                  zIndex: isDragging ? 20 : isSelected ? 10 : 5,
                }}
                onClick={(e) => handleNodeClick(e, node.id)}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingNodeId(node.id);
                }}
              >
                {/* Collapse toggle */}
                <button
                  className="absolute -left-5 top-1/2 -translate-y-1/2 w-7 h-7 bg-white border border-slate-200 rounded-full shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50"
                  title={node.collapsed ? 'Expand children' : 'Collapse children'}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    toggleCollapse(node.id);
                  }}
                  style={{ pointerEvents: 'auto' }}
                >
                  <span className="text-sm leading-none">{node.collapsed ? '+' : '−'}</span>
                </button>

                {/* Add child button */}
                <button
                  data-add-child-button
                className="absolute -right-4 top-1/2 -translate-y-1/2 w-6 h-6 
                    bg-[#8B5CF6] hover:bg-[#7C3AED] active:bg-[#6D28D9]
                    rounded-full cursor-pointer transition-all shadow-sm z-30
                    flex items-center justify-center text-white opacity-0 group-hover:opacity-100"
                  style={{ pointerEvents: 'auto' }}
                  title="Add child node"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    createChildNode(node.id);
                  }}
                >
                  <div className="w-2 h-0.5 bg-white rounded-full" />
                </button>
                
                {/* Add sibling button */}
                <button
                  data-add-sibling-button
                    className="absolute left-1/2 -translate-x-1/2 -bottom-4 w-6 h-6 
                    bg-[#8B5CF6] hover:bg-[#7C3AED] active:bg-[#6D28D9]
                    rounded-full cursor-pointer transition-all shadow-sm z-30
                    flex items-center justify-center text-white opacity-0 group-hover:opacity-100"
                  style={{ pointerEvents: 'auto' }}
                  title="Add sibling node below"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    createSiblingNode(node.id);
                  }}
                >
                  <Plus size={14} strokeWidth={3} />
                </button>

                {/* Text - Whimsical style */}
                {isEditing ? (
                  <input
                    type="text"
                    value={node.text}
                    onChange={(e) => updateNodeText(node.id, e.target.value)}
                    onBlur={() => setEditingNodeId(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setEditingNodeId(null);
                      }
                      e.stopPropagation();
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full h-full px-4 py-2 text-center bg-transparent outline-none"
                    style={{
                      fontWeight: node.fontWeight || 'normal',
                      fontStyle: node.fontStyle || 'normal',
                      textDecoration: node.textDecoration || 'none',
                      fontSize: nodeDepth === 0 ? 14 : nodeDepth === 1 ? 13 : 12,
                      color: '#0F172A'
                    }}
                    autoFocus
                  />
                ) : (
                  <span
                    className="px-4 py-2 text-center pointer-events-none"
                    style={{
                      fontWeight: node.fontWeight || 'normal',
                      fontStyle: node.fontStyle || 'normal',
                      textDecoration: node.textDecoration || 'none',
                      fontSize: nodeDepth === 0 ? 14 : nodeDepth === 1 ? 13 : 12,
                      color: '#0F172A'
                    }}
                  >
                    {node.text}
                  </span>
                )}

                {/* Link / comment indicators */}
                {(node.href || (node.commentCount ?? 0) > 0) && (
                  <div className="absolute -top-3 right-2 flex gap-1 text-[10px] text-slate-500">
                    {node.href && <span className="px-1 py-0.5 bg-white/80 border border-slate-200 rounded">🔗</span>}
                    {(node.commentCount ?? 0) > 0 ? (
                      <span className="px-1.5 py-0.5 bg-white/80 border border-slate-200 rounded">
                        💬 {node.commentCount}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}

        </div>

        {/* Empty state */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <p className="text-slate-600 font-medium text-lg">Start your mind map</p>
                <p className="text-slate-400 text-sm mt-1">Double-click anywhere to add your first idea</p>
              </div>
            </div>
          </div>
        )}

        {/* No vault warning */}
        {!vaultPath && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-amber-700 text-sm">
            Open a vault to save your mind maps
          </div>
        )}

        {/* Keyboard hints */}
        <div className="absolute bottom-4 left-4 text-xs bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-slate-500">
            <span className="font-medium text-slate-700">Double-click</span> to add node • 
            <span className="font-medium text-slate-700"> Click ●</span> on node to add child
          </span>
        </div>
      </div>
    </div>
  );
}
