import React from 'react';

/**
 * Labeled input component for form fields.
 * 
 * @param label - The label text displayed above the input
 * @param placeholder - Placeholder text for the input field
 */
export const LabeledInput: React.FC<{ label: string; placeholder?: string }> = ({
  label,
  placeholder,
}) => (
  <label className="flex flex-col gap-1 text-sm text-gray-800">
    <span className="text-xs font-semibold text-gray-800">{label}</span>
    <input
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      placeholder={placeholder}
    />
  </label>
);

