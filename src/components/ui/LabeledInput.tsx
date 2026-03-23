import React from 'react';

interface LabeledInputProps {
  label: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  type?: string;
}

export const LabeledInput: React.FC<LabeledInputProps> = ({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
}) => (
  <label className="flex flex-col gap-1 text-sm text-gray-800">
    <span className="text-xs font-semibold text-gray-800">{label}</span>
    <input
      type={type}
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-rose-brand focus:ring-2 focus:ring-rose-light"
      placeholder={placeholder}
      value={value ?? ''}
      onChange={e => onChange?.(e.target.value)}
    />
  </label>
);
