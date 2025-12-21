/**
 * Metadata for a note or folder in the vault.
 */
export type NoteMeta = {
  /** Unique identifier (typically relative path) */
  id: string;
  /** Full file system path */
  path: string;
  /** Display title (filename without extension) */
  title: string;
  /** Type of item: 'file' for notes, 'folder' for directories */
  type?: 'file' | 'folder';
  /** Child items (for folders) */
  children?: NoteMeta[];
};

