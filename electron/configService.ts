import { app, safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// Type Definitions
// ============================================

export interface WindowBounds {
  x?: number;
  y?: number;
  width: number;
  height: number;
}

export interface GlobalConfig {
  knownVaults: string[];
  lastVaultPath: string | null;
  windowBounds: WindowBounds;
}

export interface VaultGitConfig {
  remoteUrl: string;
  branch: string;
  ignorePatterns: string[];
  autosyncMinutes: number;
}

export interface VaultAIConfig {
  model: string;
}

export interface VaultSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  git: VaultGitConfig;
  ai: VaultAIConfig;
}

export interface TaskFilters {
  searchQuery: string;
  filterOwner: string;
  filterProject: string;
  filterPriority: '' | 'low' | 'med' | 'high';
  filterStatus: '' | 'todo' | 'doing' | 'done';
  sortBy: 'due' | 'priority' | 'owner' | 'project' | 'status' | 'title';
  sortOrder: 'asc' | 'desc';
}

export interface WorkspaceState {
  activeSection: string;
  selectedNotePath: string | null;
  selectedMindMapId: string | null;
  selectedMindMapName: string;
  taskFilters: TaskFilters;
}

// ============================================
// Defaults
// ============================================

const DEFAULT_GLOBAL: GlobalConfig = {
  knownVaults: [],
  lastVaultPath: null,
  windowBounds: { width: 1280, height: 800 },
};

const DEFAULT_VAULT_SETTINGS: VaultSettings = {
  theme: 'system',
  fontSize: 16,
  git: {
    remoteUrl: '',
    branch: 'main',
    ignorePatterns: [],
    autosyncMinutes: 0,
  },
  ai: {
    model: 'gpt-4',
  },
};

const DEFAULT_WORKSPACE: WorkspaceState = {
  activeSection: 'dashboard',
  selectedNotePath: null,
  selectedMindMapId: null,
  selectedMindMapName: 'Untitled',
  taskFilters: {
    searchQuery: '',
    filterOwner: '',
    filterProject: '',
    filterPriority: '',
    filterStatus: '',
    sortBy: 'due',
    sortOrder: 'asc',
  },
};

// ============================================
// Simple JSON Store (replaces electron-store)
// ============================================

function readJSON<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {
    console.error(`Failed to read ${filePath}:`, e);
  }
  return fallback;
}

function writeJSON(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ============================================
// Global Config (Electron userData)
// ============================================

function getGlobalConfigPath(): string {
  return path.join(app.getPath('userData'), 'magma-config.json');
}

export function getGlobalConfig(): GlobalConfig {
  const raw = readJSON<Partial<GlobalConfig>>(getGlobalConfigPath(), {});
  return { ...DEFAULT_GLOBAL, ...raw };
}

export function saveGlobalConfig(config: Partial<GlobalConfig>): void {
  const current = getGlobalConfig();
  writeJSON(getGlobalConfigPath(), { ...current, ...config });
}

export function getWindowBounds(): WindowBounds {
  return getGlobalConfig().windowBounds;
}

export function saveWindowBounds(bounds: WindowBounds): void {
  saveGlobalConfig({ windowBounds: bounds });
}

export function registerVault(vaultPath: string): void {
  const config = getGlobalConfig();
  const knownVaults = config.knownVaults.includes(vaultPath)
    ? config.knownVaults
    : [...config.knownVaults, vaultPath];
  saveGlobalConfig({ knownVaults, lastVaultPath: vaultPath });
}

// ============================================
// Per-Vault .magma/ Folder
// ============================================

function getMagmaDir(vaultPath: string): string {
  return path.join(vaultPath, '.magma');
}

export function ensureMagmaDir(vaultPath: string): string {
  const magmaDir = getMagmaDir(vaultPath);
  if (!fs.existsSync(magmaDir)) {
    fs.mkdirSync(magmaDir, { recursive: true });
  }
  return magmaDir;
}

// ============================================
// Vault Settings (vault/.magma/settings.json)
// ============================================

function getSettingsPath(vaultPath: string): string {
  return path.join(getMagmaDir(vaultPath), 'settings.json');
}

export function loadVaultSettings(vaultPath: string): VaultSettings {
  const raw = readJSON<Partial<VaultSettings>>(getSettingsPath(vaultPath), {});
  return {
    ...DEFAULT_VAULT_SETTINGS,
    ...raw,
    git: { ...DEFAULT_VAULT_SETTINGS.git, ...(raw.git || {}) },
    ai: { ...DEFAULT_VAULT_SETTINGS.ai, ...(raw.ai || {}) },
  };
}

export function saveVaultSettings(vaultPath: string, settings: Partial<VaultSettings>): void {
  ensureMagmaDir(vaultPath);
  const current = loadVaultSettings(vaultPath);
  const merged = {
    ...current,
    ...settings,
    git: { ...current.git, ...(settings.git || {}) },
    ai: { ...current.ai, ...(settings.ai || {}) },
  };
  writeJSON(getSettingsPath(vaultPath), merged);
}

// ============================================
// Workspace State (vault/.magma/workspace.json)
// ============================================

function getWorkspacePath(vaultPath: string): string {
  return path.join(getMagmaDir(vaultPath), 'workspace.json');
}

export function loadWorkspace(vaultPath: string): WorkspaceState {
  const raw = readJSON<Partial<WorkspaceState>>(getWorkspacePath(vaultPath), {});
  return {
    ...DEFAULT_WORKSPACE,
    ...raw,
    taskFilters: { ...DEFAULT_WORKSPACE.taskFilters, ...(raw.taskFilters || {}) },
  };
}

export function saveWorkspace(vaultPath: string, state: Partial<WorkspaceState>): void {
  ensureMagmaDir(vaultPath);
  const current = loadWorkspace(vaultPath);
  const merged = {
    ...current,
    ...state,
    taskFilters: { ...current.taskFilters, ...(state.taskFilters || {}) },
  };
  writeJSON(getWorkspacePath(vaultPath), merged);
}

// ============================================
// Encrypted Secrets (vault/.magma/secrets.enc)
// ============================================

function getSecretsPath(vaultPath: string): string {
  return path.join(getMagmaDir(vaultPath), 'secrets.enc');
}

function loadSecretsMap(vaultPath: string): Record<string, string> {
  const secretsPath = getSecretsPath(vaultPath);
  try {
    if (fs.existsSync(secretsPath) && safeStorage.isEncryptionAvailable()) {
      const encrypted = fs.readFileSync(secretsPath);
      const decrypted = safeStorage.decryptString(encrypted);
      return JSON.parse(decrypted);
    }
  } catch (e) {
    console.error('Failed to load secrets:', e);
  }
  return {};
}

function saveSecretsMap(vaultPath: string, secrets: Record<string, string>): void {
  ensureMagmaDir(vaultPath);
  const secretsPath = getSecretsPath(vaultPath);
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(JSON.stringify(secrets));
    fs.writeFileSync(secretsPath, encrypted);
  } else {
    console.warn('Encryption not available, storing secrets in plain text as fallback');
    fs.writeFileSync(secretsPath, JSON.stringify(secrets), 'utf-8');
  }
}

export function loadSecret(vaultPath: string, key: string): string {
  const secrets = loadSecretsMap(vaultPath);
  return secrets[key] ?? '';
}

export function saveSecret(vaultPath: string, key: string, value: string): void {
  const secrets = loadSecretsMap(vaultPath);
  if (value) {
    secrets[key] = value;
  } else {
    delete secrets[key];
  }
  saveSecretsMap(vaultPath, secrets);
}

// ============================================
// .gitignore Management
// ============================================

export function ensureGitignoreEntries(vaultPath: string): void {
  const gitignorePath = path.join(vaultPath, '.gitignore');
  const entriesToAdd = [
    '.magma/workspace.json',
    '.magma/secrets.enc',
  ];

  let content = '';
  if (fs.existsSync(gitignorePath)) {
    content = fs.readFileSync(gitignorePath, 'utf-8');
  }

  const lines = content.split('\n');
  const missing = entriesToAdd.filter(entry => !lines.some(line => line.trim() === entry));

  if (missing.length > 0) {
    const addition = (content.endsWith('\n') || content === '' ? '' : '\n')
      + '\n# Magma workspace state (machine-specific)\n'
      + missing.join('\n')
      + '\n';
    fs.appendFileSync(gitignorePath, addition, 'utf-8');
  }
}
