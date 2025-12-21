import React from 'react';
import { Settings } from 'lucide-react';
import { LabeledInput } from './ui/LabeledInput';

/**
 * Settings page component for configuring Git, sync, and AI settings.
 * This is a dedicated page separate from the dashboard.
 */
export const SettingsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2 rounded-full bg-rose-light px-3 py-1.5 text-rose-dark font-semibold">
          <Settings size={18} />
          Settings
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Git Configuration</h2>
          <p className="text-sm text-slate-600 mb-4">Configure Git repository settings for your vault.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LabeledInput 
              label="Git remote URL" 
              placeholder="https://github.com/org/repo.git" 
            />
            <LabeledInput 
              label="Branch name" 
              placeholder="main" 
            />
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Sync Settings</h2>
          <p className="text-sm text-slate-600 mb-4">Configure automatic synchronization options.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LabeledInput 
              label="Autosync cadence (minutes)" 
              placeholder="30" 
            />
            <LabeledInput 
              label="Ignore patterns" 
              placeholder="*.png, *.mp4, dist/" 
            />
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">AI Configuration</h2>
          <p className="text-sm text-slate-600 mb-4">Set up AI features and API keys.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LabeledInput 
              label="OpenAI API key" 
              placeholder="sk-..." 
            />
            <LabeledInput 
              label="AI Model" 
              placeholder="gpt-4" 
            />
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Appearance</h2>
          <p className="text-sm text-slate-600 mb-4">Customize the app appearance.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LabeledInput 
              label="Theme" 
              placeholder="Light" 
            />
            <LabeledInput 
              label="Font size" 
              placeholder="Default" 
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-rose-brand px-4 py-2 text-sm font-semibold text-white shadow-soft hover:opacity-90 transition-opacity">
            Save settings
          </button>
        </div>
      </div>
    </div>
  );
};

