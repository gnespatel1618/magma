export {};

declare global {
  interface Window {
    appBridge?: {
      openVault?: () => Promise<string | null>;
      snapshot?: () => Promise<unknown>;
      listNotes?: (vaultPath: string) => Promise<Array<{ id: string; path: string; title: string }>>;
      createNote?: (
        vaultPath: string,
        title: string
      ) => Promise<{ ok: boolean; note?: { id: string; path: string; title: string }; message?: string }>;
      readNote?: (filePath: string) => Promise<string>;
      writeNote?: (filePath: string, content: string) => Promise<{ ok: boolean }>;
      gitAction?: (vaultPath: string, action: 'snapshot' | 'push' | 'pull') => Promise<{ ok: boolean; message?: string }>;
      saveExcalidraw?: (vaultPath: string, noteId: string, data: unknown) => Promise<{ ok: boolean; message?: string }>;
    };
  }
}

