import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('appBridge', {
  openVault: () => ipcRenderer.invoke('vault:open'),
  snapshot: () => ipcRenderer.invoke('git:run', undefined, 'snapshot'),
  listNotes: (vaultPath: string) => ipcRenderer.invoke('vault:listNotes', vaultPath),
  createNote: (vaultPath: string, title: string) => ipcRenderer.invoke('vault:createNote', vaultPath, title),
  readNote: (filePath: string) => ipcRenderer.invoke('vault:readNote', filePath),
  writeNote: (filePath: string, content: string) => ipcRenderer.invoke('vault:writeNote', filePath, content),
  gitAction: (vaultPath: string, action: 'snapshot' | 'push' | 'pull') => ipcRenderer.invoke('git:run', vaultPath, action),
  saveExcalidraw: (vaultPath: string, noteId: string, data: unknown) => ipcRenderer.invoke('excalidraw:save', vaultPath, noteId, data)
});

