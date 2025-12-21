import React from 'react';

/**
 * Magma logo component - A stylized "M" with molten/ribbon appearance
 * featuring warm gradient colors and an angular wireframe outline.
 */
export const Logo: React.FC<{ size?: number; className?: string }> = ({ 
  size = 24, 
  className = '' 
}) => {
  const uniqueId = `magma-logo-${size}`;
  
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Gradient from orange-yellow to deep red */}
        <linearGradient id={`${uniqueId}-gradient`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFB84D" />
          <stop offset="25%" stopColor="#FF8C42" />
          <stop offset="50%" stopColor="#FF6B6B" />
          <stop offset="75%" stopColor="#FF4757" />
          <stop offset="100%" stopColor="#E11D48" />
        </linearGradient>
        {/* Shadow gradient for depth */}
        <linearGradient id={`${uniqueId}-shadow`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E11D48" />
          <stop offset="100%" stopColor="#881337" />
        </linearGradient>
        {/* Highlight gradient */}
        <linearGradient id={`${uniqueId}-highlight`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFB84D" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FFB84D" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      
      {/* Angular wireframe outline - hexagonal/octagonal shape */}
      <g stroke="#881337" strokeWidth="2.5" fill="none" opacity="0.7">
        {/* Outer frame with geometric lines */}
        <path d="M25 25 L55 20 L95 35 L100 65 L95 95 L65 100 L35 95 L20 65 Z" />
        <path d="M95 25 L65 20 L25 35 L20 65 L25 95 L55 100 L95 95 L100 65 Z" />
        {/* Internal geometric lines that mirror the M curves */}
        <path d="M40 45 L50 55 L40 75" strokeWidth="1.5" />
        <path d="M80 45 L70 55 L80 75" strokeWidth="1.5" />
        <line x1="60" y1="30" x2="60" y2="90" strokeWidth="1.5" />
      </g>
      
      {/* Stylized "M" with molten/ribbon appearance - more fluid curves */}
      <g>
        {/* Main "M" shape with flowing, wavy curves for molten effect */}
        <path
          d="M 28 85 
             C 30 35, 35 40, 42 48
             C 48 54, 52 50, 55 42
             C 58 34, 62 38, 65 48
             C 68 54, 72 50, 75 42
             C 78 34, 82 38, 85 48
             C 88 58, 90 65, 92 85
             L 88 85
             C 86 70, 82 65, 78 62
             C 74 59, 70 65, 65 75
             C 60 65, 56 59, 52 62
             C 48 65, 44 70, 32 85
             Z"
          fill={`url(#${uniqueId}-gradient)`}
          opacity="0.98"
        />
        
        {/* Depth/shadow layer for 3D effect */}
        <path
          d="M 28 85 
             C 30 35, 35 40, 42 48
             C 48 54, 52 50, 55 42
             C 58 34, 62 38, 65 48
             C 68 54, 72 50, 75 42
             C 78 34, 82 38, 85 48
             C 88 58, 90 65, 92 85"
          fill="none"
          stroke={`url(#${uniqueId}-shadow)`}
          strokeWidth="2"
          opacity="0.5"
        />
        
        {/* Highlight for molten/liquid effect */}
        <path
          d="M 32 80 
             C 34 50, 40 52, 45 55
             C 50 58, 55 52, 60 48
             C 65 44, 70 52, 75 55
             C 80 58, 85 52, 88 80"
          fill="none"
          stroke={`url(#${uniqueId}-highlight)`}
          strokeWidth="1.5"
          opacity="0.5"
        />
        
        {/* Additional highlight on top for shine */}
        <ellipse
          cx="60"
          cy="45"
          rx="25"
          ry="8"
          fill={`url(#${uniqueId}-highlight)`}
          opacity="0.3"
        />
      </g>
    </svg>
  );
};

