export {};

declare global {
  interface MindmapMeta {
    id: string;
    name: string;
    path: string;
    updatedAt: string;
  }

  interface HighlightFileMeta {
    id: string;
    domain: string;
    filename: string;
    path: string;
    updatedAt: string;
  }

  interface WebHighlight {
    text: string;
    url: string;
    title: string;
    domain: string;
    timestamp: string;
  }

  interface WindowBounds {
    x?: number;
    y?: number;
    width: number;
    height: number;
  }

  interface GlobalConfig {
    knownVaults: string[];
    lastVaultPath: string | null;
    windowBounds: WindowBounds;
  }

  interface VaultGitConfig {
    remoteUrl: string;
    branch: string;
    ignorePatterns: string[];
    autosyncMinutes: number;
  }

  interface VaultAIConfig {
    model: string;
  }

  interface VaultSettings {
    theme: 'light' | 'dark' | 'system';
    fontSize: number;
    git: VaultGitConfig;
    ai: VaultAIConfig;
  }

  interface TaskFiltersState {
    searchQuery: string;
    filterOwner: string;
    filterProject: string;
    filterPriority: '' | 'low' | 'med' | 'high';
    filterStatus: '' | 'todo' | 'doing' | 'done';
    sortBy: 'due' | 'priority' | 'owner' | 'project' | 'status' | 'title';
    sortOrder: 'asc' | 'desc';
  }

  interface WorkspaceState {
    activeSection: string;
    selectedNotePath: string | null;
    selectedMindMapId: string | null;
    selectedMindMapName: string;
    taskFilters: TaskFiltersState;
  }

  interface Window {
    appBridge?: {
      openVault?: () => Promise<string | null>;
      snapshot?: () => Promise<unknown>;
      listNotes?: (vaultPath: string) => Promise<Array<{ id: string; path: string; title: string; type?: 'file' | 'folder'; children?: Array<any> }>>;
      createNote?: (
        vaultPath: string,
        title: string,
        parentFolderPath?: string
      ) => Promise<{ ok: boolean; note?: { id: string; path: string; title: string }; message?: string }>;
      createFolder?: (vaultPath: string, name: string, parentFolderPath?: string) => Promise<{ ok: boolean; message?: string }>;
      readNote?: (filePath: string) => Promise<string>;
      writeNote?: (filePath: string, content: string) => Promise<{ ok: boolean }>;
      deleteNote?: (filePath: string) => Promise<{ ok: boolean; message?: string }>;
      renameNote?: (oldPath: string, newName: string, vaultPath: string) => Promise<{ ok: boolean; message?: string; note?: { id: string; path: string; title: string; type?: 'file' | 'folder' } }>;
      gitAction?: (vaultPath: string, action: 'snapshot' | 'push' | 'pull') => Promise<{ ok: boolean; message?: string }>;
      saveExcalidraw?: (vaultPath: string, noteId: string, data: unknown) => Promise<{ ok: boolean; message?: string }>;
      saveMediaFile?: (vaultPath: string, filePath: string, notePath?: string) => Promise<{ ok: boolean; relativePath?: string; message?: string }>;
      selectMediaFiles?: () => Promise<string[]>;
      saveClipboardImage?: () => Promise<{ ok: boolean; filePath?: string; message?: string }>;
      listMindmaps?: (vaultPath: string) => Promise<{ ok: boolean; mindmaps: MindmapMeta[]; message?: string }>;
      saveMindmap?: (vaultPath: string, name: string, data: unknown) => Promise<{ ok: boolean; message?: string; path?: string; id?: string }>;
      loadMindmap?: (vaultPath: string, name: string) => Promise<{ ok: boolean; data?: unknown; message?: string }>;
      deleteMindmap?: (vaultPath: string, name: string) => Promise<{ ok: boolean; message?: string }>;
      setCurrentVaultPath?: (vaultPath: string) => Promise<{ ok: boolean }>;
      listHighlights?: (vaultPath: string) => Promise<{ ok: boolean; highlights: HighlightFileMeta[]; message?: string }>;
      readHighlight?: (filePath: string) => Promise<{ ok: boolean; content: string; message?: string }>;
      deleteHighlight?: (filePath: string) => Promise<{ ok: boolean; message?: string }>;
      getHighlightHotkey?: () => Promise<{ hotkey: string }>;
      onHighlightAdded?: (callback: (highlight: WebHighlight) => void) => () => void;
      loadGlobalConfig?: () => Promise<GlobalConfig>;
      saveGlobalConfig?: (config: Partial<GlobalConfig>) => Promise<{ ok: boolean }>;
      registerVault?: (vaultPath: string) => Promise<{ ok: boolean }>;
      loadVaultSettings?: (vaultPath: string) => Promise<VaultSettings>;
      saveVaultSettings?: (vaultPath: string, settings: Partial<VaultSettings>) => Promise<{ ok: boolean }>;
      loadWorkspace?: (vaultPath: string) => Promise<WorkspaceState>;
      saveWorkspace?: (vaultPath: string, state: Partial<WorkspaceState>) => Promise<{ ok: boolean }>;
      loadSecret?: (vaultPath: string, key: string) => Promise<{ value: string }>;
      saveSecret?: (vaultPath: string, key: string, value: string) => Promise<{ ok: boolean }>;
      ensureMagmaDir?: (vaultPath: string) => Promise<{ ok: boolean }>;
      onFlushBeforeQuit?: (callback: () => void) => () => void;
    };
  }
}
