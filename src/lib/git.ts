import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';

export type SnapshotResult = { ok: boolean; message: string };

const ensureRepo = async (vaultPath: string): Promise<SimpleGit> => {
  const git = simpleGit(vaultPath);
  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    await git.init();
  }
  const ignorePath = path.join(vaultPath, '.gitignore');
  const defaults = ['node_modules', 'dist', '*.png', '*.jpg', '*.mp4', '*.mov', '*.zip'];
  if (!fs.existsSync(ignorePath)) {
    fs.writeFileSync(ignorePath, defaults.join('\n'));
  }
  return git;
};

export const snapshot = async (vaultPath: string, message = 'Snapshot') => {
  const git = await ensureRepo(vaultPath);
  await git.add('.');
  const status = await git.status();
  if (status.staged.length === 0) {
    return { ok: true, message: 'Nothing to commit' };
  }
  await git.commit(message);
  return { ok: true, message: 'Snapshot committed' };
};

export const push = async (vaultPath: string) => {
  const git = await ensureRepo(vaultPath);
  await git.push();
  return { ok: true, message: 'Pushed' };
};

export const pull = async (vaultPath: string) => {
  const git = await ensureRepo(vaultPath);
  await git.pull();
  return { ok: true, message: 'Pulled' };
};

