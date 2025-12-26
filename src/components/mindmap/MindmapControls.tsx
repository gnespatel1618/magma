import React, { memo } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';

interface MindmapControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToView: () => void;
  onReset: () => void;
}

export const MindmapControls = memo(function MindmapControls({
  scale,
  onZoomIn,
  onZoomOut,
  onFitToView,
  onReset,
}: MindmapControlsProps) {
  const zoomPercentage = Math.round(scale * 100);

  return (
    <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 p-1">
      {/* Zoom Out */}
      <button
        onClick={onZoomOut}
        className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition-colors"
        title="Zoom out"
      >
        <ZoomOut size={18} />
      </button>

      {/* Zoom Percentage */}
      <span className="px-2 text-sm font-medium text-slate-600 min-w-[52px] text-center">
        {zoomPercentage}%
      </span>

      {/* Zoom In */}
      <button
        onClick={onZoomIn}
        className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition-colors"
        title="Zoom in"
      >
        <ZoomIn size={18} />
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-slate-200 mx-1" />

      {/* Fit to View */}
      <button
        onClick={onFitToView}
        className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition-colors"
        title="Fit to view"
      >
        <Maximize2 size={18} />
      </button>

      {/* Reset */}
      <button
        onClick={onReset}
        className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition-colors"
        title="Reset view"
      >
        <RotateCcw size={18} />
      </button>
    </div>
  );
});

