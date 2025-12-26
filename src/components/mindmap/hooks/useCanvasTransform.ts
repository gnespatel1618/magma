import { useState, useCallback, useRef, useEffect } from 'react';

export interface Transform {
  x: number;
  y: number;
  scale: number;
}

interface UseCanvasTransformOptions {
  minScale?: number;
  maxScale?: number;
  initialScale?: number;
}

export function useCanvasTransform(options: UseCanvasTransformOptions = {}) {
  const { minScale = 0.25, maxScale = 2, initialScale = 1 } = options;
  
  const [transform, setTransform] = useState<Transform>({
    x: 0,
    y: 0,
    scale: initialScale,
  });
  
  const isPanning = useRef(false);
  const startPoint = useRef({ x: 0, y: 0 });
  const startTransform = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start panning on left click on canvas background
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('[data-mindmap-node]')) return;
    
    isPanning.current = true;
    startPoint.current = { x: e.clientX, y: e.clientY };
    startTransform.current = { x: transform.x, y: transform.y };
    
    document.body.style.cursor = 'grabbing';
    e.preventDefault();
  }, [transform.x, transform.y]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    
    const dx = e.clientX - startPoint.current.x;
    const dy = e.clientY - startPoint.current.y;
    
    setTransform(prev => ({
      ...prev,
      x: startTransform.current.x + dx,
      y: startTransform.current.y + dy,
    }));
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
    document.body.style.cursor = '';
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate zoom
    const delta = -e.deltaY * 0.001;
    const newScale = Math.min(maxScale, Math.max(minScale, transform.scale * (1 + delta)));
    
    // Zoom towards mouse position
    const scaleRatio = newScale / transform.scale;
    const newX = mouseX - (mouseX - transform.x) * scaleRatio;
    const newY = mouseY - (mouseY - transform.y) * scaleRatio;
    
    setTransform({
      x: newX,
      y: newY,
      scale: newScale,
    });
  }, [transform, minScale, maxScale]);

  const zoomIn = useCallback(() => {
    setTransform(prev => ({
      ...prev,
      scale: Math.min(maxScale, prev.scale * 1.25),
    }));
  }, [maxScale]);

  const zoomOut = useCallback(() => {
    setTransform(prev => ({
      ...prev,
      scale: Math.max(minScale, prev.scale * 0.8),
    }));
  }, [minScale]);

  const resetTransform = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
  }, []);

  const fitToView = useCallback((contentBounds: { width: number; height: number }, containerSize: { width: number; height: number }) => {
    const padding = 80;
    const scaleX = (containerSize.width - padding * 2) / contentBounds.width;
    const scaleY = (containerSize.height - padding * 2) / contentBounds.height;
    const scale = Math.min(scaleX, scaleY, 1);
    
    const x = (containerSize.width - contentBounds.width * scale) / 2;
    const y = (containerSize.height - contentBounds.height * scale) / 2;
    
    setTransform({ x, y, scale });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.cursor = '';
    };
  }, []);

  return {
    transform,
    setTransform,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseUp,
      onWheel: handleWheel,
    },
    zoomIn,
    zoomOut,
    resetTransform,
    fitToView,
  };
}

