export {};

declare global {
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
    };
  }
}

