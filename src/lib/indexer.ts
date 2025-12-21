import fs from 'fs';
import path from 'path';

/**
 * Task metadata extracted from frontmatter or task blocks.
 */
export type TaskFrontmatter = {
  /** Task status (e.g., 'todo', 'doing', 'done') */
  status?: string;
  /** Priority level (e.g., 'low', 'med', 'high') */
  priority?: string;
  /** Due date in YYYY-MM-DD format */
  due?: string;
  /** Array of tag strings */
  tags?: string[];
  /** Project name */
  project?: string;
};

/**
 * Index entry for a note in the vault.
 */
export type NoteIndex = {
  /** Full file path to the note */
  path: string;
  /** Note title (filename without extension) */
  title: string;
  /** Array of tasks found in the note */
  tasks: TaskFrontmatter[];
};

/**
 * Indexes a vault directory by scanning for Markdown and Org files.
 * This is a placeholder implementation that only finds files;
 * a full implementation would parse frontmatter and task blocks.
 * 
 * @param vaultPath - The path to the vault directory to index
 * @returns Array of note index entries (currently with empty tasks array)
 */
export function indexVault(vaultPath: string): NoteIndex[] {
  if (!fs.existsSync(vaultPath)) return [];
  const files = fs.readdirSync(vaultPath).filter((f) => f.endsWith('.md') || f.endsWith('.org'));
  return files.map((file) => ({
    path: path.join(vaultPath, file),
    title: file.replace(/\.(md|org)$/, ''),
    tasks: [],
  }));
}

