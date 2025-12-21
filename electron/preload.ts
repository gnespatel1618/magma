import { contextBridge, ipcRenderer } from 'electron';

/**
 * Exposes a secure bridge API to the renderer process.
 * All IPC communication between renderer and main process goes through this bridge.
 * 
 * The bridge provides methods for:
 * - Vault operations (open, list, create, read, write, delete)
 * - Git operations (snapshot, push, pull)
 * - Excalidraw canvas saving
 */
contextBridge.exposeInMainWorld('appBridge', {
  /**
   * Opens a directory selection dialog to choose a vault.
   * 
   * @returns Promise resolving to the selected vault path, or null if cancelled
   */
  openVault: () => ipcRenderer.invoke('vault:open'),

  /**
   * Creates a Git snapshot (commit) of all changes in the vault.
   * 
   * @deprecated Use gitAction with 'snapshot' action instead
   * @returns Promise resolving to operation result
   */
  snapshot: () => ipcRenderer.invoke('git:run', undefined, 'snapshot'),

  /**
   * Lists all notes and folders in a vault directory.
   * 
   * @param vaultPath - The path to the vault directory
   * @returns Promise resolving to array of note/folder metadata
   */
  listNotes: (vaultPath: string) => ipcRenderer.invoke('vault:listNotes', vaultPath),

  /**
   * Creates a new note file in the vault.
   * 
   * @param vaultPath - The path to the vault directory
   * @param title - The title for the new note
   * @param parentFolderPath - Optional path to create note inside a folder
   * @returns Promise resolving to result with created note metadata
   */
  createNote: (vaultPath: string, title: string, parentFolderPath?: string) =>
    ipcRenderer.invoke('vault:createNote', vaultPath, title, parentFolderPath),

  /**
   * Creates a new folder in the vault.
   * 
   * @param vaultPath - The path to the vault directory
   * @param name - The name for the new folder
   * @param parentFolderPath - Optional path to create folder inside another folder
   * @returns Promise resolving to operation result
   */
  createFolder: (vaultPath: string, name: string, parentFolderPath?: string) =>
    ipcRenderer.invoke('vault:createFolder', vaultPath, name, parentFolderPath),

  /**
   * Reads the contents of a note file.
   * 
   * @param filePath - The full path to the note file
   * @returns Promise resolving to the file contents as a string
   */
  readNote: (filePath: string) => ipcRenderer.invoke('vault:readNote', filePath),

  /**
   * Writes content to a note file.
   * 
   * @param filePath - The full path to the note file
   * @param content - The content to write
   * @returns Promise resolving to operation result
   */
  writeNote: (filePath: string, content: string) => ipcRenderer.invoke('vault:writeNote', filePath, content),

  /**
   * Deletes a note file or folder from the vault.
   * 
   * @param filePath - The full path to the file or folder to delete
   * @returns Promise resolving to operation result
   */
  deleteNote: (filePath: string) => ipcRenderer.invoke('vault:deleteNote', filePath),

  /**
   * Renames a note file or folder in the vault.
   * 
   * @param oldPath - The full path to the file or folder to rename
   * @param newName - The new name (without extension for files)
   * @param vaultPath - The path to the vault root
   * @returns Promise resolving to operation result with updated note metadata
   */
  renameNote: (oldPath: string, newName: string, vaultPath: string) =>
    ipcRenderer.invoke('vault:renameNote', oldPath, newName, vaultPath),

  /**
   * Executes a Git operation (snapshot, push, or pull).
   * 
   * @param vaultPath - The path to the vault directory
   * @param action - The Git action to perform
   * @returns Promise resolving to operation result
   */
  gitAction: (vaultPath: string, action: 'snapshot' | 'push' | 'pull') =>
    ipcRenderer.invoke('git:run', vaultPath, action),

  /**
   * Saves Excalidraw canvas data to a JSON file in the vault.
   * 
   * @param vaultPath - The path to the vault directory
   * @param noteId - The identifier for the note (used in filename)
   * @param data - The Excalidraw canvas data
   * @returns Promise resolving to operation result
   */
  saveExcalidraw: (vaultPath: string, noteId: string, data: unknown) =>
    ipcRenderer.invoke('excalidraw:save', vaultPath, noteId, data),
});

