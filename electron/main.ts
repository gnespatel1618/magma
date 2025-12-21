import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { URL } from 'url';
import simpleGit from 'simple-git';

const isDev = !!process.env.VITE_DEV_SERVER_URL;

const createWindow = async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    await win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, 'renderer', 'index.html');
    await win.loadFile(indexPath);
  }
};

app.whenReady().then(() => {
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

ipcMain.handle('vault:open', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return result.filePaths[0] ?? null;
});

ipcMain.handle('git:snapshot', async () => {
  return { ok: true, message: 'Snapshot requested' };
});

ipcMain.handle('vault:listNotes', async (_event, vaultPath: string) => {
  if (!vaultPath || !fs.existsSync(vaultPath)) return [];
  const files = fs.readdirSync(vaultPath).filter((f) => f.endsWith('.md'));
  return files.map((file) => ({
    id: file,
    path: path.join(vaultPath, file),
    title: file.replace(/\.md$/, '')
  }));
});

ipcMain.handle('vault:createNote', async (_event, vaultPath: string, title: string) => {
  if (!vaultPath || !fs.existsSync(vaultPath)) {
    return { ok: false, message: 'Invalid vault path' };
  }
  const baseTitle = title?.trim() || 'Untitled note';
  const safeSlug = baseTitle
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase() || 'untitled-note';
  let filename = `${safeSlug}.md`;
  let counter = 1;
  while (fs.existsSync(path.join(vaultPath, filename))) {
    filename = `${safeSlug}-${counter}.md`;
    counter += 1;
  }
  const filePath = path.join(vaultPath, filename);
  const initialContent = `# ${baseTitle}\n\n`;
  fs.writeFileSync(filePath, initialContent, 'utf-8');
  const note = { id: filename, path: filePath, title: baseTitle };
  return { ok: true, note };
});

ipcMain.handle('vault:readNote', async (_event, filePath: string) => {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    return '';
  }
});

ipcMain.handle('vault:writeNote', async (_event, filePath: string, content: string) => {
  fs.writeFileSync(filePath, content, 'utf-8');
  return { ok: true };
});

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

ipcMain.handle('excalidraw:save', async (_event, vaultPath: string, noteId: string, data: unknown) => {
  if (!vaultPath) return { ok: false, message: 'No vault' };
  const file = path.join(vaultPath, `${noteId || 'canvas'}.excalidraw.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
  return { ok: true, message: `Saved ${path.basename(file)}` };
});

