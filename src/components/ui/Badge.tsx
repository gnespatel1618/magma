import React from 'react';

/**
 * Badge component for displaying status, priority, or other labels.
 * 
 * @param label - The text to display in the badge
 * @param tone - CSS classes for styling (default: 'bg-slate-100 text-gray-800')
 */
export const Badge: React.FC<{ label: string; tone?: string }> = ({
  label,
  tone = 'bg-slate-100 text-gray-800',
}) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
    {label}
  </span>
);

