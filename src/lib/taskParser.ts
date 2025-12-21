export type ParsedTask = {
  id: string;
  title: string;
  status: 'todo' | 'doing' | 'done';
  owner?: string;
  due?: string;
  priority?: 'low' | 'med' | 'high';
  project?: string;
};

const statusFromMark = (mark: string) => (mark.toLowerCase() === 'x' ? 'done' : 'todo');

export function parseTasksFromMarkdown(content: string): ParsedTask[] {
  const lines = content.split('\n');
  const tasks: ParsedTask[] = [];
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const match = line.match(/^- \[( |x)\]\s+(.*)$/i);
    if (match) {
      const status = statusFromMark(match[1]);
      const title = match[2].trim();
      const id = `line-${idx}`;
      const due = extractDue(line);
      const priority = extractPriority(line);
      const owner = extractOwner(line);
      const project = extractProject(line);
      tasks.push({ id, title, status, owner, due, priority, project });
    }
  }
  return tasks;
}

const extractDue = (line: string) => {
  const dueMatch = line.match(/(?:due[:\s]|@due\()?(\d{4}-\d{2}-\d{2})\)?/i);
  return dueMatch ? dueMatch[1] : undefined;
};

const extractPriority = (line: string) => {
  const m = line.match(/#(low|med|high)/i);
  if (!m) return undefined;
  return m[1].toLowerCase() as ParsedTask['priority'];
};

const extractOwner = (line: string) => {
  const m = line.match(/@([A-Za-z0-9_-]+)/);
  return m ? m[1] : undefined;
};

const extractProject = (line: string) => {
  const m = line.match(/\bproject:([A-Za-z0-9_-]+)/i);
  return m ? m[1] : undefined;
};

