import { app, BrowserWindow, ipcMain, dialog, Menu, session } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { URL } from 'url';
import simpleGit from 'simple-git';

const isDev = !!process.env.VITE_DEV_SERVER_URL;

/**
 * Creates and configures the main application window.
 * Loads the development server URL in dev mode, or the built HTML file in production.
 */
const createWindow = async (): Promise<void> => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true, // Enable spell-checking
    },
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    await win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, 'renderer', 'index.html');
    await win.loadFile(indexPath);
  }

  // Enable native context menu for spell-checking on editable elements
  win.webContents.on('context-menu', (event, params) => {
    // Show native menu for editable elements (inputs, textareas, contenteditable)
    // This includes spell-check suggestions when spellcheck is enabled
    const isEditable = params.isEditable || params.inputFieldType !== 'none';
    
    // Debug logging (remove in production)
    if (isEditable && params.misspelledWord) {
      console.log('Misspelled word detected:', params.misspelledWord);
      console.log('Suggestions:', params.dictionarySuggestions);
    }
    
    if (isEditable) {
      // Build menu with standard editing options
      const menuItems: Electron.MenuItemConstructorOptions[] = [];
      
      // Add spell-check suggestions if there's a misspelled word
      // Note: dictionarySuggestions may be empty even if misspelledWord exists
      // This can happen if the word is not in the dictionary but no suggestions are available
      if (params.misspelledWord) {
        // Add suggestions from Electron's spell checker at the top
        if (params.dictionarySuggestions && params.dictionarySuggestions.length > 0) {
          params.dictionarySuggestions.forEach((suggestion: string) => {
            menuItems.push({
              label: suggestion,
              click: () => {
                win.webContents.replaceMisspelling(suggestion);
              },
            });
          });
          
          menuItems.push({ type: 'separator' });
        }
        
        // Add "Add to dictionary" option (always show if word is misspelled)
        menuItems.push({
          label: 'Add to dictionary',
          click: () => {
            win.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord);
          },
        });
        
        menuItems.push({ type: 'separator' });
      }
      
      // Add cut/copy/paste if there's selection or clipboard content
      if (params.selectionText) {
        if (params.editFlags.canCut) {
          menuItems.push({ role: 'cut', label: 'Cut' });
        }
        if (params.editFlags.canCopy) {
          menuItems.push({ role: 'copy', label: 'Copy' });
        }
      }
      
      if (params.editFlags.canPaste) {
        menuItems.push({ role: 'paste', label: 'Paste' });
      }
      
      // Add separator if we have editing options
      if (menuItems.length > 0 && (params.selectionText || params.editFlags.canPaste)) {
        menuItems.push({ type: 'separator' });
      }
      
      if (params.editFlags.canSelectAll) {
        menuItems.push({ role: 'selectAll', label: 'Select All' });
      }
      
      // Always show menu if we have any items
      if (menuItems.length > 0) {
        const menu = Menu.buildFromTemplate(menuItems);
        menu.popup();
      }
    }
    // For non-editable elements, let the renderer handle it (our custom menu)
  });
};

app.whenReady().then(() => {
  // Set spell-checker language (use system default or specify languages)
  // This enables spell-checking with suggestions
  const defaultSession = session.defaultSession;
  
  // Get system language or use English as fallback
  const systemLanguage = app.getLocale() || 'en-US';
  // Set multiple language codes to ensure spell-checking works
  const languages = [systemLanguage];
  if (!languages.includes('en-US')) languages.push('en-US');
  if (!languages.includes('en-GB')) languages.push('en-GB');
  
  defaultSession.setSpellCheckerLanguages(languages);
  
  // Log available languages for debugging
  console.log('Spell-checker languages set to:', languages);
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * IPC handler for opening a vault directory selection dialog.
 * 
 * @returns The selected directory path, or null if cancelled
 */
ipcMain.handle('vault:open', async (): Promise<string | null> => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  return result.filePaths[0] ?? null;
});

/**
 * IPC handler for Git snapshot (deprecated - use git:run instead).
 * 
 * @returns Success result
 * @deprecated Use 'git:run' with action 'snapshot' instead
 */
ipcMain.handle('git:snapshot', async () => {
  return { ok: true, message: 'Snapshot requested' };
});

/**
 * Recursively scans a vault directory and builds a tree structure of notes and folders.
 * Only includes Markdown files (.md) and directories.
 * 
 * @param vaultPath - The root path of the vault
 * @param relativePath - The relative path from vault root (used for recursion)
 * @returns Array of note/folder items with hierarchical structure
 */
const scanVault = (
  vaultPath: string,
  relativePath: string = ''
): Array<{ id: string; path: string; title: string; type: 'file' | 'folder'; children?: Array<any> }> => {
  const items: Array<{ id: string; path: string; title: string; type: 'file' | 'folder'; children?: Array<any> }> = [];
  const fullPath = relativePath ? path.join(vaultPath, relativePath) : vaultPath;
  
  if (!fs.existsSync(fullPath)) return items;
  
  const entries = fs.readdirSync(fullPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const entryPath = relativePath ? path.join(relativePath, entry.name) : entry.name;
    const fullEntryPath = path.join(vaultPath, entryPath);
    
    if (entry.isDirectory()) {
      const children = scanVault(vaultPath, entryPath);
      items.push({
        id: entryPath,
        path: fullEntryPath,
        title: entry.name,
        type: 'folder',
        children
      });
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      items.push({
        id: entryPath,
        path: fullEntryPath,
        title: entry.name.replace(/\.md$/, ''),
        type: 'file'
      });
    }
  }
  
  return items.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
};

/**
 * IPC handler for listing all notes and folders in a vault.
 * 
 * @param _event - IPC event object
 * @param vaultPath - The path to the vault directory
 * @returns Array of note/folder items, or empty array if vault doesn't exist
 */
ipcMain.handle('vault:listNotes', async (_event, vaultPath: string) => {
  if (!vaultPath || !fs.existsSync(vaultPath)) return [];
  return scanVault(vaultPath);
});

/**
 * IPC handler for creating a new note file in the vault.
 * Generates a safe filename from the title and creates the file with initial content.
 * 
 * @param _event - IPC event object
 * @param vaultPath - The path to the vault directory
 * @param title - The title for the new note
 * @param parentFolderPath - Optional path to a parent folder (creates note inside folder)
 * @returns Result object with success status and the created note metadata
 */
ipcMain.handle('vault:createNote', async (_event, vaultPath: string, title: string, parentFolderPath?: string) => {
  if (!vaultPath || !fs.existsSync(vaultPath)) {
    return { ok: false, message: 'Invalid vault path' };
  }
  const baseTitle = title?.trim() || 'Untitled note';
  const safeSlug = baseTitle
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase() || 'untitled-note';
  
  // Determine the target directory (parent folder or vault root)
  const targetDir = parentFolderPath && fs.existsSync(parentFolderPath) ? parentFolderPath : vaultPath;
  
  let filename = `${safeSlug}.md`;
  let counter = 1;
  while (fs.existsSync(path.join(targetDir, filename))) {
    filename = `${safeSlug}-${counter}.md`;
    counter += 1;
  }
  const filePath = path.join(targetDir, filename);
  const initialContent = `# ${baseTitle}\n\n`;
  fs.writeFileSync(filePath, initialContent, 'utf-8');
  
  // Calculate relative path for id (relative to vault)
  const relativePath = path.relative(vaultPath, filePath);
  const note = { id: relativePath, path: filePath, title: baseTitle };
  return { ok: true, note };
});

/**
 * IPC handler for creating a new folder in the vault.
 * Generates a safe folder name and creates the directory.
 * 
 * @param _event - IPC event object
 * @param vaultPath - The path to the vault directory
 * @param name - The name for the new folder
 * @param parentFolderPath - Optional path to a parent folder (creates folder inside parent)
 * @returns Result object with success status and message
 */
ipcMain.handle('vault:createFolder', async (_event, vaultPath: string, name: string, parentFolderPath?: string) => {
  if (!vaultPath || !fs.existsSync(vaultPath)) {
    return { ok: false, message: 'Invalid vault path' };
  }
  const folderName = name?.trim() || 'New folder';
  const safeName = folderName
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '-') || 'new-folder';
  
  // Determine the target directory (parent folder or vault root)
  const targetDir = parentFolderPath && fs.existsSync(parentFolderPath) ? parentFolderPath : vaultPath;
  
  let folderPath = path.join(targetDir, safeName);
  let counter = 1;
  while (fs.existsSync(folderPath)) {
    folderPath = path.join(targetDir, `${safeName}-${counter}`);
    counter += 1;
  }
  fs.mkdirSync(folderPath, { recursive: true });
  return { ok: true, message: `Folder "${safeName}" created` };
});

/**
 * IPC handler for reading the contents of a note file.
 * 
 * @param _event - IPC event object
 * @param filePath - The full path to the note file
 * @returns The file contents as a string, or empty string on error
 */
ipcMain.handle('vault:readNote', async (_event, filePath: string): Promise<string> => {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    return '';
  }
});

/**
 * IPC handler for writing content to a note file.
 * 
 * @param _event - IPC event object
 * @param filePath - The full path to the note file
 * @param content - The content to write to the file
 * @returns Result object with success status
 */
ipcMain.handle('vault:writeNote', async (_event, filePath: string, content: string) => {
  fs.writeFileSync(filePath, content, 'utf-8');
  return { ok: true };
});

/**
 * IPC handler for executing Git operations (snapshot, push, pull).
 * Initializes a Git repository if one doesn't exist.
 * 
 * @param _event - IPC event object
 * @param vaultPath - The path to the vault directory
 * @param action - The Git action to perform ('snapshot', 'push', or 'pull')
 * @returns Result object with success status and message
 */
ipcMain.handle('git:run', async (_event, vaultPath: string, action: 'snapshot' | 'push' | 'pull') => {
  const git = simpleGit(vaultPath);
  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    await git.init();
  }
  if (action === 'snapshot') {
    await git.add('.');
    const status = await git.status();
    if (status.staged.length === 0) {
      return { ok: true, message: 'Nothing to commit' };
    }
    await git.commit('Snapshot');
    return { ok: true, message: 'Snapshot committed' };
  }
  if (action === 'push') {
    await git.push();
    return { ok: true, message: 'Pushed' };
  }
  if (action === 'pull') {
    await git.pull();
    return { ok: true, message: 'Pulled' };
  }
  return { ok: false, message: 'Unknown action' };
});

/**
 * IPC handler for saving Excalidraw canvas data to a JSON file in the vault.
 * 
 * @param _event - IPC event object
 * @param vaultPath - The path to the vault directory
 * @param noteId - The identifier for the note (used in filename)
 * @param data - The Excalidraw canvas data to save
 * @returns Result object with success status and message
 */
ipcMain.handle('excalidraw:save', async (_event, vaultPath: string, noteId: string, data: unknown) => {
  if (!vaultPath) return { ok: false, message: 'No vault' };
  const file = path.join(vaultPath, `${noteId || 'canvas'}.excalidraw.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
  return { ok: true, message: `Saved ${path.basename(file)}` };
});

/**
 * IPC handler for deleting a note file or folder from the vault.
 * Handles both files and directories (recursive deletion for folders).
 * 
 * @param _event - IPC event object
 * @param filePath - The full path to the file or folder to delete
 * @returns Result object with success status and message
 */
ipcMain.handle('vault:deleteNote', async (_event, filePath: string) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { ok: false, message: 'File does not exist' };
    }
    // Check if it's a directory (folder) or file
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      // Delete folder recursively
      fs.rmSync(filePath, { recursive: true, force: true });
      return { ok: true, message: 'Folder deleted' };
    } else {
      // Delete file
      fs.unlinkSync(filePath);
      return { ok: true, message: 'Note deleted' };
    }
  } catch (e) {
    return { ok: false, message: `Error: ${e instanceof Error ? e.message : 'Unknown error'}` };
  }
});

/**
 * IPC handler for renaming a note file or folder in the vault.
 * Handles both files and directories.
 * 
 * @param _event - IPC event object
 * @param oldPath - The full path to the file or folder to rename
 * @param newName - The new name (without extension for files, or folder name)
 * @param vaultPath - The path to the vault root (for calculating relative paths)
 * @returns Result object with success status, message, and updated note metadata
 */
ipcMain.handle('vault:renameNote', async (_event, oldPath: string, newName: string, vaultPath: string) => {
  try {
    if (!fs.existsSync(oldPath)) {
      return { ok: false, message: 'File or folder does not exist' };
    }
    
    const stats = fs.statSync(oldPath);
    const parentDir = path.dirname(oldPath);
    
    // Sanitize the new name
    const safeName = newName
      .trim()
      .replace(/[^a-zA-Z0-9-_ ]/g, '')
      .replace(/\s+/g, '-') || 'untitled';
    
    let newPath: string;
    
    if (stats.isDirectory()) {
      // Rename folder
      newPath = path.join(parentDir, safeName);
    } else {
      // Rename file - preserve .md extension
      newPath = path.join(parentDir, `${safeName}.md`);
    }
    
    // Check if the new path already exists
    if (fs.existsSync(newPath)) {
      return { ok: false, message: 'A file or folder with that name already exists' };
    }
    
    // Rename the file or folder
    fs.renameSync(oldPath, newPath);
    
    // Calculate relative path for id (relative to vault)
    const relativePath = path.relative(vaultPath, newPath);
    const title = stats.isDirectory() ? safeName : safeName;
    
    return { 
      ok: true, 
      message: stats.isDirectory() ? 'Folder renamed' : 'Note renamed',
      note: {
        id: relativePath,
        path: newPath,
        title: title,
        type: stats.isDirectory() ? 'folder' : 'file'
      }
    };
  } catch (e) {
    return { ok: false, message: `Error: ${e instanceof Error ? e.message : 'Unknown error'}` };
  }
});

