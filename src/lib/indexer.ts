import fs from 'fs';
import path from 'path';

export type TaskFrontmatter = {
  status?: string;
  priority?: string;
  due?: string;
  tags?: string[];
  project?: string;
};

export type NoteIndex = {
  path: string;
  title: string;
  tasks: TaskFrontmatter[];
};

// Placeholder parser: in a real app, parse Markdown/Org frontmatter and task blocks.
export function indexVault(vaultPath: string): NoteIndex[] {
  if (!fs.existsSync(vaultPath)) return [];
  const files = fs.readdirSync(vaultPath).filter((f) => f.endsWith('.md') || f.endsWith('.org'));
  return files.map((file) => ({
    path: path.join(vaultPath, file),
    title: file.replace(/\.(md|org)$/, ''),
    tasks: []
  }));
}

