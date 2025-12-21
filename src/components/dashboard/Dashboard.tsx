import React from 'react';
import type { ParsedTask } from '../../lib/taskParser';
import { KanbanBoard } from './KanbanBoard';
import { TableView } from './TableView';
import { TagsSection } from './TagsSection';
import { SettingsSection } from './SettingsSection';
import { MindmapSection } from './MindmapSection';

type NoteMeta = { id: string; path: string; title: string; type?: 'file' | 'folder'; children?: NoteMeta[] };

/**
 * Main dashboard component displaying task views, tags, mindmap, and settings.
 * 
 * @param tasks - Array of all tasks to display
 * @param notes - Array of note metadata for mindmap
 * @param tags - Set of all unique tags found in notes
 */
export const Dashboard: React.FC<{
  tasks: ParsedTask[];
  notes: NoteMeta[];
  tags: Set<string>;
}> = ({ tasks, notes, tags }) => {
  return (
    <div className="space-y-4">
      <KanbanBoard tasks={tasks} />
      <div className="grid grid-cols-2 gap-4">
        <TableView tasks={tasks} />
        <MindmapSection notes={notes} />
      </div>
      <TagsSection tags={tags} />
      <SettingsSection />
    </div>
  );
};

