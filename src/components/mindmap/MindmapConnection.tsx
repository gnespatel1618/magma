import React, { memo } from 'react';
import type { LayoutConnection } from './hooks/useTreeLayout';

interface MindmapConnectionProps {
  connection: LayoutConnection;
  isHighlighted: boolean;
  animationDelay?: number;
}

export const MindmapConnection = memo(function MindmapConnection({
  connection,
  isHighlighted,
  animationDelay = 0,
}: MindmapConnectionProps) {
  const { sourceX, sourceY, targetX, targetY } = connection;
  
  // Calculate control points for smooth bezier curve
  const midX = (sourceX + targetX) / 2;
  const controlOffset = Math.min(80, (targetX - sourceX) * 0.5);
  
  // Create smooth S-curve path
  const path = `
    M ${sourceX} ${sourceY}
    C ${sourceX + controlOffset} ${sourceY},
      ${targetX - controlOffset} ${targetY},
      ${targetX} ${targetY}
  `;

  return (
    <g className="mindmap-connection">
      {/* Shadow/glow effect for highlighted connections */}
      {isHighlighted && (
        <path
          d={path}
          fill="none"
          stroke="rgba(225, 29, 72, 0.2)"
          strokeWidth={8}
          strokeLinecap="round"
          className="blur-sm"
        />
      )}
      
      {/* Main connection line */}
      <path
        d={path}
        fill="none"
        stroke={isHighlighted ? '#E11D48' : '#CBD5E1'}
        strokeWidth={isHighlighted ? 2.5 : 2}
        strokeLinecap="round"
        className="transition-all duration-300"
        style={{
          strokeDasharray: 1000,
          strokeDashoffset: 0,
          animation: `mindmap-draw 0.6s ease-out ${animationDelay}ms forwards`,
        }}
      />
      
      {/* Arrow marker at target */}
      <circle
        cx={targetX}
        cy={targetY}
        r={isHighlighted ? 4 : 3}
        fill={isHighlighted ? '#E11D48' : '#CBD5E1'}
        className="transition-all duration-300"
        style={{
          opacity: 0,
          animation: `mindmap-fade-in 0.3s ease-out ${animationDelay + 400}ms forwards`,
        }}
      />
      
      {/* Small circle at source for visual polish */}
      <circle
        cx={sourceX}
        cy={sourceY}
        r={isHighlighted ? 3 : 2}
        fill={isHighlighted ? '#E11D48' : '#94A3B8'}
        className="transition-all duration-300"
        style={{
          opacity: 0,
          animation: `mindmap-fade-in 0.3s ease-out ${animationDelay + 200}ms forwards`,
        }}
      />
    </g>
  );
});

