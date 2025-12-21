/**
 * Represents a parsed task from Markdown content.
 */
export type ParsedTask = {
  /** Unique identifier for the task (typically line number) */
  id: string;
  /** The task title/description */
  title: string;
  /** Current status of the task */
  status: 'todo' | 'doing' | 'done';
  /** Optional owner assigned to the task (extracted from @owner) */
  owner?: string;
  /** Optional due date in YYYY-MM-DD format */
  due?: string;
  /** Optional priority level */
  priority?: 'low' | 'med' | 'high';
  /** Optional project name (extracted from project:name) */
  project?: string;
  /** Path to the note file containing this task */
  notePath?: string;
  /** Line number in the note file (0-indexed) */
  lineNumber?: number;
  /** Full line content for updating */
  originalLine?: string;
};

/**
 * Converts a checkbox mark ('x', 'X', '/', or ' ') to a task status.
 * 
 * @param mark - The checkbox mark ('x' or 'X' for done, '/' for doing, ' ' for todo)
 * @returns The corresponding task status
 */
const statusFromMark = (mark: string): 'todo' | 'doing' | 'done' => {
  const lower = mark.toLowerCase();
  if (lower === 'x') return 'done';
  if (lower === '/') return 'doing';
  return 'todo';
};

/**
 * Converts a task status to a checkbox mark.
 * 
 * @param status - The task status
 * @returns The checkbox mark ('x' for done, '/' for doing, ' ' for todo)
 */
export const statusToMark = (status: 'todo' | 'doing' | 'done'): string => {
  if (status === 'done') return 'x';
  if (status === 'doing') return '/';
  return ' ';
};

/**
 * Parses tasks from Markdown content by extracting checkbox list items.
 * Supports task metadata: @owner, project:name, due:YYYY-MM-DD, and #priority.
 * 
 * @param content - The Markdown content to parse
 * @returns Array of parsed tasks with extracted metadata
 * 
 * @example
 * ```markdown
 * - [ ] Complete task @alice project:alpha due:2025-01-15 #high
 * ```
 * Will be parsed as a task with owner='alice', project='alpha', due='2025-01-15', priority='high'
 */
/**
 * Parses tasks from Markdown content.
 * Supports multiple list markers like Obsidian Tasks plugin:
 * - [ ] or - [x] (hyphen)
 * * [ ] or * [x] (asterisk)
 * + [ ] or + [x] (plus)
 * Also supports indented tasks (nested lists)
 */
export function parseTasksFromMarkdown(content: string): ParsedTask[] {
  const lines = content.split('\n');
  const tasks: ParsedTask[] = [];
  
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    
    // Match task patterns: - [ ], - [x], - [/], * [ ], * [x], * [/], + [ ], + [x], + [/]
    // Also supports indented tasks (leading spaces/tabs)
    // Pattern: optional whitespace, list marker (-, *, +), space, [ ], space, task text
    const match = line.match(/^(\s*)([-*+])\s+\[([ xX\/])\]\s+(.*)$/i);
    
    if (match) {
      const checkboxMark = match[3];
      const title = match[4].trim();
      
      // Skip empty tasks
      if (!title) continue;
      
      const status = statusFromMark(checkboxMark);
      const id = `${idx}-${line.trim().substring(0, 20)}`; // More unique ID
      const due = extractDue(line);
      const priority = extractPriority(line);
      const owner = extractOwner(line);
      const project = extractProject(line);
      
      tasks.push({ 
        id, 
        title, 
        status, 
        owner, 
        due, 
        priority, 
        project,
        lineNumber: idx,
        originalLine: line
      });
    }
  }
  
  return tasks;
}

/**
 * Extracts the due date from a task line.
 * Supports formats: 'due:YYYY-MM-DD', 'due YYYY-MM-DD', '@due(YYYY-MM-DD)'.
 * 
 * @param line - The task line to parse
 * @returns The due date in YYYY-MM-DD format, or undefined if not found
 */
const extractDue = (line: string): string | undefined => {
  const dueMatch = line.match(/(?:due[:\s]|@due\()?(\d{4}-\d{2}-\d{2})\)?/i);
  return dueMatch ? dueMatch[1] : undefined;
};

/**
 * Extracts the priority level from a task line.
 * Looks for #low, #med, or #high (case-insensitive).
 * 
 * @param line - The task line to parse
 * @returns The priority level, or undefined if not found
 */
const extractPriority = (line: string): ParsedTask['priority'] | undefined => {
  const m = line.match(/#(low|med|high)/i);
  if (!m) return undefined;
  return m[1].toLowerCase() as ParsedTask['priority'];
};

/**
 * Extracts the owner/assignee from a task line.
 * Looks for @username pattern.
 * 
 * @param line - The task line to parse
 * @returns The owner username, or undefined if not found
 */
const extractOwner = (line: string): string | undefined => {
  const m = line.match(/@([A-Za-z0-9_-]+)/);
  return m ? m[1] : undefined;
};

/**
 * Extracts the project name from a task line.
 * Looks for 'project:name' pattern (case-insensitive).
 * 
 * @param line - The task line to parse
 * @returns The project name, or undefined if not found
 */
const extractProject = (line: string): string | undefined => {
  const m = line.match(/\bproject:([A-Za-z0-9_-]+)/i);
  return m ? m[1] : undefined;
};

/**
 * Updates a task's status in Markdown content by finding and replacing the task line.
 * 
 * @param content - The Markdown content
 * @param task - The task to update (must have lineNumber and originalLine)
 * @param newStatus - The new status for the task
 * @returns Updated Markdown content with the task status changed
 */
export function updateTaskStatus(
  content: string,
  task: ParsedTask,
  newStatus: 'todo' | 'doing' | 'done'
): string {
  if (task.lineNumber === undefined || !task.originalLine) {
    throw new Error('Task must have lineNumber and originalLine to update');
  }
  
  const lines = content.split('\n');
  const lineIndex = task.lineNumber;
  
  if (lineIndex < 0 || lineIndex >= lines.length) {
    throw new Error(`Invalid line number: ${lineIndex}`);
  }
  
  const oldLine = lines[lineIndex];
  const newMark = statusToMark(newStatus);
  
  // Replace the checkbox mark in the line
  // Pattern: [x], [X], [/], or [ ]
  const updatedLine = oldLine.replace(/\[([ xX/])\]/i, `[${newMark}]`);
  
  lines[lineIndex] = updatedLine;
  return lines.join('\n');
}

