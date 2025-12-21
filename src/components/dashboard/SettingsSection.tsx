import React from 'react';
import { Settings } from 'lucide-react';
import { LabeledInput } from '../ui/LabeledInput';

/**
 * Settings section component for configuring Git, sync, and AI settings.
 * Currently displays form fields but does not persist settings (stubbed).
 */
export const SettingsSection: React.FC = () => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Settings size={16} /> Settings (Git, sync, AI)
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <LabeledInput label="Git remote URL" placeholder="https://github.com/org/repo.git" />
        <LabeledInput label="Ignore patterns" placeholder="*.png, *.mp4, dist/" />
        <LabeledInput label="Autosync cadence (minutes)" placeholder="30" />
        <LabeledInput label="OpenAI API key" placeholder="sk-..." />
      </div>
      <div className="flex justify-end">
        <button className="inline-flex items-center gap-2 rounded-lg bg-rose-brand px-3 py-2 text-sm font-semibold text-white shadow-soft hover:opacity-90 transition-opacity">
          Save settings
        </button>
      </div>
    </div>
  );
};

