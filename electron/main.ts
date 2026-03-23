import { app, BrowserWindow, ipcMain, dialog, Menu, session, clipboard, nativeImage, globalShortcut, Notification } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { URL } from 'url';
import simpleGit from 'simple-git';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  getGlobalConfig,
  saveGlobalConfig,
  getWindowBounds,
  saveWindowBounds,
  registerVault,
  loadVaultSettings,
  saveVaultSettings,
  loadWorkspace,
  saveWorkspace,
  loadSecret,
  saveSecret,
  ensureMagmaDir,
  ensureGitignoreEntries,
} from './configService';

const execAsync = promisify(exec);

// Track the current vault path for web highlights
let currentVaultPath: string | null = null;

let boundsDebounceTimer: NodeJS.Timeout | null = null;

const isDev = !!process.env.VITE_DEV_SERVER_URL;

/**
 * Creates and configures the main application window.
 * Loads the development server URL in dev mode, or the built HTML file in production.
 */
const createWindow = async (): Promise<void> => {
  const savedBounds = getWindowBounds();

  const win = new BrowserWindow({
    width: savedBounds.width,
    height: savedBounds.height,
    ...(savedBounds.x !== undefined && savedBounds.y !== undefined
      ? { x: savedBounds.x, y: savedBounds.y }
      : {}),
    title: 'Magma',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
    },
    ...(process.platform === 'darwin' && (() => {
      const iconPath = path.join(__dirname, '..', 'assets', 'icon.icns');
      return fs.existsSync(iconPath) ? { icon: iconPath } : {};
    })()),
  });

  const persistBounds = () => {
    if (win.isMinimized() || win.isMaximized()) return;
    const bounds = win.getBounds();
    if (boundsDebounceTimer) clearTimeout(boundsDebounceTimer);
    boundsDebounceTimer = setTimeout(() => {
      saveWindowBounds(bounds);
    }, 500);
  };

  win.on('resize', persistBounds);
  win.on('move', persistBounds);

  win.on('close', () => {
    if (!win.isMinimized() && !win.isMaximized()) {
      saveWindowBounds(win.getBounds());
    }
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
    const isEditable = params.isEditable || (params as { inputFieldType?: string }).inputFieldType !== 'none';
    
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

app.whenReady().then(async () => {
  if (process.platform === 'darwin') {
    app.setName('Magma');
    const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
    if (fs.existsSync(iconPath)) {
      app.dock?.setIcon(iconPath);
    }
  }
  
  const defaultSession = session.defaultSession;
  const systemLanguage = app.getLocale() || 'en-US';
  const languages = [systemLanguage];
  if (!languages.includes('en-US')) languages.push('en-US');
  if (!languages.includes('en-GB')) languages.push('en-GB');
  defaultSession.setSpellCheckerLanguages(languages);
  
  registerHighlightHotkey();
  
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('app:flush-before-quit');
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
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
  
  const hiddenFolders = ['.git', '.magma', '.mindmaps', 'assets', '.web-highlights'];
  
  for (const entry of entries) {
    // Skip hidden folders
    if (hiddenFolders.includes(entry.name)) {
      continue;
    }
    
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

/**
 * IPC handler for saving multimedia files (images, videos, audio) to the vault's assets folder.
 * Creates an assets folder if it doesn't exist and saves the file with a unique name.
 * 
 * @param _event - IPC event object
 * @param vaultPath - The path to the vault directory
 * @param filePath - The temporary path to the file to save
 * @param notePath - Optional path to the note file (for organizing assets by note)
 * @returns Result object with success status and the relative path to the saved file
 */
ipcMain.handle('media:saveFile', async (_event, vaultPath: string, filePath: string, notePath?: string) => {
  try {
    if (!vaultPath || !fs.existsSync(vaultPath)) {
      return { ok: false, message: 'Invalid vault path' };
    }
    
    if (!filePath || !fs.existsSync(filePath)) {
      return { ok: false, message: 'File does not exist' };
    }

    // Create assets folder structure
    // If notePath is provided, create assets folder next to the note
    // Otherwise, create a global assets folder in the vault root
    let assetsDir: string;
    if (notePath && fs.existsSync(notePath)) {
      const noteDir = path.dirname(notePath);
      assetsDir = path.join(noteDir, 'assets');
    } else {
      assetsDir = path.join(vaultPath, 'assets');
    }
    
    // Create assets directory if it doesn't exist
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    // Get file extension and generate a safe filename
    const ext = path.extname(filePath);
    const originalName = path.basename(filePath, ext);
    const safeName = originalName
      .replace(/[^a-zA-Z0-9-_ ]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase() || 'file';
    
    // Generate unique filename
    let filename = `${safeName}${ext}`;
    let counter = 1;
    while (fs.existsSync(path.join(assetsDir, filename))) {
      filename = `${safeName}-${counter}${ext}`;
      counter += 1;
    }
    
    const targetPath = path.join(assetsDir, filename);
    
    // Copy the file to the assets folder
    fs.copyFileSync(filePath, targetPath);
    
    // Calculate relative path from vault root
    const relativePath = path.relative(vaultPath, targetPath);
    
    return { 
      ok: true, 
      relativePath: relativePath.replace(/\\/g, '/'), // Normalize path separators
      message: `File saved as ${filename}` 
    };
  } catch (e) {
    return { 
      ok: false, 
      message: `Error: ${e instanceof Error ? e.message : 'Unknown error'}` 
    };
  }
});

/**
 * IPC handler for opening a file dialog to select multimedia files.
 * 
 * @param _event - IPC event object
 * @returns Array of selected file paths, or empty array if cancelled
 */
ipcMain.handle('media:selectFiles', async (_event) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'] },
      { name: 'Videos', extensions: ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'] },
      { name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result.filePaths || [];
});

/**
 * IPC handler for saving clipboard image to a temporary file.
 * Reads the image from clipboard and saves it to a temp file, then returns the path.
 * 
 * @param _event - IPC event object
 * @returns Result object with success status and the temporary file path
 */
ipcMain.handle('media:saveClipboardImage', async (_event) => {
  try {
    const image = clipboard.readImage();
    
    if (image.isEmpty()) {
      return { ok: false, message: 'No image in clipboard' };
    }

    // Create a temporary file path
    const tempDir = os.tmpdir();
    const timestamp = Date.now();
    const tempFilePath = path.join(tempDir, `clipboard-image-${timestamp}.png`);
    
    // Save the image to the temp file
    const pngBuffer = image.toPNG();
    fs.writeFileSync(tempFilePath, pngBuffer);
    
    return { 
      ok: true, 
      filePath: tempFilePath,
      message: 'Image saved from clipboard' 
    };
  } catch (e) {
    return { 
      ok: false, 
      message: `Error: ${e instanceof Error ? e.message : 'Unknown error'}` 
    };
  }
});

// ============================================
// Mind Map File Operations
// ============================================

/**
 * Gets the path to the mindmaps folder in the vault.
 * Creates the folder if it doesn't exist.
 */
const getMindmapsFolder = (vaultPath: string): string => {
  const mindmapsDir = path.join(vaultPath, '.mindmaps');
  if (!fs.existsSync(mindmapsDir)) {
    fs.mkdirSync(mindmapsDir, { recursive: true });
  }
  return mindmapsDir;
};

/**
 * IPC handler for listing all mind maps in the vault.
 * 
 * @param _event - IPC event object
 * @param vaultPath - The path to the vault directory
 * @returns Array of mind map metadata
 */
ipcMain.handle('mindmap:list', async (_event, vaultPath: string) => {
  try {
    if (!vaultPath || !fs.existsSync(vaultPath)) {
      return { ok: false, message: 'Invalid vault path', mindmaps: [] };
    }
    
    const mindmapsDir = getMindmapsFolder(vaultPath);
    const files = fs.readdirSync(mindmapsDir);
    
    const mindmaps = files
      .filter(file => file.endsWith('.mindmap.json'))
      .map(file => {
        const filePath = path.join(mindmapsDir, file);
        const stats = fs.statSync(filePath);
        const name = file.replace('.mindmap.json', '');
        return {
          id: name,
          name: name,
          path: filePath,
          updatedAt: stats.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    
    return { ok: true, mindmaps };
  } catch (e) {
    return { 
      ok: false, 
      message: `Error: ${e instanceof Error ? e.message : 'Unknown error'}`,
      mindmaps: [] 
    };
  }
});

/**
 * IPC handler for saving a mind map to the vault.
 * 
 * @param _event - IPC event object
 * @param vaultPath - The path to the vault directory
 * @param name - The name of the mind map
 * @param data - The mind map data to save
 * @returns Result object with success status
 */
ipcMain.handle('mindmap:save', async (_event, vaultPath: string, name: string, data: unknown) => {
  try {
    if (!vaultPath || !fs.existsSync(vaultPath)) {
      return { ok: false, message: 'Invalid vault path' };
    }
    
    const mindmapsDir = getMindmapsFolder(vaultPath);
    const safeName = name
      .replace(/[^a-zA-Z0-9-_ ]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase() || 'untitled';
    
    const filePath = path.join(mindmapsDir, `${safeName}.mindmap.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    
    return { 
      ok: true, 
      message: `Mind map "${name}" saved`,
      path: filePath,
      id: safeName
    };
  } catch (e) {
    return { 
      ok: false, 
      message: `Error: ${e instanceof Error ? e.message : 'Unknown error'}` 
    };
  }
});

/**
 * IPC handler for loading a mind map from the vault.
 * 
 * @param _event - IPC event object
 * @param vaultPath - The path to the vault directory
 * @param name - The name of the mind map to load
 * @returns Result object with the mind map data
 */
ipcMain.handle('mindmap:load', async (_event, vaultPath: string, name: string) => {
  try {
    if (!vaultPath || !fs.existsSync(vaultPath)) {
      return { ok: false, message: 'Invalid vault path' };
    }
    
    const mindmapsDir = getMindmapsFolder(vaultPath);
    const filePath = path.join(mindmapsDir, `${name}.mindmap.json`);
    
    if (!fs.existsSync(filePath)) {
      return { ok: false, message: 'Mind map not found' };
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    return { ok: true, data };
  } catch (e) {
    return { 
      ok: false, 
      message: `Error: ${e instanceof Error ? e.message : 'Unknown error'}` 
    };
  }
});

/**
 * IPC handler for deleting a mind map from the vault.
 * 
 * @param _event - IPC event object
 * @param vaultPath - The path to the vault directory
 * @param name - The name of the mind map to delete
 * @returns Result object with success status
 */
ipcMain.handle('mindmap:delete', async (_event, vaultPath: string, name: string) => {
  try {
    if (!vaultPath || !fs.existsSync(vaultPath)) {
      return { ok: false, message: 'Invalid vault path' };
    }
    
    const mindmapsDir = getMindmapsFolder(vaultPath);
    const filePath = path.join(mindmapsDir, `${name}.mindmap.json`);
    
    if (!fs.existsSync(filePath)) {
      return { ok: false, message: 'Mind map not found' };
    }
    
    fs.unlinkSync(filePath);
    
    return { ok: true, message: `Mind map "${name}" deleted` };
  } catch (e) {
    return { 
      ok: false, 
      message: `Error: ${e instanceof Error ? e.message : 'Unknown error'}` 
    };
  }
});

// ============================================
// Web Highlights (Browser Capture)
// ============================================

/**
 * Gets the path to the web highlights folder in the vault.
 * Creates the folder if it doesn't exist.
 */
const getWebHighlightsFolder = (vaultPath: string): string => {
  const highlightsDir = path.join(vaultPath, '.web-highlights');
  if (!fs.existsSync(highlightsDir)) {
    fs.mkdirSync(highlightsDir, { recursive: true });
  }
  return highlightsDir;
};

/**
 * Converts a domain to a safe filename.
 */
const domainToFilename = (domain: string): string => {
  return domain
    .replace(/^www\./, '')
    .replace(/[^a-zA-Z0-9.-]/g, '-')
    .toLowerCase();
};

/**
 * Appends a highlight to the domain-specific markdown file.
 */
const appendHighlight = (vaultPath: string, highlight: {
  text: string;
  url: string;
  title: string;
  domain: string;
  timestamp: string;
}) => {
  const highlightsDir = getWebHighlightsFolder(vaultPath);
  const filename = `${domainToFilename(highlight.domain)}.md`;
  const filePath = path.join(highlightsDir, filename);
  
  // Format the highlight as markdown with blockquote
  const formattedText = highlight.text
    .split('\n')
    .map(line => `> ${line}`)
    .join('\n');
  
  const entry = `
## ${highlight.title}

${formattedText}

- **Source:** [${highlight.url}](${highlight.url})
- **Saved:** ${new Date(highlight.timestamp).toLocaleString()}

---
`;

  // Create or append to file
  if (fs.existsSync(filePath)) {
    fs.appendFileSync(filePath, entry, 'utf-8');
  } else {
    const header = `# Highlights from ${highlight.domain}\n\n`;
    fs.writeFileSync(filePath, header + entry, 'utf-8');
  }
  
  return { filePath, filename };
};

/**
 * Gets the URL from the currently active browser window.
 * Uses OS-specific scripts to query the frontmost browser.
 */
async function getActiveBrowserURL(): Promise<{ url: string; title: string } | null> {
  try {
    if (process.platform === 'darwin') {
      // macOS: Use JavaScript for Automation (JXA) instead of AppleScript
      // JXA is more robust and doesn't fail when apps aren't installed
      const script = `
function run() {
  const SystemEvents = Application('System Events');
  const frontProcess = SystemEvents.processes.whose({ frontmost: true })[0];
  const frontApp = frontProcess.name();
  
  // Map of browser names to their scripting approach
  const chromiumBrowsers = [
    'Google Chrome', 'Google Chrome Canary', 'Microsoft Edge', 
    'Brave Browser', 'Chromium', 'Vivaldi', 'Opera'
  ];
  
  try {
    if (chromiumBrowsers.includes(frontApp)) {
      // Chromium-based browsers share the same scripting API
      const browser = Application(frontApp);
      const win = browser.windows[0];
      const tab = win.activeTab();
      return tab.url() + '|||' + tab.title();
    }
    
    if (frontApp === 'Safari') {
      const safari = Application('Safari');
      const doc = safari.documents[0];
      return doc.url() + '|||' + doc.name();
    }
    
    if (frontApp === 'Arc') {
      // Arc uses a similar API to Chrome
      try {
        const arc = Application('Arc');
        const win = arc.windows[0];
        const tab = win.activeTab();
        return tab.url() + '|||' + tab.title();
      } catch (e) {
        // Fallback to window title
        return 'arc://unknown|||' + frontProcess.windows[0].name();
      }
    }
    
    if (frontApp === 'Firefox') {
      // Firefox doesn't support URL scripting, use window title
      return 'firefox://unknown|||' + frontProcess.windows[0].name();
    }
    
    // Fallback: return window title for unknown browsers
    const windowTitle = frontProcess.windows[0].name();
    return 'unknown://browser|||' + windowTitle;
    
  } catch (e) {
    // Final fallback
    try {
      const windowTitle = frontProcess.windows[0].name();
      return 'unknown://browser|||' + windowTitle;
    } catch (e2) {
      return '';
    }
  }
}
`;
      
      // Write JXA script to temp file
      const scriptPath = path.join(os.tmpdir(), 'magma-browser-url.js');
      fs.writeFileSync(scriptPath, script, 'utf-8');
      
      const { stdout } = await execAsync(`osascript -l JavaScript "${scriptPath}"`);
      const output = stdout.trim();
      if (output && output.includes('|||')) {
        const [url, title] = output.split('|||');
        return { url: url.trim(), title: title?.trim() || '' };
      }
    } else if (process.platform === 'win32') {
      // Windows: Use PowerShell to get URL from Chromium browsers via UI Automation
      const script = `
        Add-Type -AssemblyName UIAutomationClient
        Add-Type -AssemblyName System.Windows.Forms
        
        Add-Type @"
          using System;
          using System.Runtime.InteropServices;
          public class WinAPI {
            [DllImport("user32.dll")]
            public static extern IntPtr GetForegroundWindow();
            [DllImport("user32.dll", CharSet = CharSet.Unicode)]
            public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);
            [DllImport("user32.dll")]
            public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
          }
"@
        
        $hwnd = [WinAPI]::GetForegroundWindow()
        $title = New-Object System.Text.StringBuilder 256
        [WinAPI]::GetWindowText($hwnd, $title, 256)
        $windowTitle = $title.ToString()
        
        $processId = 0
        [WinAPI]::GetWindowThreadProcessId($hwnd, [ref]$processId)
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        $processName = if ($process) { $process.ProcessName } else { "" }
        
        # Check if it's a browser
        $browsers = @("chrome", "msedge", "brave", "vivaldi", "opera", "chromium")
        $isBrowser = $browsers | Where-Object { $processName -like "*$_*" }
        
        if ($isBrowser) {
          $window = [System.Windows.Automation.AutomationElement]::FromHandle($hwnd)
          $condition = New-Object System.Windows.Automation.PropertyCondition(
            [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
            [System.Windows.Automation.ControlType]::Edit
          )
          $edit = $window.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condition)
          
          if ($edit) {
            try {
              $pattern = $edit.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
              $url = $pattern.Current.Value
              Write-Output "$url|||$windowTitle"
            } catch {
              Write-Output "|||$windowTitle"
            }
          } else {
            Write-Output "|||$windowTitle"
          }
        } else {
          Write-Output ""
        }
      `;
      
      try {
        const { stdout } = await execAsync(`powershell -NoProfile -Command "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, {
          timeout: 5000
        });
        const output = stdout.trim();
        if (output && output.includes('|||')) {
          const [url, title] = output.split('|||');
          return { url: url.trim(), title: title?.trim() || '' };
        }
      } catch (err) {
        console.error('PowerShell error:', err);
      }
    } else {
      // Linux: Use xdotool
      try {
        const { stdout: windowName } = await execAsync('xdotool getactivewindow getwindowname');
        const title = windowName.trim();
        
        // Try to extract URL from common browser patterns in window title
        // Many browsers put URL or title - Browser Name format
        return { url: '', title };
      } catch (err) {
        console.error('Linux URL detection error:', err);
      }
    }
  } catch (err) {
    console.error('Failed to get browser URL:', err);
  }
  return null;
}

/**
 * Simulates Cmd+C (macOS) or Ctrl+C (Windows/Linux) to copy selected text.
 * Returns true if successful, false if failed (e.g., no accessibility permissions).
 */
async function simulateCopy(): Promise<boolean> {
  try {
    if (process.platform === 'darwin') {
      // macOS: Use AppleScript to simulate Cmd+C
      // This requires Accessibility permissions in System Preferences
      await execAsync(`osascript -e 'tell application "System Events" to keystroke "c" using command down'`);
      return true;
    } else if (process.platform === 'win32') {
      // Windows: Use PowerShell to send Ctrl+C
      await execAsync(`powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^c')"`);
      return true;
    } else {
      // Linux: Use xdotool
      await execAsync('xdotool key --clearmodifiers ctrl+c');
      return true;
    }
  } catch (err) {
    // This typically fails on macOS if Accessibility permissions aren't granted
    console.log('Auto-copy not available (Accessibility permissions may be needed)');
    return false;
  }
}

// Track if we've shown the permissions hint
let hasShownPermissionsHint = false;

/**
 * Captures the current selection and active browser info, then saves as a highlight.
 * Tries to auto-copy, but falls back to reading existing clipboard if permissions are missing.
 */
async function captureWebHighlight(): Promise<void> {
  if (!currentVaultPath) {
    dialog.showErrorBox('No Vault Open', 'Please open a vault in Magma first to save highlights.');
    return;
  }

  // Save current clipboard content
  const previousClipboard = clipboard.readText();
  
  // Try to simulate Cmd+C / Ctrl+C to copy selection
  const copySucceeded = await simulateCopy();
  
  if (copySucceeded) {
    // Wait for the copy operation to complete
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Read the clipboard text
  const selectedText = clipboard.readText();
  
  if (!selectedText || selectedText.trim().length === 0) {
    // No text in clipboard
    if (!copySucceeded && !hasShownPermissionsHint) {
      // First time failure - show helpful message about permissions
      hasShownPermissionsHint = true;
      const result = dialog.showMessageBoxSync({
        type: 'info',
        title: 'Accessibility Permission Needed',
        message: 'For automatic text capture, Magma needs Accessibility permissions.',
        detail: 'Go to: System Preferences → Privacy & Security → Accessibility → Add Magma\n\nAlternatively, you can copy text manually (Cmd+C) before pressing the hotkey.',
        buttons: ['Open System Preferences', 'I\'ll Copy Manually'],
        defaultId: 0
      });
      
      if (result === 0) {
        // Open System Preferences to Accessibility
        execAsync('open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"');
      }
    } else {
      dialog.showErrorBox('No Text Selected', 'Please select and copy (Cmd+C) some text first, then press the hotkey.');
    }
    return;
  }

  // Get browser URL and title
  const browserInfo = await getActiveBrowserURL();
  
  let url = 'unknown://clipboard';
  let title = 'Clipboard Capture';
  let domain = 'clipboard';
  
  if (browserInfo && browserInfo.url) {
    try {
      const parsedUrl = new URL(browserInfo.url);
      url = browserInfo.url;
      title = browserInfo.title || parsedUrl.hostname;
      domain = parsedUrl.hostname;
    } catch {
      // If URL parsing fails, use the raw values
      url = browserInfo.url || url;
      title = browserInfo.title || title;
    }
  } else if (browserInfo && browserInfo.title) {
    // We have a title but no URL (common on Linux/Firefox)
    title = browserInfo.title;
    domain = 'browser-capture';
  }

  try {
    const highlight = {
      text: selectedText,
      url,
      title,
      domain,
      timestamp: new Date().toISOString()
    };

    const { filename } = appendHighlight(currentVaultPath, highlight);

    // Notify renderer to refresh if needed
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('highlight:added', highlight);
    });

    // Show native notification
    if (Notification.isSupported()) {
      new Notification({
        title: 'Highlight Saved',
        body: `Saved to ${filename}`,
        silent: true
      }).show();
    }

  } catch (err) {
    dialog.showErrorBox('Error', 'Failed to save highlight: ' + (err as Error).message);
  }
}

/**
 * Registers the global hotkey for capturing web highlights.
 */
function registerHighlightHotkey(): void {
  // Use Cmd+Shift+H on macOS, Ctrl+Shift+H on Windows/Linux
  const shortcut = 'CommandOrControl+Shift+H';
  
  const registered = globalShortcut.register(shortcut, async () => {
    await captureWebHighlight();
  });

  if (registered) {
    console.log(`Global hotkey ${shortcut} registered for web highlights`);
  } else {
    console.error(`Failed to register global hotkey ${shortcut}`);
  }
}

/**
 * IPC handler for setting the current vault path (used for web highlights).
 */
ipcMain.handle('vault:setCurrentPath', (_event, vaultPath: string) => {
  currentVaultPath = vaultPath;
  return { ok: true };
});

/**
 * IPC handler for listing all web highlight files in the vault.
 */
ipcMain.handle('highlights:list', async (_event, vaultPath: string) => {
  try {
    if (!vaultPath || !fs.existsSync(vaultPath)) {
      return { ok: false, message: 'Invalid vault path', highlights: [] };
    }
    
    const highlightsDir = path.join(vaultPath, '.web-highlights');
    if (!fs.existsSync(highlightsDir)) {
      return { ok: true, highlights: [] };
    }
    
    const files = fs.readdirSync(highlightsDir);
    
    const highlights = files
      .filter(file => file.endsWith('.md'))
      .map(file => {
        const filePath = path.join(highlightsDir, file);
        const stats = fs.statSync(filePath);
        const domain = file.replace('.md', '');
        return {
          id: domain,
          domain: domain,
          filename: file,
          path: filePath,
          updatedAt: stats.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    
    return { ok: true, highlights };
  } catch (e) {
    return { 
      ok: false, 
      message: `Error: ${e instanceof Error ? e.message : 'Unknown error'}`,
      highlights: [] 
    };
  }
});

/**
 * IPC handler for reading a specific highlight file.
 */
ipcMain.handle('highlights:read', async (_event, filePath: string) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { ok: false, message: 'File not found', content: '' };
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return { ok: true, content };
  } catch (e) {
    return { 
      ok: false, 
      message: `Error: ${e instanceof Error ? e.message : 'Unknown error'}`,
      content: '' 
    };
  }
});

/**
 * IPC handler for deleting a highlight file.
 */
ipcMain.handle('highlights:delete', async (_event, filePath: string) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { ok: false, message: 'File not found' };
    }
    fs.unlinkSync(filePath);
    return { ok: true, message: 'Highlight file deleted' };
  } catch (e) {
    return { 
      ok: false, 
      message: `Error: ${e instanceof Error ? e.message : 'Unknown error'}` 
    };
  }
});

/**
 * IPC handler to get the current highlight hotkey.
 */
ipcMain.handle('highlights:getHotkey', () => {
  return { hotkey: 'CommandOrControl+Shift+H' };
});

// ============================================
// Config / Persistence IPC Handlers
// ============================================

ipcMain.handle('config:loadGlobal', () => {
  return getGlobalConfig();
});

ipcMain.handle('config:saveGlobal', (_event, config: Record<string, unknown>) => {
  saveGlobalConfig(config);
  return { ok: true };
});

ipcMain.handle('config:registerVault', (_event, vaultPath: string) => {
  registerVault(vaultPath);
  return { ok: true };
});

ipcMain.handle('config:loadVaultSettings', (_event, vaultPath: string) => {
  return loadVaultSettings(vaultPath);
});

ipcMain.handle('config:saveVaultSettings', (_event, vaultPath: string, settings: Record<string, unknown>) => {
  saveVaultSettings(vaultPath, settings);
  return { ok: true };
});

ipcMain.handle('config:loadWorkspace', (_event, vaultPath: string) => {
  return loadWorkspace(vaultPath);
});

ipcMain.handle('config:saveWorkspace', (_event, vaultPath: string, state: Record<string, unknown>) => {
  saveWorkspace(vaultPath, state);
  return { ok: true };
});

ipcMain.handle('config:loadSecret', (_event, vaultPath: string, key: string) => {
  return { value: loadSecret(vaultPath, key) };
});

ipcMain.handle('config:saveSecret', (_event, vaultPath: string, key: string, value: string) => {
  saveSecret(vaultPath, key, value);
  return { ok: true };
});

ipcMain.handle('config:ensureMagmaDir', (_event, vaultPath: string) => {
  ensureMagmaDir(vaultPath);
  ensureGitignoreEntries(vaultPath);
  return { ok: true };
});

