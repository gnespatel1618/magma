import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Result type for Git operations.
 */
export type SnapshotResult = {
  /** Whether the operation succeeded */
  ok: boolean;
  /** Human-readable message describing the result */
  message: string;
};

/**
 * Ensures a Git repository exists at the given path.
 * Initializes a new repository if one doesn't exist and creates a default .gitignore file.
 * 
 * @param vaultPath - The path to the vault directory
 * @returns A SimpleGit instance configured for the vault path
 */
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

/**
 * Creates a Git snapshot (commit) of all changes in the vault.
 * Stages all files, checks for changes, and commits with the provided message.
 * 
 * @param vaultPath - The path to the vault directory
 * @param message - The commit message (default: 'Snapshot')
 * @returns Result object indicating success and a descriptive message
 */
export const snapshot = async (
  vaultPath: string,
  message = 'Snapshot'
): Promise<SnapshotResult> => {
  const git = await ensureRepo(vaultPath);
  await git.add('.');
  const status = await git.status();
  if (status.staged.length === 0) {
    return { ok: true, message: 'Nothing to commit' };
  }
  await git.commit(message);
  return { ok: true, message: 'Snapshot committed' };
};

/**
 * Pushes local commits to the remote repository.
 * 
 * @param vaultPath - The path to the vault directory
 * @returns Result object indicating success and a descriptive message
 * @throws Error if push fails (e.g., no remote configured, authentication issues)
 */
export const push = async (vaultPath: string): Promise<SnapshotResult> => {
  const git = await ensureRepo(vaultPath);
  await git.push();
  return { ok: true, message: 'Pushed' };
};

/**
 * Pulls changes from the remote repository.
 * 
 * @param vaultPath - The path to the vault directory
 * @returns Result object indicating success and a descriptive message
 * @throws Error if pull fails (e.g., no remote configured, merge conflicts)
 */
export const pull = async (vaultPath: string): Promise<SnapshotResult> => {
  const git = await ensureRepo(vaultPath);
  await git.pull();
  return { ok: true, message: 'Pulled' };
};

