import React, { useEffect, useState } from 'react';
import { Settings, Eye, EyeOff } from 'lucide-react';
import { LabeledInput } from './ui/LabeledInput';

interface SettingsPageProps {
  vaultPath: string | null;
  settings: VaultSettings | null;
  onSave: (updated: Partial<VaultSettings>) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ vaultPath, settings, onSave }) => {
  const [gitRemoteUrl, setGitRemoteUrl] = useState('');
  const [gitBranch, setGitBranch] = useState('main');
  const [gitIgnorePatterns, setGitIgnorePatterns] = useState('');
  const [autosyncMinutes, setAutosyncMinutes] = useState('0');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiModel, setAiModel] = useState('gpt-4');
  const [theme, setTheme] = useState('system');
  const [fontSize, setFontSize] = useState('16');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setGitRemoteUrl(settings.git.remoteUrl);
      setGitBranch(settings.git.branch);
      setGitIgnorePatterns(settings.git.ignorePatterns.join(', '));
      setAutosyncMinutes(String(settings.git.autosyncMinutes));
      setAiModel(settings.ai.model);
      setTheme(settings.theme);
      setFontSize(String(settings.fontSize));
    }
  }, [settings]);

  useEffect(() => {
    if (vaultPath) {
      window.appBridge?.loadSecret?.(vaultPath, 'openai-api-key').then(result => {
        if (result?.value) setAiApiKey(result.value);
      });
    }
  }, [vaultPath]);

  const handleSave = async () => {
    const updated: Partial<VaultSettings> = {
      theme: theme as 'light' | 'dark' | 'system',
      fontSize: parseInt(fontSize, 10) || 16,
      git: {
        remoteUrl: gitRemoteUrl,
        branch: gitBranch,
        ignorePatterns: gitIgnorePatterns.split(',').map(s => s.trim()).filter(Boolean),
        autosyncMinutes: parseInt(autosyncMinutes, 10) || 0,
      },
      ai: {
        model: aiModel,
      },
    };
    onSave(updated);

    if (vaultPath && aiApiKey) {
      await window.appBridge?.saveSecret?.(vaultPath, 'openai-api-key', aiApiKey);
    } else if (vaultPath && !aiApiKey) {
      await window.appBridge?.saveSecret?.(vaultPath, 'openai-api-key', '');
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCancel = () => {
    if (settings) {
      setGitRemoteUrl(settings.git.remoteUrl);
      setGitBranch(settings.git.branch);
      setGitIgnorePatterns(settings.git.ignorePatterns.join(', '));
      setAutosyncMinutes(String(settings.git.autosyncMinutes));
      setAiModel(settings.ai.model);
      setTheme(settings.theme);
      setFontSize(String(settings.fontSize));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2 rounded-full bg-rose-light px-3 py-1.5 text-rose-dark font-semibold">
          <Settings size={18} />
          Settings
        </div>
        {vaultPath && (
          <span className="text-xs text-slate-500 truncate max-w-md" title={vaultPath}>
            {vaultPath}
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Git Configuration</h2>
          <p className="text-sm text-slate-600 mb-4">Configure Git repository settings for your vault.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LabeledInput
              label="Git remote URL"
              placeholder="https://github.com/org/repo.git"
              value={gitRemoteUrl}
              onChange={setGitRemoteUrl}
            />
            <LabeledInput
              label="Branch name"
              placeholder="main"
              value={gitBranch}
              onChange={setGitBranch}
            />
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Sync Settings</h2>
          <p className="text-sm text-slate-600 mb-4">Configure automatic synchronization options.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LabeledInput
              label="Autosync cadence (minutes, 0 = manual)"
              placeholder="0"
              value={autosyncMinutes}
              onChange={setAutosyncMinutes}
            />
            <LabeledInput
              label="Ignore patterns (comma-separated)"
              placeholder="*.png, *.mp4, dist/"
              value={gitIgnorePatterns}
              onChange={setGitIgnorePatterns}
            />
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">AI Configuration</h2>
          <p className="text-sm text-slate-600 mb-4">Set up AI features and API keys.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm text-gray-800">
              <span className="text-xs font-semibold text-gray-800">OpenAI API key</span>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-10 text-sm text-slate-800 outline-none focus:border-rose-brand focus:ring-2 focus:ring-rose-light"
                  placeholder="sk-..."
                  value={aiApiKey}
                  onChange={e => setAiApiKey(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            <LabeledInput
              label="AI Model"
              placeholder="gpt-4"
              value={aiModel}
              onChange={setAiModel}
            />
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Appearance</h2>
          <p className="text-sm text-slate-600 mb-4">Customize the app appearance.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm text-gray-800">
              <span className="text-xs font-semibold text-gray-800">Theme</span>
              <select
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-rose-brand focus:ring-2 focus:ring-rose-light"
                value={theme}
                onChange={e => setTheme(e.target.value)}
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <LabeledInput
              label="Font size (px)"
              placeholder="16"
              value={fontSize}
              onChange={setFontSize}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          {saved && (
            <span className="text-sm text-emerald-600 font-medium">Settings saved</span>
          )}
          <button
            onClick={handleCancel}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-brand px-4 py-2 text-sm font-semibold text-white shadow-soft hover:opacity-90 transition-opacity"
          >
            Save settings
          </button>
        </div>
      </div>
    </div>
  );
};
