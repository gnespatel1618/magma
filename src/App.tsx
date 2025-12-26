import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Search,
  Plus,
  GitCommit,
  UploadCloud,
  DownloadCloud,
  Sparkles,
  Settings,
  NotebookPen,
  KanbanSquare,
  Calendar,
  Table,
  Map as MapIcon,
  Link2,
  Clock3,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Trash2,
  List,
  GripVertical
} from 'lucide-react';
import { parseTasksFromMarkdown, updateTaskStatus, type ParsedTask } from './lib/taskParser';
import { extractHashtags } from './lib/tagParser';
import { getTagColor, getInlineTagColor } from './lib/tagColors';
import { buildBacklinksIndex, getBacklinks } from './lib/backlinks';
import { NoteTree } from './components/notes/NoteTree';
import { Logo } from './components/ui/Logo';
import { SettingsPage } from './components/SettingsPage';
import { BacklinksPanel } from './components/notes/BacklinksPanel';
import { Breadcrumbs } from './components/notes/Breadcrumbs';
import { StatusBar } from './components/notes/StatusBar';
import { Sidebar } from './components/Sidebar';

const LazyExcalidraw = React.lazy(async () => {
  const mod = await import('@excalidraw/excalidraw');
  return { default: mod.Excalidraw };
});

type NoteMeta = { id: string; path: string; title: string; type?: 'file' | 'folder'; children?: NoteMeta[] };

const statusTone: Record<'todo' | 'doing' | 'done', string> = {
  todo: 'bg-slate-100 text-gray-800',
  doing: 'bg-rose-light text-rose-dark',
  done: 'bg-emerald-100 text-emerald-700'
};

const priorityTone: Record<'low' | 'med' | 'high', string> = {
  low: 'bg-slate-100 text-gray-800',
  med: 'bg-amber-100 text-amber-700',
  high: 'bg-rose-100 text-rose-700'
};

const badge = (label: string, tone = 'bg-slate-100 text-gray-800') => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{label}</span>
);

function App() {
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [notes, setNotes] = useState<NoteMeta[]>([]);
  const [selectedNote, setSelectedNote] = useState<NoteMeta | null>(null);
  const [noteContent, setNoteContent] = useState<string>('');
  const [tasks, setTasks] = useState<ParsedTask[]>([]);
  const [tasksAll, setTasksAll] = useState<ParsedTask[]>([]);
  const [showCanvas, setShowCanvas] = useState(false);
  const [excalidrawApi, setExcalidrawApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const [newNoteTitle, setNewNoteTitle] = useState('Untitled note');
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<NoteMeta | null>(null);
  const [section, setSection] = useState<'dashboard' | 'notes' | 'tasks' | 'settings'>('dashboard');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [allTags, setAllTags] = useState<Set<string>>(new Set());
  const [taskSearchQuery, setTaskSearchQuery] = useState<string>('');
  const [taskFilterOwner, setTaskFilterOwner] = useState<string>('');
  const [taskFilterProject, setTaskFilterProject] = useState<string>('');
  const [taskFilterPriority, setTaskFilterPriority] = useState<'low' | 'med' | 'high' | ''>('');
  const [taskFilterStatus, setTaskFilterStatus] = useState<'todo' | 'doing' | 'done' | ''>('');
  const [taskSortBy, setTaskSortBy] = useState<'due' | 'priority' | 'owner' | 'project' | 'status' | 'title'>('due');
  const [taskSortOrder, setTaskSortOrder] = useState<'asc' | 'desc'>('asc');
  const [backlinksIndex, setBacklinksIndex] = useState<Map<string, NoteMeta[]>>(new Map());
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);
  const notesRef = useRef<NoteMeta[]>([]);
  const noteContentRef = useRef<string>('');
  const selectedNoteRef = useRef<NoteMeta | null>(null);
  const isRefreshingRef = useRef<boolean>(false);
  
  // Keep refs in sync with state (using direct assignment to avoid re-renders)
  notesRef.current = notes;
  noteContentRef.current = noteContent;
  selectedNoteRef.current = selectedNote;

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = [...tasksAll];
    
    // Apply search filter
    if (taskSearchQuery.trim()) {
      const query = taskSearchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(query) ||
        t.owner?.toLowerCase().includes(query) ||
        t.project?.toLowerCase().includes(query)
      );
    }
    
    // Apply filters
    if (taskFilterOwner) {
      filtered = filtered.filter(t => t.owner === taskFilterOwner);
    }
    if (taskFilterProject) {
      filtered = filtered.filter(t => t.project === taskFilterProject);
    }
    if (taskFilterPriority) {
      filtered = filtered.filter(t => t.priority === taskFilterPriority);
    }
    if (taskFilterStatus) {
      filtered = filtered.filter(t => t.status === taskFilterStatus);
    }
    
    // Sort tasks
    filtered.sort((a, b) => {
      let aVal: string | number | undefined;
      let bVal: string | number | undefined;
      
      switch (taskSortBy) {
        case 'due':
          aVal = a.due ? new Date(a.due).getTime() : Infinity;
          bVal = b.due ? new Date(b.due).getTime() : Infinity;
          break;
        case 'priority':
          const priorityOrder = { high: 3, med: 2, low: 1 };
          aVal = a.priority ? priorityOrder[a.priority] : 0;
          bVal = b.priority ? priorityOrder[b.priority] : 0;
          break;
        case 'owner':
          aVal = a.owner || '';
          bVal = b.owner || '';
          break;
        case 'project':
          aVal = a.project || '';
          bVal = b.project || '';
          break;
        case 'status':
          const statusOrder = { todo: 1, doing: 2, done: 3 };
          aVal = statusOrder[a.status];
          bVal = statusOrder[b.status];
          break;
        case 'title':
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return taskSortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const comparison = String(aVal).localeCompare(String(bVal));
      return taskSortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [tasksAll, taskSearchQuery, taskFilterOwner, taskFilterProject, taskFilterPriority, taskFilterStatus, taskSortBy, taskSortOrder]);

  // Get unique values for filter dropdowns
  const uniqueOwners = useMemo(() => {
    const owners = new Set(tasksAll.map(t => t.owner).filter(Boolean) as string[]);
    return Array.from(owners).sort();
  }, [tasksAll]);
  
  const uniqueProjects = useMemo(() => {
    const projects = new Set(tasksAll.map(t => t.project).filter(Boolean) as string[]);
    return Array.from(projects).sort();
  }, [tasksAll]);

  // Get tasks due soon (within next 7 days)
  const dueSoonTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    return filteredAndSortedTasks.filter(task => {
      if (!task.due) return false;
      const dueDate = new Date(task.due);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate >= today && dueDate <= nextWeek && task.status !== 'done';
    }).sort((a, b) => {
      const aDate = a.due ? new Date(a.due).getTime() : Infinity;
      const bDate = b.due ? new Date(b.due).getTime() : Infinity;
      return aDate - bDate;
    });
  }, [filteredAndSortedTasks]);

  const grouped = useMemo(
    () =>
      filteredAndSortedTasks.reduce<Record<'todo' | 'doing' | 'done', ParsedTask[]>>(
        (acc, t) => {
          acc[t.status].push(t);
          return acc;
        },
        { todo: [], doing: [], done: [] }
      ),
    [filteredAndSortedTasks]
  );

  // Cleanup timeout on unmount (must be before any conditional returns)
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Refresh tasks when switching to tasks section
  useEffect(() => {
    if (section === 'tasks' && vaultPath && notes.length > 0 && !isRefreshingRef.current) {
      console.log('Switched to Tasks section, refreshing tasks...');
      refreshAllTasks(vaultPath, notes).catch(console.error);
    }
  }, [section, vaultPath, notes.length]);

  const openVault = async () => {
    const chosen = await window.appBridge?.openVault?.();
    if (chosen) {
      setVaultPath(chosen);
      await loadNotes(chosen);
    }
  };

  const loadNotes = async (vault: string) => {
    const list = (await window.appBridge?.listNotes?.(vault)) ?? [];
    setNotes(list);
    await refreshAllTasks(vault, list);
    
    // Build backlinks index
    try {
      const index = await buildBacklinksIndex(
        list,
        async (path: string) => (await window.appBridge?.readNote?.(path)) ?? ''
      );
      setBacklinksIndex(index);
    } catch (error) {
      console.error('Error building backlinks index:', error);
    }
    
    if (list[0]) {
      await openNote(list[0]);
    } else {
      setSelectedNote(null);
      setNoteContent('');
      setTasks([]);
    }
  };

  // Helper function to recursively flatten note structure (including sub-folders)
  const flattenNotes = (items: NoteMeta[]): NoteMeta[] => {
    const result: NoteMeta[] = [];
    for (const item of items) {
      if (item.type === 'file') {
        result.push(item);
      } else if (item.type === 'folder' && item.children) {
        // Recursively process children
        result.push(...flattenNotes(item.children));
      }
    }
    return result;
  };

  const refreshAllTasks = async (vault: string, list: NoteMeta[]) => {
    // Prevent concurrent calls
    if (isRefreshingRef.current) {
      console.log('Refresh already in progress, skipping...');
      return;
    }
    isRefreshingRef.current = true;
    
    try {
      // Flatten the hierarchical structure to get all notes (including from sub-folders)
      const allNotes = flattenNotes(list);
      console.log('Starting task refresh for', allNotes.length, 'notes (from', list.length, 'top-level items)');
      
      const contents = await Promise.all(
        allNotes.map(async (note) => {
          try {
            const c = (await window.appBridge?.readNote?.(note.path)) ?? '';
            if (!c) {
              console.warn(`Empty content for note: ${note.title} (${note.path})`);
            }
            return { note, content: c };
          } catch (error) {
            console.error(`Error reading note ${note.title}:`, error);
            return { note, content: '' };
          }
        })
      );
      
      console.log('Read', contents.length, 'note contents');
      
      const parsed = contents.flatMap(({ note, content }) => {
        if (!content || content.trim().length === 0) {
          return [];
        }
        
        const tasks = parseTasksFromMarkdown(content);
        if (tasks.length > 0) {
          console.log(`✓ Found ${tasks.length} tasks in note "${note.title}":`, tasks.map(t => `"${t.title}" (${t.status})`));
        } else {
          // Debug: show sample of content if no tasks found
          const sampleLines = content.split('\n').slice(0, 5).join(' | ');
          if (content.includes('[') && content.includes(']')) {
            console.log(`  No tasks found in "${note.title}" (sample: ${sampleLines.substring(0, 100)}...)`);
          }
        }
        // Include note path and use note title as project if project not specified
        return tasks.map((t) => ({ 
          ...t, 
          notePath: note.path,
          project: t.project || note.title 
        }));
      });
      
      console.log('═══════════════════════════════════════');
      console.log('📊 TASK REFRESH SUMMARY:');
      console.log(`   Total tasks: ${parsed.length}`);
      console.log(`   From ${contents.length} notes`);
      console.log(`   Breakdown:`, {
        todo: parsed.filter(t => t.status === 'todo').length,
        doing: parsed.filter(t => t.status === 'doing').length,
        done: parsed.filter(t => t.status === 'done').length,
      });
      if (parsed.length > 0) {
        console.log('   Sample tasks:', parsed.slice(0, 3).map(t => `"${t.title}"`));
      }
      console.log('═══════════════════════════════════════');
      
      setTasksAll(parsed);
      
      // Extract all tags from all notes
      const tags = new Set<string>();
      contents.forEach(({ content }) => {
        extractHashtags(content).forEach(tag => tags.add(tag));
      });
      
      // Only update if tags actually changed (compare by converting to sorted arrays)
      setAllTags(prev => {
        const prevArray = Array.from(prev).sort();
        const newArray = Array.from(tags).sort();
        if (prevArray.length !== newArray.length || 
            prevArray.some((tag, i) => tag !== newArray[i])) {
          return tags;
        }
        return prev; // Return previous value if unchanged to avoid re-renders
      });
    } finally {
      isRefreshingRef.current = false;
    }
  };

  const openNote = async (note: NoteMeta) => {
    if (note.type === 'folder') return; // Don't open folders
    
    // Switch to notes section when opening a note
    setSection('notes');
    
    // Clear any pending auto-save when switching notes
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    setSelectedNote(note);
    const content = (await window.appBridge?.readNote?.(note.path)) ?? '';
    setNoteContent(content);
    setTasks(parseTasksFromMarkdown(content));
    isInitialLoadRef.current = true; // Mark as initial load
    setSaveStatus('idle'); // Reset save status when opening a new note
    
    // Rebuild backlinks index when opening a note (in case content changed on disk)
    if (vaultPath && notesRef.current.length > 0) {
      try {
        const index = await buildBacklinksIndex(
          notesRef.current,
          async (path: string) => (await window.appBridge?.readNote?.(path)) ?? ''
        );
        setBacklinksIndex(index);
      } catch (error) {
        console.error('Error rebuilding backlinks index when opening note:', error);
      }
    }
  };

  const createNote = async () => {
    if (!vaultPath) {
      alert('Select a vault first');
      return;
    }
    const title = newNoteTitle.trim() || 'Untitled note';
    const parentFolderPath = selectedFolder?.type === 'folder' ? selectedFolder.path : undefined;
    const res = await window.appBridge?.createNote?.(vaultPath, title, parentFolderPath);
    if (!res?.ok || !res.note) {
      alert(res?.message ?? 'Could not create note');
      return;
    }
    setShowNewNoteModal(false);
    setNewNoteTitle('Untitled note');
    await loadNotes(vaultPath);
    await openNote(res.note);
  };

  const createFolder = async () => {
    if (!vaultPath) {
      alert('Select a vault first');
      return;
    }
    const name = newFolderName.trim() || 'New folder';
    const parentFolderPath = selectedFolder?.type === 'folder' ? selectedFolder.path : undefined;
    const res = await window.appBridge?.createFolder?.(vaultPath, name, parentFolderPath);
    if (!res?.ok) {
      alert(res?.message ?? 'Could not create folder');
      return;
    }
    setShowNewFolderModal(false);
    setNewFolderName('');
    await loadNotes(vaultPath);
  };

  const deleteNote = async (note: NoteMeta) => {
    if (!vaultPath) return;
    const itemType = note.type === 'folder' ? 'folder' : 'note';
    if (!confirm(`Are you sure you want to delete this ${itemType}? This action cannot be undone.`)) {
      return;
    }
    const res = await window.appBridge?.deleteNote?.(note.path);
    if (!res?.ok) {
      alert(res?.message ?? `Could not delete ${itemType}`);
      return;
    }
    // If the deleted note was selected, clear the selection
    if (selectedNote?.id === note.id) {
      setSelectedNote(null);
      setNoteContent('');
      setTasks([]);
    }
    await loadNotes(vaultPath);
  };

  const renameNote = async (note: NoteMeta, newName: string) => {
    if (!vaultPath) return;
    if (!newName.trim()) {
      alert('Name cannot be empty');
      return;
    }
    const res = await window.appBridge?.renameNote?.(note.path, newName.trim(), vaultPath);
    if (!res?.ok) {
      alert(res?.message ?? 'Could not rename');
      return;
    }
    // If the renamed note was selected, update the selection
    if (selectedNote?.id === note.id && res.note) {
      setSelectedNote(res.note);
    }
    // If the renamed folder was selected, update the selection
    if (selectedFolder?.id === note.id && res.note) {
      setSelectedFolder(res.note);
    }
    await loadNotes(vaultPath);
  };

  const updateTaskStatusInFile = async (task: ParsedTask, newStatus: 'todo' | 'doing' | 'done') => {
    if (!task.notePath || task.lineNumber === undefined) {
      console.error('Task missing notePath or lineNumber');
      return;
    }
    
    try {
      // Read the note file
      const content = (await window.appBridge?.readNote?.(task.notePath)) ?? '';
      if (!content) {
        console.error('Could not read note file');
        return;
      }
      
      // Update the task status
      const updatedContent = updateTaskStatus(content, task, newStatus);
      
      // Write back to file
      await window.appBridge?.writeNote?.(task.notePath, updatedContent);
      
      // Refresh tasks
      if (vaultPath) {
        await refreshAllTasks(vaultPath, notes);
      }
      
      // If this note is currently open, update its content
      if (selectedNote?.path === task.notePath) {
        setNoteContent(updatedContent);
        setTasks(parseTasksFromMarkdown(updatedContent));
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Failed to update task status');
    }
  };

  const isLanding = !vaultPath;

  if (isLanding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-900 text-slate-100">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center gap-2 rounded-full bg-rose-brand/20 px-3 py-1.5 text-rose-light border border-rose-brand/40">
              <Logo size={18} />
              Magma
            </div>
            <span className="text-sm text-slate-300">Obsidian-friendly vaults</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-8 items-center">
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold text-slate-50 tracking-tight">Welcome back to your vaults</h1>
              <p className="text-slate-300 text-lg leading-relaxed">
                Open any Obsidian-style folder with Markdown notes. Tasks, canvases, and Git snapshots are ready to go.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={openVault}
                  className="inline-flex items-center gap-2 rounded-lg bg-rose-brand px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-brand/40 hover:opacity-90 transition-opacity"
                >
                  <Plus size={16} />
                  Open vault
                </button>
                <a
                  href="https://obsidian.md/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800"
                >
                  Learn more
                </a>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LandingCard title="Markdown-first" body="Edit real .md files; frontmatter and tasks stay intact." />
                <LandingCard title="Backlinks & tasks" body="Notes feed Kanban/Table views; canvases save per note." />
                <LandingCard title="Git built-in" body="Snapshot, push, and pull directly inside your vault." />
                <LandingCard title="Canvas ready" body="Attach Excalidraw canvases alongside your notes." />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur p-6 shadow-2xl shadow-black/30">
              <div className="text-sm text-slate-300 mb-3 font-semibold">Quick start</div>
              <ol className="space-y-3 text-sm text-slate-200">
                <li className="flex gap-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-brand text-white text-xs font-bold">1</span>
                  <div>
                    <p className="font-semibold text-slate-100">Open vault</p>
                    <p className="text-slate-400">Select any folder with Markdown files.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-brand text-white text-xs font-bold">2</span>
                  <div>
                    <p className="font-semibold text-slate-100">Pick a note</p>
                    <p className="text-slate-400">Edit and save; tasks auto-sync to Kanban/Table.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 text-white text-xs font-bold">3</span>
                  <div>
                    <p className="font-semibold text-slate-100">Snapshot to Git</p>
                    <p className="text-slate-400">Use Snapshot/Push/Pull to keep history in the vault.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 text-white text-xs font-bold">4</span>
                  <div>
                    <p className="font-semibold text-slate-100">Attach a canvas</p>
                    <p className="text-slate-400">Save Excalidraw JSON next to the note.</p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const saveNote = async (silent = false, skipFullRefresh = false) => {
    const currentNote = selectedNoteRef.current;
    const currentContent = noteContentRef.current;
    const currentVaultPath = vaultPath;
    
    if (!currentNote) return;
    setSaveStatus('saving');
    try {
      await window.appBridge?.writeNote?.(currentNote.path, currentContent);
      setTasks(parseTasksFromMarkdown(currentContent));
      
      // Rebuild backlinks index when note is saved
      if (currentVaultPath && notesRef.current.length > 0) {
        try {
          const index = await buildBacklinksIndex(
            notesRef.current,
            async (path: string) => {
              // Use current content if it's the note being saved
              if (path === currentNote.path) {
                return currentContent;
              }
              return (await window.appBridge?.readNote?.(path)) ?? '';
            }
          );
          setBacklinksIndex(index);
        } catch (error) {
          console.error('Error rebuilding backlinks index:', error);
        }
      }
      
      // Only update tags and do full refresh on manual save (not auto-save)
      // This prevents state update loops during auto-save
      if (!skipFullRefresh && currentVaultPath && !isRefreshingRef.current) {
        // Defer to avoid blocking and potential state update loops
        setTimeout(() => {
          refreshAllTasks(currentVaultPath, notesRef.current).catch(console.error);
        }, 500);
      }
      
      setSaveStatus('saved');
      if (!silent) {
        // Show saved indicator briefly
        setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      } else {
        // For auto-save, show saved briefly then go to idle
        setTimeout(() => {
          setSaveStatus('idle');
        }, 1500);
      }
    } catch (error) {
      setSaveStatus('idle');
      if (!silent) {
        alert('Failed to save note');
      }
    }
  };

  // Auto-save with debouncing (like Obsidian - saves 2 seconds after user stops typing)
  const handleNoteContentChange = (next: string) => {
    setNoteContent(next);
    setTasks(parseTasksFromMarkdown(next));
    
    // Skip auto-save on initial load
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    // Set new timeout for auto-save (2 seconds after user stops typing)
    if (selectedNoteRef.current) {
      saveTimeoutRef.current = setTimeout(() => {
        // Use refs to get current values to avoid closure issues
        const note = selectedNoteRef.current;
        const content = noteContentRef.current;
        const vault = vaultPath;
        
        if (note && vault && content !== undefined) {
          // Direct save without going through saveNote to avoid state update loops
          window.appBridge?.writeNote?.(note.path, content)
            .then(async () => {
              // Update save status briefly to show autosave happened
              setSaveStatus('saved');
              setTimeout(() => {
                setSaveStatus('idle');
              }, 1500);
              
              // Rebuild backlinks index after autosave
              const currentNotes = notesRef.current;
              if (currentNotes.length > 0) {
                try {
                  const index = await buildBacklinksIndex(
                    currentNotes,
                    async (path: string) => {
                      // Use current content if it's the note being saved
                      if (path === note.path) {
                        return content;
                      }
                      return (await window.appBridge?.readNote?.(path)) ?? '';
                    }
                  );
                  setBacklinksIndex(index);
                } catch (error) {
                  console.error('Error rebuilding backlinks index after autosave:', error);
                }
              }
              
              // Refresh all tasks in the dashboard after autosave
              // Use a small delay to ensure file is written and to avoid blocking
              setTimeout(() => {
                // Use the current notes list from state to ensure we have all notes
                if (currentNotes.length > 0 && !isRefreshingRef.current) {
                  refreshAllTasks(vault, currentNotes).catch((err) => {
                    console.error('Failed to refresh tasks after autosave:', err);
                  });
                }
              }, 1000); // Increased delay to ensure file write is complete
            })
            .catch((error) => {
              console.error('Auto-save failed:', error);
              setSaveStatus('idle');
            });
        }
      }, 2000); // 2 second debounce delay
    }
  };

  const gitAction = async (action: 'snapshot' | 'push' | 'pull') => {
    if (!vaultPath) return alert('Select a vault first');
    const res = await window.appBridge?.gitAction?.(vaultPath, action);
    alert(res?.message ?? `${action} done`);
  };

  const toggleTaskAtLine = (lineNumber?: number) => {
    if (!lineNumber) return;
    const lines = noteContent.split('\n');
    const idx = lineNumber - 1;
    if (idx < 0 || idx >= lines.length) return;
    const line = lines[idx];
    const match = line.match(/^(\s*-\s*\[)( |x)(\]\s.*)$/i);
    if (!match) return;
    const toggled = `${match[1]}${match[2].toLowerCase() === 'x' ? ' ' : 'x'}${match[3]}`;
    lines[idx] = toggled;
    const next = lines.join('\n');
    setNoteContent(next);
    setTasks(parseTasksFromMarkdown(next));
  };

  return (
    <div className="h-screen bg-slate-50 text-slate-900 flex flex-col overflow-hidden">
      <div className="grid grid-rows-[64px_1fr_24px] grid-cols-[280px_1fr_256px] h-screen gap-px bg-slate-200">
        <header className="col-span-3 flex items-center justify-between px-4 py-3 bg-white shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-rose-light px-3 py-1.5 text-rose-dark font-semibold">
              <Logo size={18} />
              Magma
            </div>
            <div className="hidden md:flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm w-72">
              <Search size={16} className="text-slate-500" />
              <input className="w-full text-sm outline-none" placeholder="Search notes, tasks, projects" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => gitAction('snapshot')} className="inline-flex items-center gap-2 rounded-lg bg-rose-brand px-3 py-2 text-sm font-semibold text-white shadow-soft hover:opacity-90 transition-opacity">
              <GitCommit size={16} /> Snapshot
            </button>
            <button onClick={() => gitAction('push')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-slate-50 transition-colors">
              <UploadCloud size={16} /> Push
            </button>
            <button onClick={() => gitAction('pull')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-slate-50 transition-colors">
              <DownloadCloud size={16} /> Pull
            </button>
            <button onClick={() => alert('AI summary stub')} className="inline-flex items-center gap-2 rounded-lg border border-rose-light bg-rose-light px-3 py-2 text-sm font-semibold text-rose-dark hover:bg-rose-light/80 transition-colors">
              <Sparkles size={16} /> AI
            </button>
            <button 
              onClick={() => setSection('settings')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-slate-50 transition-colors"
            >
              <Settings size={16} />
            </button>
          </div>
        </header>

        <Sidebar 
          vaultPath={vaultPath}
          currentSection={section}
          onOpenVault={openVault}
          onSectionChange={setSection}
        >
          {/* Note Tree in Sidebar - Always visible */}
          {vaultPath && (
            <div className="px-2 py-2">
              <div className="mb-2 flex items-center justify-between px-2">
                <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Notes</h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowNewFolderModal(true)}
                    className="p-1 rounded hover:bg-slate-200 transition-colors"
                    title="New folder"
                  >
                    <Folder size={12} />
                  </button>
                  <button
                    onClick={() => setShowNewNoteModal(true)}
                    className="p-1 rounded hover:bg-slate-200 transition-colors"
                    title="New note"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
              {selectedFolder && (
                <div className="mx-2 mb-2 flex items-center justify-between px-2 py-1 rounded bg-rose-light border border-rose-light text-xs">
                  <div className="flex items-center gap-1 text-rose-dark">
                    <FolderOpen size={10} />
                    <span className="truncate">Creating in: {selectedFolder.title}</span>
                  </div>
                  <button
                    onClick={() => setSelectedFolder(null)}
                    className="text-rose-brand hover:text-rose-dark font-semibold"
                    title="Deselect folder"
                  >
                    ×
                  </button>
                </div>
              )}
              <NoteTree 
                items={notes} 
                selectedNote={selectedNote} 
                selectedFolder={selectedFolder}
                onSelect={openNote} 
                onSelectFolder={setSelectedFolder}
                onDelete={deleteNote}
                onRename={renameNote}
              />
            </div>
          )}
        </Sidebar>

        <main className="row-start-2 col-start-2 bg-slate-50 overflow-hidden">
          {section === 'dashboard' && (
            <div className="h-full overflow-y-auto px-5 py-5 space-y-2">
              {/* Filter and Search Controls */}
              <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-soft space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <Search size={14} /> Filter & Search Tasks
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={taskSearchQuery}
                    onChange={(e) => setTaskSearchQuery(e.target.value)}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 outline-none focus:border-rose-brand focus:ring-2 focus:ring-rose-light"
                  />
                  <select
                    value={taskFilterOwner}
                    onChange={(e) => setTaskFilterOwner(e.target.value)}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 outline-none focus:border-rose-brand focus:ring-2 focus:ring-rose-light"
                  >
                    <option value="">All Owners</option>
                    {uniqueOwners.map(owner => (
                      <option key={owner} value={owner}>{owner}</option>
                    ))}
                  </select>
                  <select
                    value={taskFilterProject}
                    onChange={(e) => setTaskFilterProject(e.target.value)}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 outline-none focus:border-rose-brand focus:ring-2 focus:ring-rose-light"
                  >
                    <option value="">All Projects</option>
                    {uniqueProjects.map(project => (
                      <option key={project} value={project}>{project}</option>
                    ))}
                  </select>
                  <select
                    value={taskFilterPriority}
                    onChange={(e) => setTaskFilterPriority(e.target.value as 'low' | 'med' | 'high' | '')}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 outline-none focus:border-rose-brand focus:ring-2 focus:ring-rose-light"
                  >
                    <option value="">All Priorities</option>
                    <option value="high">High</option>
                    <option value="med">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={taskFilterStatus}
                    onChange={(e) => setTaskFilterStatus(e.target.value as 'todo' | 'doing' | 'done' | '')}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 outline-none focus:border-rose-brand focus:ring-2 focus:ring-rose-light"
                  >
                    <option value="">All Statuses</option>
                    <option value="todo">Todo</option>
                    <option value="doing">Doing</option>
                    <option value="done">Done</option>
                  </select>
                  <select
                    value={taskSortBy}
                    onChange={(e) => setTaskSortBy(e.target.value as typeof taskSortBy)}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 outline-none focus:border-rose-brand focus:ring-2 focus:ring-rose-light"
                  >
                    <option value="due">Sort by Due Date</option>
                    <option value="priority">Sort by Priority</option>
                    <option value="status">Sort by Status</option>
                    <option value="owner">Sort by Owner</option>
                    <option value="project">Sort by Project</option>
                    <option value="title">Sort by Title</option>
                  </select>
                  <button
                    onClick={() => setTaskSortOrder(taskSortOrder === 'asc' ? 'desc' : 'asc')}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-gray-800 hover:bg-slate-50 transition-colors"
                    title="Toggle sort order"
                  >
                    {taskSortOrder === 'asc' ? '↑' : '↓'} {taskSortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  </button>
                  {(taskSearchQuery || taskFilterOwner || taskFilterProject || taskFilterPriority || taskFilterStatus) && (
                    <button
                      onClick={() => {
                        setTaskSearchQuery('');
                        setTaskFilterOwner('');
                        setTaskFilterProject('');
                        setTaskFilterPriority('');
                        setTaskFilterStatus('');
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-gray-800 hover:bg-slate-50 transition-colors"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  Showing {filteredAndSortedTasks.length} of {tasksAll.length} tasks
                </div>
              </div>

              {/* Due Soon Cards */}
              {dueSoonTasks.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-soft">
                  <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs mb-1.5">
                    <Clock3 size={14} /> Due Soon (Next 7 Days)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {dueSoonTasks.slice(0, 6).map((task) => (
                      <div
                        key={task.id}
                        onClick={() => {
                          const nextStatus = task.status === 'todo' ? 'doing' : task.status === 'doing' ? 'done' : 'todo';
                          updateTaskStatusInFile(task, nextStatus);
                        }}
                        className="rounded-lg border border-amber-200 bg-amber-50 p-1.5 shadow-sm space-y-1 cursor-pointer hover:bg-amber-100 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-slate-900 text-xs truncate">{task.title}</p>
                          {task.priority && badge(task.priority, priorityTone[task.priority])}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-800">
                          {task.owner && <span>@{task.owner}</span>}
                          {task.project && (
                            <>
                              <span>•</span>
                              <span>{task.project}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {badge(task.status, statusTone[task.status])}
                          <div className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-100 rounded-full px-1.5 py-0.5">
                            <Clock3 size={10} /> {task.due}
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 italic">Click to change status</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                    <KanbanSquare size={16} /> Kanban
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-emerald-700"><CheckCircle2 size={12} /> Done</div>
                    <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-amber-700"><Clock3 size={12} /> Due soon</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {(['todo', 'doing', 'done'] as Array<'todo' | 'doing' | 'done'>).map((col) => (
                    <div key={col} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase text-gray-800">{col}</span>
                        <span className="text-xs text-slate-500">{grouped[col].length}</span>
                      </div>
                      {grouped[col].map((task) => (
                        <div
                          key={task.id}
                          onClick={() => {
                            const nextStatus = task.status === 'todo' ? 'doing' : task.status === 'doing' ? 'done' : 'todo';
                            updateTaskStatusInFile(task, nextStatus);
                          }}
                          className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm space-y-2 cursor-pointer hover:bg-slate-50 transition-colors"
                          title="Click to change status"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-slate-900">{task.title}</p>
                            {task.priority && badge(task.priority, priorityTone[task.priority])}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            {task.owner && <span>@{task.owner}</span>}
                            {task.project && (
                              <>
                                <span>•</span>
                                <span>{task.project}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {badge(task.status, statusTone[task.status])}
                            {task.due && <div className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 rounded-full px-2 py-1"><Clock3 size={12} /> {task.due}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Table size={16} /> Table view</div>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50 text-gray-800">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">Task</th>
                          <th className="px-3 py-2 text-left font-semibold">Status</th>
                          <th className="px-3 py-2 text-left font-semibold">Owner</th>
                          <th className="px-3 py-2 text-left font-semibold">Due</th>
                          <th className="px-3 py-2 text-left font-semibold">Priority</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAndSortedTasks.map((t) => (
                          <tr
                            key={t.id}
                            onClick={() => {
                              const nextStatus = t.status === 'todo' ? 'doing' : t.status === 'doing' ? 'done' : 'todo';
                              updateTaskStatusInFile(t, nextStatus);
                            }}
                            className="bg-white hover:bg-slate-50 cursor-pointer transition-colors"
                            title="Click to change status"
                          >
                            <td className="px-3 py-2 font-semibold text-slate-900">{t.title}</td>
                            <td className="px-3 py-2">{badge(t.status, statusTone[t.status])}</td>
                            <td className="px-3 py-2 text-gray-800">{t.owner ?? '—'}</td>
                            <td className="px-3 py-2 text-gray-800">{t.due ?? '—'}</td>
                            <td className="px-3 py-2">{t.priority ? badge(t.priority, priorityTone[t.priority]) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><MapIcon size={16} /> Mindmap (auto)</div>
                  <div className="flex flex-wrap gap-2">
                    {notes.map((n) => (
                      <div key={n.id} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-800 shadow-sm">
                        {n.title}
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-gray-800">
                    Auto-generated from headings/backlinks. Edits in mindmap will sync back to linked notes/tasks (stubbed).
                  </div>
                </div>
              </div>

              {/* Tags section */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Link2 size={16} /> Tags
                </div>
                {allTags.size > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {Array.from(allTags).map(tag => {
                      const colors = getTagColor(tag);
                      return (
                        <span
                          key={tag}
                          className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${colors.bg} ${colors.text} ${colors.border} ${colors.hover} cursor-pointer transition-colors`}
                          title={`Click to filter notes with #${tag}`}
                        >
                          #{tag}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 italic">
                    No tags yet. Add tags to your notes using #hashtag syntax.
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Settings size={16} /> Settings (Git, sync, AI)</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <LabeledInput label="Git remote URL" placeholder="https://github.com/org/repo.git" />
                  <LabeledInput label="Ignore patterns" placeholder="*.png, *.mp4, dist/" />
                  <LabeledInput label="Autosync cadence (minutes)" placeholder="30" />
                  <LabeledInput label="OpenAI API key" placeholder="sk-..." />
                </div>
                <div className="flex justify-end">
                  <button className="inline-flex items-center gap-2 rounded-lg bg-rose-brand px-3 py-2 text-sm font-semibold text-white shadow-soft hover:opacity-90 transition-opacity">
                    Save settings
                  </button>
                </div>
              </div>
            </div>
          )}

          {section === 'notes' && (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Note Editor Area */}
              <div className="flex-1 flex flex-col bg-white border border-slate-200 overflow-hidden">
                {selectedNote ? (
                  <>
                    {/* Breadcrumbs */}
                    <div className="px-4 pt-3 pb-2 border-b border-slate-200">
                      <Breadcrumbs selectedNote={selectedNote} notes={notes} />
                    </div>
                    
                    {/* Note Header */}
                    <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <NotebookPen size={16} /> {selectedNote.title}
                      </div>
                      <div className="flex items-center gap-3">
                        {saveStatus === 'saving' && (
                          <span className="text-xs text-slate-500 flex items-center gap-1.5">
                            <RefreshCw size={12} className="animate-spin" />
                            Saving...
                          </span>
                        )}
                        {saveStatus === 'saved' && (
                          <span className="text-xs text-emerald-600 flex items-center gap-1.5">
                            <CheckCircle2 size={12} />
                            Saved
                          </span>
                        )}
                        <button onClick={() => saveNote(false)} className="inline-flex items-center gap-2 rounded-lg bg-rose-brand px-3 py-2 text-sm font-semibold text-white shadow-soft hover:opacity-90 transition-opacity">
                          Save note
                        </button>
                      </div>
                    </div>
                    
                    {/* Tags */}
                    {(() => {
                      const currentTags = extractHashtags(noteContent);
                      return currentTags.length > 0 && (
                        <div className="px-4 py-2 border-b border-slate-200 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-gray-800">Tags:</span>
                          {currentTags.map(tag => {
                            const colors = getTagColor(tag);
                            return (
                              <span
                                key={tag}
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${colors.bg} ${colors.text} ${colors.border}`}
                              >
                                #{tag}
                              </span>
                            );
                          })}
                        </div>
                      );
                    })()}
                    
                    {/* Editor */}
                    <div className="flex-1 overflow-y-auto">
                      <LivePreviewEditor
                        value={noteContent}
                        onChange={handleNoteContentChange}
                        vaultPath={vaultPath}
                        selectedNote={selectedNote}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-slate-500 text-sm">Select a note to start editing.</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {section === 'settings' && (
            <div className="h-full overflow-y-auto px-5 py-5">
              <SettingsPage />
            </div>
          )}
          {section === 'tasks' && (
            <div className="h-full overflow-y-auto px-5 py-5 space-y-4">
              {/* Filter and Search Controls */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Search size={16} /> Filter & Search Tasks
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">Total: {tasksAll.length} | Showing: {filteredAndSortedTasks.length}</span>
                    {vaultPath && (
                      <button
                        onClick={() => {
                          if (vaultPath && notes.length > 0) {
                            refreshAllTasks(vaultPath, notes).catch(console.error);
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-800 hover:bg-slate-50 transition-colors"
                        title="Refresh tasks"
                      >
                        <RefreshCw size={14} /> Refresh
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={taskSearchQuery}
                    onChange={(e) => setTaskSearchQuery(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-rose-brand focus:ring-2 focus:ring-rose-light"
                  />
                  <select
                    value={taskFilterOwner}
                    onChange={(e) => setTaskFilterOwner(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-rose-brand focus:ring-2 focus:ring-rose-light"
                  >
                    <option value="">All Owners</option>
                    {uniqueOwners.map(owner => (
                      <option key={owner} value={owner}>{owner}</option>
                    ))}
                  </select>
                  <select
                    value={taskFilterProject}
                    onChange={(e) => setTaskFilterProject(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-rose-brand focus:ring-2 focus:ring-rose-light"
                  >
                    <option value="">All Projects</option>
                    {uniqueProjects.map(project => (
                      <option key={project} value={project}>{project}</option>
                    ))}
                  </select>
                  <select
                    value={taskFilterPriority}
                    onChange={(e) => setTaskFilterPriority(e.target.value as 'low' | 'med' | 'high' | '')}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-rose-brand focus:ring-2 focus:ring-rose-light"
                  >
                    <option value="">All Priorities</option>
                    <option value="high">High</option>
                    <option value="med">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={taskFilterStatus}
                    onChange={(e) => setTaskFilterStatus(e.target.value as 'todo' | 'doing' | 'done' | '')}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-rose-brand focus:ring-2 focus:ring-rose-light"
                  >
                    <option value="">All Statuses</option>
                    <option value="todo">Todo</option>
                    <option value="doing">Doing</option>
                    <option value="done">Done</option>
                  </select>
                  <select
                    value={taskSortBy}
                    onChange={(e) => setTaskSortBy(e.target.value as typeof taskSortBy)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-rose-brand focus:ring-2 focus:ring-rose-light"
                  >
                    <option value="due">Sort by Due Date</option>
                    <option value="priority">Sort by Priority</option>
                    <option value="status">Sort by Status</option>
                    <option value="owner">Sort by Owner</option>
                    <option value="project">Sort by Project</option>
                    <option value="title">Sort by Title</option>
                  </select>
                  <button
                    onClick={() => setTaskSortOrder(taskSortOrder === 'asc' ? 'desc' : 'asc')}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-slate-50 transition-colors"
                    title="Toggle sort order"
                  >
                    {taskSortOrder === 'asc' ? '↑' : '↓'} {taskSortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  </button>
                  {(taskSearchQuery || taskFilterOwner || taskFilterProject || taskFilterPriority || taskFilterStatus) && (
                    <button
                      onClick={() => {
                        setTaskSearchQuery('');
                        setTaskFilterOwner('');
                        setTaskFilterProject('');
                        setTaskFilterPriority('');
                        setTaskFilterStatus('');
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-slate-50 transition-colors"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Due Soon Cards */}
              {dueSoonTasks.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-soft">
                  <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs mb-1.5">
                    <Clock3 size={14} /> Due Soon (Next 7 Days)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {dueSoonTasks.slice(0, 6).map((task) => (
                      <div
                        key={task.id}
                        onClick={() => {
                          const nextStatus = task.status === 'todo' ? 'doing' : task.status === 'doing' ? 'done' : 'todo';
                          updateTaskStatusInFile(task, nextStatus);
                        }}
                        className="rounded-lg border border-amber-200 bg-amber-50 p-1.5 shadow-sm space-y-1 cursor-pointer hover:bg-amber-100 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-slate-900 text-xs truncate">{task.title}</p>
                          {task.priority && badge(task.priority, priorityTone[task.priority])}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-800">
                          {task.owner && <span>@{task.owner}</span>}
                          {task.project && (
                            <>
                              <span>•</span>
                              <span>{task.project}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {badge(task.status, statusTone[task.status])}
                          <div className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-100 rounded-full px-1.5 py-0.5">
                            <Clock3 size={10} /> {task.due}
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 italic">Click to change status</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                    <List size={16} /> All Tasks
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-emerald-700"><CheckCircle2 size={12} /> Done</div>
                    <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-amber-700"><Clock3 size={12} /> Due soon</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {(['todo', 'doing', 'done'] as Array<'todo' | 'doing' | 'done'>).map((col) => (
                    <div key={col} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase text-gray-800">{col}</span>
                        <span className="text-xs text-slate-500">{grouped[col].length}</span>
                      </div>
                      {grouped[col].length === 0 ? (
                        <div className="text-xs text-slate-400 italic py-4 text-center">No tasks</div>
                      ) : (
                        grouped[col].map((task) => (
                          <div
                            key={task.id}
                            onClick={() => {
                              const nextStatus = task.status === 'todo' ? 'doing' : task.status === 'doing' ? 'done' : 'todo';
                              updateTaskStatusInFile(task, nextStatus);
                            }}
                            className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm space-y-2 cursor-pointer hover:bg-slate-50 transition-colors"
                            title="Click to change status"
                          >
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-slate-900 text-sm">{task.title}</p>
                              {task.priority && badge(task.priority, priorityTone[task.priority])}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              {task.owner && <span>@{task.owner}</span>}
                              {task.project && (
                                <>
                                  <span>•</span>
                                  <span>{task.project}</span>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {badge(task.status, statusTone[task.status])}
                              {task.due && <div className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 rounded-full px-2 py-1"><Clock3 size={12} /> {task.due}</div>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Table size={16} /> Table view</div>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-gray-800">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Task</th>
                        <th className="px-3 py-2 text-left font-semibold">Status</th>
                        <th className="px-3 py-2 text-left font-semibold">Owner</th>
                        <th className="px-3 py-2 text-left font-semibold">Project</th>
                        <th className="px-3 py-2 text-left font-semibold">Due</th>
                        <th className="px-3 py-2 text-left font-semibold">Priority</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAndSortedTasks.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-8 text-center text-slate-500 italic">
                            {tasksAll.length === 0 
                              ? 'No tasks found. Create tasks in your notes using - [ ] Task name'
                              : 'No tasks match your filters. Try adjusting your search or filters.'}
                          </td>
                        </tr>
                      ) : (
                        filteredAndSortedTasks.map((t) => (
                          <tr
                            key={t.id}
                            onClick={() => {
                              const nextStatus = t.status === 'todo' ? 'doing' : t.status === 'doing' ? 'done' : 'todo';
                              updateTaskStatusInFile(t, nextStatus);
                            }}
                            className="bg-white hover:bg-slate-50 cursor-pointer transition-colors"
                            title="Click to change status"
                          >
                            <td className="px-3 py-2 font-semibold text-slate-900">{t.title}</td>
                            <td className="px-3 py-2">{badge(t.status, statusTone[t.status])}</td>
                            <td className="px-3 py-2 text-gray-800">{t.owner ?? '—'}</td>
                            <td className="px-3 py-2 text-gray-800">{t.project ?? '—'}</td>
                            <td className="px-3 py-2 text-gray-800">{t.due ?? '—'}</td>
                            <td className="px-3 py-2">{t.priority ? badge(t.priority, priorityTone[t.priority]) : '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Backlinks Panel - Only visible in notes section */}
        {section === 'notes' && (
          <div className="row-start-2 col-start-3 h-full overflow-hidden">
            <BacklinksPanel 
              selectedNote={selectedNote}
              allNotes={notes}
              noteContent={noteContent}
              backlinksIndex={backlinksIndex}
              onNoteClick={openNote}
            />
          </div>
        )}

        {/* Status Bar - Only visible in notes section */}
        {section === 'notes' && (
          <div className="row-start-3 col-start-2 col-span-2">
            <StatusBar 
              noteContent={noteContent}
              backlinksCount={selectedNote ? getBacklinks(selectedNote, backlinksIndex).length : 0}
            />
          </div>
        )}
      </div>

      {showNewNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-lg border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">New note</h3>
            <input
              autoFocus
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              placeholder="Title"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-800 hover:bg-slate-50 transition-colors"
                onClick={() => {
                  setShowNewNoteModal(false);
                  setNewNoteTitle('Untitled note');
                }}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-rose-brand px-3 py-1.5 text-sm font-semibold text-white shadow-soft hover:opacity-90 transition-opacity"
                onClick={createNote}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-lg border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">New folder</h3>
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  createFolder();
                }
              }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              placeholder="Folder name"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-800 hover:bg-slate-50 transition-colors"
                onClick={() => {
                  setShowNewFolderModal(false);
                  setNewFolderName('');
                }}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-rose-brand px-3 py-1.5 text-sm font-semibold text-white shadow-soft hover:opacity-90 transition-opacity"
                onClick={createFolder}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


const TagPill = ({ label, tone = 'bg-slate-50 text-gray-800 border-slate-200' }: { label: string; tone?: string }) => (
  <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>{label}</div>
);

const LabeledInput = ({ label, placeholder }: { label: string; placeholder?: string }) => (
  <label className="flex flex-col gap-1 text-sm text-gray-800">
    <span className="text-xs font-semibold text-gray-800">{label}</span>
    <input
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      placeholder={placeholder}
    />
  </label>
);

const LandingCard = ({ title, body }: { title: string; body: string }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-200 shadow-lg shadow-black/20">
    <p className="font-semibold text-slate-50 mb-1">{title}</p>
    <p className="text-slate-400 leading-relaxed">{body}</p>
  </div>
);

const renderInlineMarkdown = (text: string): React.ReactNode => {
  const parts: React.ReactNode[] = [];
  let key = 0;
  let remaining = text;
  let inCode = false;

  while (remaining.length > 0) {
    // Inline code `code` - check this first to avoid processing inside code
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      parts.push(
        <code key={key++} className="bg-slate-100 px-1 py-0.5 rounded text-sm font-mono text-slate-800">
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // If we're inside backticks (but not a complete match), skip
    if (remaining.startsWith('`')) {
      parts.push(<span key={key++}>{remaining[0]}</span>);
      remaining = remaining.slice(1);
      continue;
    }

    // Hashtag #tag (only if not in code)
    const hashtagMatch = remaining.match(/^#([a-zA-Z0-9_-]+)/);
    if (hashtagMatch) {
      const tagName = hashtagMatch[1];
      const tagColor = getInlineTagColor(tagName);
      parts.push(
        <span key={key++} className={`${tagColor} font-semibold`}>
          #{tagName}
        </span>
      );
      remaining = remaining.slice(hashtagMatch[0].length);
      continue;
    }

    // Wikilink tag [[tag]] or [[tag with spaces]] (only if not in code)
    const wikilinkTagMatch = remaining.match(/^\[\[([^\]|]+?)\]\]/);
    if (wikilinkTagMatch) {
      const tagName = wikilinkTagMatch[1].split('|')[0].trim(); // Handle aliases like [[tag|alias]]
      const normalizedTagName = tagName.toLowerCase().replace(/\s+/g, '-');
      const tagColor = getInlineTagColor(normalizedTagName);
      parts.push(
        <span key={key++} className={`${tagColor} font-semibold`}>
          [[{tagName}]]
        </span>
      );
      remaining = remaining.slice(wikilinkTagMatch[0].length);
      continue;
    }

    // Bold **text**
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      parts.push(<strong key={key++} className="font-semibold text-slate-900">{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic *text* or _text_
    const italicMatch = remaining.match(/^[*_](.+?)[*_]/);
    if (italicMatch) {
      parts.push(<em key={key++} className="italic text-gray-800">{italicMatch[1]}</em>);
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Regular text (take one character)
    parts.push(<span key={key++}>{remaining[0]}</span>);
    remaining = remaining.slice(1);
  }

  return <>{parts}</>;
};

// Command menu types
type CommandType = {
  id: string;
  label: string;
  icon: React.ReactNode;
  insert: (indent: string) => string;
  description: string;
};

const LivePreviewEditor = ({ 
  value, 
  onChange, 
  vaultPath, 
  selectedNote 
}: { 
  value: string; 
  onChange: (next: string) => void;
  vaultPath: string | null;
  selectedNote: NoteMeta | null;
}) => {
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [lines, setLines] = useState<string[]>(() => value.split('\n'));
  const [collapsedLines, setCollapsedLines] = useState<Set<number>>(new Set());
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [commandMenuIndex, setCommandMenuIndex] = useState(0);
  const [commandMenuPosition, setCommandMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [commandFilter, setCommandFilter] = useState('');
  const [draggedLineIndex, setDraggedLineIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previousValueRef = useRef<string>(value);
  const previousLinesRef = useRef<string>('');
  const isInternalUpdateRef = useRef<boolean>(false);
  
  // Command menu options
  const commands: CommandType[] = [
    {
      id: 'h1',
      label: 'Heading 1',
      icon: <span className="text-lg font-bold">H1</span>,
      insert: (indent) => `${indent}# `,
      description: 'Large heading'
    },
    {
      id: 'h2',
      label: 'Heading 2',
      icon: <span className="text-base font-bold">H2</span>,
      insert: (indent) => `${indent}## `,
      description: 'Medium heading'
    },
    {
      id: 'h3',
      label: 'Heading 3',
      icon: <span className="text-sm font-bold">H3</span>,
      insert: (indent) => `${indent}### `,
      description: 'Small heading'
    },
    {
      id: 'todo',
      label: 'To-do',
      icon: <span className="text-base">☐</span>,
      insert: (indent) => `${indent}- [ ] `,
      description: 'Task checkbox'
    },
    {
      id: 'bullet',
      label: 'Bullet list',
      icon: <span className="text-base">•</span>,
      insert: (indent) => `${indent}- `,
      description: 'Unordered list'
    },
    {
      id: 'numbered',
      label: 'Numbered list',
      icon: <span className="text-base">1.</span>,
      insert: (indent) => `${indent}1. `,
      description: 'Ordered list'
    },
    {
      id: 'toggle',
      label: 'Toggle list',
      icon: <span className="text-base">▼</span>,
      insert: (indent) => `${indent}- `,
      description: 'Collapsible list'
    },
    {
      id: 'quote',
      label: 'Quote',
      icon: <span className="text-base">"</span>,
      insert: (indent) => `${indent}> `,
      description: 'Blockquote'
    },
    {
      id: 'code',
      label: 'Code block',
      icon: <span className="text-base">{'</>'}</span>,
      insert: (indent) => `${indent}\`\`\`\n${indent}`,
      description: 'Code snippet'
    },
    {
      id: 'divider',
      label: 'Divider',
      icon: <span className="text-base">---</span>,
      insert: (indent) => `${indent}---`,
      description: 'Horizontal rule'
    },
    {
      id: 'image',
      label: 'Insert Image/Media',
      icon: <span className="text-base">🖼️</span>,
      insert: (indent) => `${indent}![alt text](path/to/image.png)`,
      description: 'Insert image, video, or audio file'
    }
  ];

  // Sync lines when value changes externally (but not from our own updates)
  useEffect(() => {
    // Skip if this update came from our own onChange
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      previousValueRef.current = value; // Update ref to match
      previousLinesRef.current = lines.join('\n'); // Update lines ref
      return;
    }
    
    // Only update if value actually changed
    if (previousValueRef.current !== value) {
      previousValueRef.current = value;
      const newLines = value.split('\n');
      const newLinesStr = newLines.join('\n');
      
      // Only update if lines actually changed (compare with ref, not state)
      if (previousLinesRef.current !== newLinesStr) {
        previousLinesRef.current = newLinesStr;
        setLines(newLines);
        // Reset collapsed lines when content changes externally
        setCollapsedLines(new Set());
        // If no active line, keep it null; otherwise maintain active line if still valid
        // Use functional update to avoid dependency on activeLineIndex
        setActiveLineIndex(prev => {
          if (prev !== null && prev >= newLines.length) {
            return null;
          }
          return prev;
        });
      }
    }
  }, [value]); // Only depend on value

  // Focus input when active line changes
  useEffect(() => {
    if (activeLineIndex !== null && inputRef.current) {
      inputRef.current.focus();
      // Place cursor at end
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, [activeLineIndex]);

  // Helper function to handle file uploads
  const handleFileUpload = async (filePaths: string[]) => {
    if (!vaultPath) {
      alert('Please open a vault first');
      return;
    }

    if (filePaths.length === 0) {
      return;
    }

    try {
      const insertions: string[] = [];
      
      for (const filePath of filePaths) {
        // Get file extension to determine type
        const ext = filePath.split('.').pop()?.toLowerCase() || '';
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
        const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'];
        const audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'];
        
        const isImage = imageExts.includes(ext);
        const isVideo = videoExts.includes(ext);
        const isAudio = audioExts.includes(ext);
        
        if (!isImage && !isVideo && !isAudio) {
          continue; // Skip non-media files
        }
        
        // Save the file to the vault
        const result = await window.appBridge?.saveMediaFile?.(
          vaultPath,
          filePath,
          selectedNote?.path
        );

        if (result?.ok && result.relativePath) {
          const fileName = filePath.split(/[/\\]/).pop() || 'file';
          let markdown = '';
          if (isImage) {
            markdown = `![${fileName}](${result.relativePath})`;
          } else if (isVideo) {
            markdown = `<video controls src="${result.relativePath}"></video>`;
          } else if (isAudio) {
            markdown = `<audio controls src="${result.relativePath}"></audio>`;
          }
          
          if (markdown) {
            insertions.push(markdown);
          }
        }
      }

      if (insertions.length > 0) {
        // Insert at the current active line, or at the end if no active line
        const insertIndex = activeLineIndex !== null ? activeLineIndex + 1 : lines.length;
        const indent = activeLineIndex !== null ? (lines[activeLineIndex]?.match(/^(\s*)/)?.[1] || '') : '';
        const newLines = [...lines];
        
        // Insert each media file on a new line
        insertions.forEach((markdown, idx) => {
          newLines.splice(insertIndex + idx, 0, indent + markdown);
        });
        
        setLines(newLines);
        const newValue = newLines.join('\n');
        previousValueRef.current = newValue;
        previousLinesRef.current = newValue;
        isInternalUpdateRef.current = true;
        onChange(newValue);
        
        // Set active line to the first inserted line
        setActiveLineIndex(insertIndex);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    }
  };

  // Handle drag and drop for files
  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Get file paths from the dropped files
    const filePaths: string[] = [];
    const files = e.dataTransfer.files;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // In Electron, dropped files have a path property
      const filePath = (file as any).path || file.name;
      if (filePath) {
        filePaths.push(filePath);
      }
    }
    
    if (filePaths.length > 0) {
      await handleFileUpload(filePaths);
    }
  };

  // Handle paste events for clipboard images
  const handlePaste = async (e: React.ClipboardEvent) => {
    if (!vaultPath) {
      return; // Let default paste behavior happen if no vault
    }

    const clipboardData = e.clipboardData;
    let hasMedia = false;
    
    // Check for files in clipboard (from file copy/paste)
    if (clipboardData.files && clipboardData.files.length > 0) {
      const filePaths: string[] = [];
      
      for (let i = 0; i < clipboardData.files.length; i++) {
        const file = clipboardData.files[i];
        // Check if it's an image, video, or audio
        const type = file.type.toLowerCase();
        if (type.startsWith('image/') || type.startsWith('video/') || type.startsWith('audio/')) {
          hasMedia = true;
          // In Electron, pasted files should have a path property
          const filePath = (file as any).path;
          if (filePath) {
            filePaths.push(filePath);
          }
        }
      }
      
      if (filePaths.length > 0) {
        e.preventDefault();
        await handleFileUpload(filePaths);
        return;
      }
    }

    // Check for clipboard image (from screenshot or image copy)
    // This handles cases where the image is in the clipboard but not as a file
    try {
      const clipboardResult = await window.appBridge?.saveClipboardImage?.();
      if (clipboardResult?.ok && clipboardResult.filePath) {
        e.preventDefault();
        hasMedia = true;
        await handleFileUpload([clipboardResult.filePath]);
        return;
      }
    } catch (error) {
      // If clipboard doesn't have an image, let default paste behavior happen
      // Don't log errors for normal text paste operations
    }

    // If no media was found, let the default paste behavior happen (for text)
    // We don't preventDefault() so text pasting works normally
  };

  const updateLine = (index: number, newText: string) => {
    const next = [...lines];
    next[index] = newText;
    setLines(next);
    const newValue = next.join('\n');
    previousValueRef.current = newValue;
    previousLinesRef.current = newValue; // Update lines ref too
    isInternalUpdateRef.current = true; // Mark as internal update
    onChange(newValue);
    
    // Check for "/" command trigger - use setTimeout to ensure cursor position is updated
    if (inputRef.current && activeLineIndex === index) {
      setTimeout(() => {
        if (!inputRef.current || !containerRef.current) return;
        const cursorPos = inputRef.current.selectionStart ?? 0;
        const textBeforeCursor = newText.slice(0, cursorPos);
        
        // Check if "/" is at the start of line or after whitespace
        const slashMatch = textBeforeCursor.match(/(^|\s)\/([^\s]*)$/);
        if (slashMatch) {
          const filter = slashMatch[2].toLowerCase();
          setCommandFilter(filter);
          
          // Calculate position relative to cursor using getBoundingClientRect
          const inputElement = inputRef.current;
          
          if (!inputElement) return;
          
          // Get input position relative to viewport
          const inputRect = inputElement.getBoundingClientRect();
          
          // Create a temporary span to measure text width accurately
          const tempSpan = document.createElement('span');
          const computedStyle = window.getComputedStyle(inputElement);
          tempSpan.style.position = 'absolute';
          tempSpan.style.visibility = 'hidden';
          tempSpan.style.whiteSpace = 'pre';
          tempSpan.style.font = computedStyle.font || '14px monospace';
          tempSpan.style.fontSize = computedStyle.fontSize || '14px';
          tempSpan.style.fontFamily = computedStyle.fontFamily || 'monospace';
          tempSpan.style.fontWeight = computedStyle.fontWeight;
          tempSpan.style.letterSpacing = computedStyle.letterSpacing;
          tempSpan.textContent = newText.slice(0, cursorPos);
          document.body.appendChild(tempSpan);
          
          const textWidth = tempSpan.offsetWidth;
          document.body.removeChild(tempSpan);
          
          // Calculate cursor position within input (relative to viewport)
          const cursorX = textWidth;
          const cursorY = inputRect.height;
          
          // Position menu just below the cursor, using viewport coordinates
          // This ensures the menu appears exactly where the cursor is
          setCommandMenuPosition({
            top: inputRect.top + cursorY + 4,
            left: inputRect.left + cursorX
          });
          
          // Filter commands and reset index
          const filtered = commands.filter(cmd => 
            cmd.label.toLowerCase().includes(filter) || 
            cmd.id.toLowerCase().includes(filter) ||
            cmd.description.toLowerCase().includes(filter)
          );
          if (filtered.length > 0) {
            setShowCommandMenu(true);
            setCommandMenuIndex(0);
          } else {
            // Still show menu even if no matches, but show "No results"
            setShowCommandMenu(true);
            setCommandMenuIndex(0);
          }
        } else {
          setShowCommandMenu(false);
          setCommandFilter('');
        }
      }, 0);
    }
  };

  // Check if a line is a list item
  const isListItem = (line: string | undefined): boolean => {
    if (!line) return false;
    const trimmed = line.trim();
    return !!(
      trimmed.match(/^[-*+]\s/) ||
      trimmed.match(/^\d+\.\s/) ||
      trimmed.match(/^[-*+]\s+\[([ x])\]\s/)
    );
  };

  // Get indentation level (in spaces, where 2 spaces = 1 level)
  const getIndentLevel = (line: string | undefined): number => {
    if (!line) return 0;
    const indentMatch = line.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1] : '';
    return indent.replace(/\t/g, '  ').length;
  };

  // Check if a line has nested children (any subsequent line with higher indent)
  const hasNestedChildren = (index: number): boolean => {
    if (index < 0 || index >= lines.length) return false;
    if (index >= lines.length - 1) return false;
    if (!lines[index] || !isListItem(lines[index])) return false;
    
    const currentIndent = getIndentLevel(lines[index]);
    
    // Look for any subsequent line that is a child (higher indent)
    for (let i = index + 1; i < lines.length; i++) {
      if (!lines[i]) continue;
      const indent = getIndentLevel(lines[i]);
      // If we hit a line with same or less indentation, no more children
      if (indent <= currentIndent) {
        break;
      }
      // If we find a list item with higher indent, it's a child
      if (isListItem(lines[i])) {
        return true;
      }
    }
    return false;
  };

  // Toggle collapse/expand for a list item
  const toggleListCollapse = (index: number) => {
    if (index < 0 || index >= lines.length || !lines[index]) return;
    if (!isListItem(lines[index]) || !hasNestedChildren(index)) return;
    
    const next = new Set(collapsedLines);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setCollapsedLines(next);
  };

  // Check if a line should be hidden (any ancestor is collapsed)
  const isLineHidden = (index: number): boolean => {
    if (index === 0 || collapsedLines.size === 0) return false;
    if (index < 0 || index >= lines.length || !lines[index]) return false;
    
    const currentIndent = getIndentLevel(lines[index]);
    
    // Walk backwards to find any collapsed list item that could be a parent
    for (let i = index - 1; i >= 0; i--) {
      if (!lines[i]) continue;
      const indent = getIndentLevel(lines[i]);
      
      // If we find a collapsed list item with less indentation
      if (indent < currentIndent && isListItem(lines[i]) && collapsedLines.has(i)) {
        // Check if there's a sibling at the same level between the collapsed item and this line
        let hasSibling = false;
        for (let j = i + 1; j < index; j++) {
          if (!lines[j]) continue;
          const jIndent = getIndentLevel(lines[j]);
          // Found a sibling at the same level - this line is not a child
          if (jIndent === indent && isListItem(lines[j])) {
            hasSibling = true;
            break;
          }
          // Found something with less indentation - left the subtree
          if (jIndent < indent) {
            break;
          }
        }
        // If no sibling, this line is a child and should be hidden
        if (!hasSibling) {
          return true;
        }
      }
      
      // Stop if we hit a line with less indentation (gone past all potential parents)
      if (indent < currentIndent) {
        break;
      }
    }
    
    return false;
  };

  const insertCommand = async (command: CommandType) => {
    if (activeLineIndex === null || !inputRef.current) return;
    
    // Special handling for image/media command
    if (command.id === 'image') {
      setShowCommandMenu(false);
      setCommandFilter('');
      
      if (!vaultPath) {
        alert('Please open a vault first');
        return;
      }
      
      // Open file picker
      const filePaths = await window.appBridge?.selectMediaFiles?.();
      if (filePaths && filePaths.length > 0) {
        await handleFileUpload(filePaths);
      }
      return;
    }
    
    const currentText = lines[activeLineIndex] ?? '';
    const cursorPos = inputRef.current.selectionStart ?? 0;
    const textBeforeCursor = currentText.slice(0, cursorPos);
    
    // Find the "/" and replace it with the command
    const slashMatch = textBeforeCursor.match(/(^|\s)\/(\w*)$/);
    if (slashMatch) {
      const indentMatch = currentText.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1] : '';
      const beforeSlash = textBeforeCursor.slice(0, slashMatch.index! + slashMatch[1].length);
      const afterCursor = currentText.slice(cursorPos);
      
      // Get command text and preserve indentation
      let commandText = command.insert(indent);
      // If command already includes indentation, use it; otherwise add it
      if (!commandText.startsWith(indent)) {
        commandText = indent + commandText.trimStart();
      }
      
      const newText = beforeSlash + commandText + afterCursor;
      
      updateLine(activeLineIndex, newText);
      setShowCommandMenu(false);
      setCommandFilter('');
      
      // Set cursor position after the inserted command
      setTimeout(() => {
        if (inputRef.current) {
          const newPos = beforeSlash.length + commandText.length;
          inputRef.current.setSelectionRange(newPos, newPos);
        }
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (activeLineIndex === null) return;

    // Handle command menu navigation
    if (showCommandMenu) {
      const filteredCommands = commands.filter(cmd => 
        cmd.label.toLowerCase().includes(commandFilter) || 
        cmd.id.toLowerCase().includes(commandFilter) ||
        cmd.description.toLowerCase().includes(commandFilter)
      );
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCommandMenuIndex((prev) => (prev + 1) % filteredCommands.length);
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCommandMenuIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands.length > 0) {
          insertCommand(filteredCommands[commandMenuIndex]);
        }
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowCommandMenu(false);
        setCommandFilter('');
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const currentText = lines[activeLineIndex] ?? '';
      const cursorPos = e.currentTarget.selectionStart ?? currentText.length;
      const before = currentText.slice(0, cursorPos);
      const after = currentText.slice(cursorPos);
      
      // Preserve indentation for new line
      const indentMatch = currentText.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1] : '';
      
      // If we're in a list, preserve list marker indentation
      const listMatch = currentText.match(/^(\s*)([-*+]|\d+\.)\s/);
      let newLineIndent = indent;
      if (listMatch && after.trim() === '') {
        // If we're at the end of a list item, add same indentation
        newLineIndent = indent;
      } else if (listMatch) {
        // If we're in the middle, preserve indentation
        newLineIndent = indent;
      }
      
      const next = [...lines];
      next[activeLineIndex] = before;
      next.splice(activeLineIndex + 1, 0, newLineIndent + after);
      setLines(next);
      const newValue = next.join('\n');
      previousValueRef.current = newValue;
      isInternalUpdateRef.current = true;
      onChange(newValue);
      setActiveLineIndex(activeLineIndex + 1);
    } else if (e.key === 'ArrowUp' && e.currentTarget.selectionStart === 0) {
      e.preventDefault();
      if (activeLineIndex > 0) {
        setActiveLineIndex(activeLineIndex - 1);
      }
    } else if (e.key === 'ArrowDown') {
      const len = e.currentTarget.value.length;
      if (e.currentTarget.selectionStart === len && activeLineIndex < lines.length - 1) {
        e.preventDefault();
        setActiveLineIndex(activeLineIndex + 1);
      }
    } else if (e.key === 'Backspace') {
      const cursorPos = e.currentTarget.selectionStart ?? 0;
      if (cursorPos === 0 && activeLineIndex > 0) {
        e.preventDefault();
        const prevLine = lines[activeLineIndex - 1] ?? '';
        const currentLine = lines[activeLineIndex] ?? '';
        const merged = prevLine + currentLine;
        const next = [...lines];
        next[activeLineIndex - 1] = merged;
        next.splice(activeLineIndex, 1);
        setLines(next);
        const newValue = next.join('\n');
        previousValueRef.current = newValue;
        isInternalUpdateRef.current = true;
        onChange(newValue);
        setActiveLineIndex(activeLineIndex - 1);
        // Set cursor position to end of previous line
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(prevLine.length, prevLine.length);
          }
        }, 0);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setActiveLineIndex(null);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const currentText = lines[activeLineIndex] ?? '';
      const cursorPos = e.currentTarget.selectionStart ?? 0;
      
      if (e.shiftKey) {
        // Shift+Tab: unindent
        if (currentText.startsWith('  ')) {
          const newText = currentText.slice(2);
          updateLine(activeLineIndex, newText);
          setTimeout(() => {
            if (inputRef.current) {
              const newPos = Math.max(0, cursorPos - 2);
              inputRef.current.setSelectionRange(newPos, newPos);
            }
          }, 0);
        } else if (currentText.startsWith('\t')) {
          const newText = currentText.slice(1);
          updateLine(activeLineIndex, newText);
          setTimeout(() => {
            if (inputRef.current) {
              const newPos = Math.max(0, cursorPos - 1);
              inputRef.current.setSelectionRange(newPos, newPos);
            }
          }, 0);
        }
      } else {
        // Tab: indent
        const newText = '  ' + currentText;
        updateLine(activeLineIndex, newText);
        setTimeout(() => {
          if (inputRef.current) {
            const newPos = cursorPos + 2;
            inputRef.current.setSelectionRange(newPos, newPos);
          }
        }, 0);
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
      // Ctrl+L or Cmd+L: toggle list collapse/expand
      e.preventDefault();
      toggleListCollapse(activeLineIndex);
    }
  };

  const handleLineClick = (index: number) => {
    setActiveLineIndex(index);
  };

  // Get all children indices for a given line (for nested lists)
  const getChildrenIndices = (index: number): number[] => {
    if (index < 0 || index >= lines.length) return [];
    const currentIndent = getIndentLevel(lines[index]);
    const children: number[] = [];
    
    for (let i = index + 1; i < lines.length; i++) {
      if (!lines[i]) continue;
      const indent = getIndentLevel(lines[i]);
      if (indent <= currentIndent) break;
      children.push(i);
    }
    
    return children;
  };

  // Get all indices that should move together (line + all its children)
  const getLineGroupIndices = (index: number): number[] => {
    const children = getChildrenIndices(index);
    return [index, ...children];
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    setDraggedLineIndex(index);
    // Prevent the input from being focused during drag
    e.stopPropagation();
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedLineIndex === null) return;
    
    // Don't allow dropping on itself or its children
    const draggedGroup = getLineGroupIndices(draggedLineIndex);
    if (draggedGroup.includes(index)) {
      setDragOverIndex(null);
      return;
    }
    
    setDragOverIndex(index);
  };

  // Handle drag leave
  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the container, not just moving to a child
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!containerRef.current?.contains(relatedTarget)) {
      setDragOverIndex(null);
    }
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedLineIndex === null) return;
    
    const draggedGroup = getLineGroupIndices(draggedLineIndex);
    
    // Don't allow dropping on itself or its children
    if (draggedGroup.includes(dropIndex)) {
      setDraggedLineIndex(null);
      setDragOverIndex(null);
      return;
    }
    
    // Create new lines array
    const newLines = [...lines];
    const draggedLines = draggedGroup.map(i => lines[i]);
    
    // Remove dragged lines (sort descending to remove from end first)
    const sortedGroup = [...draggedGroup].sort((a, b) => b - a);
    sortedGroup.forEach(i => {
      newLines.splice(i, 1);
    });
    
    // Calculate target index after removal
    let targetIndex = dropIndex;
    if (draggedLineIndex < dropIndex) {
      // If dragging down, adjust for removed items
      targetIndex = dropIndex - draggedGroup.length;
    }
    
    // Insert at the target position (before the target line)
    // This way, the dragged item replaces the target's position
    newLines.splice(targetIndex, 0, ...draggedLines);
    
    setLines(newLines);
    const newValue = newLines.join('\n');
    previousValueRef.current = newValue;
    previousLinesRef.current = newValue;
    isInternalUpdateRef.current = true;
    onChange(newValue);
    
    // Update active line index if it was affected
    if (activeLineIndex !== null) {
      if (draggedGroup.includes(activeLineIndex)) {
        // The active line was moved
        const offsetInGroup = draggedGroup.indexOf(activeLineIndex);
        setActiveLineIndex(targetIndex + offsetInGroup);
      } else if (draggedLineIndex < dropIndex) {
        // Dragging down: lines between draggedLineIndex and dropIndex shift up
        if (activeLineIndex > draggedLineIndex && activeLineIndex <= dropIndex) {
          setActiveLineIndex(activeLineIndex - draggedGroup.length);
        }
      } else {
        // Dragging up: lines between dropIndex and draggedLineIndex shift down
        if (activeLineIndex >= dropIndex && activeLineIndex < draggedLineIndex) {
          setActiveLineIndex(activeLineIndex + draggedGroup.length);
        }
      }
    }
    
    setDraggedLineIndex(null);
    setDragOverIndex(null);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedLineIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2 text-xs text-gray-800">
          <span>Editor</span>
        </div>
        <button
          onClick={() => {
            if (activeLineIndex !== null) {
              toggleListCollapse(activeLineIndex);
            }
          }}
          disabled={activeLineIndex === null || activeLineIndex < 0 || activeLineIndex >= lines.length || !lines[activeLineIndex] || !isListItem(lines[activeLineIndex]) || !hasNestedChildren(activeLineIndex)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-800 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Toggle list collapse/expand (Ctrl+L / Cmd+L)"
        >
          <List size={14} />
          Toggle List
        </button>
      </div>
      <div
        ref={containerRef}
        className="w-full h-[600px] overflow-y-auto relative"
        onDragOver={handleFileDragOver}
        onDrop={handleFileDrop}
        onPaste={handlePaste}
        tabIndex={0}
      >
        <div className="px-6 py-4 space-y-0">
        {lines.map((line, index) => {
          // Skip hidden lines (children of collapsed items)
          if (isLineHidden(index)) {
            return null;
          }
          
          const isActive = activeLineIndex === index;
          
          if (isActive) {
            // Calculate indentation for active line too
            const indentMatch = line.match(/^(\s*)/);
            const indent = indentMatch ? indentMatch[1] : '';
            // Count spaces and tabs (tabs = 2 spaces)
            const indentLevel = indent.replace(/\t/g, '  ').length;
            const indentPx = indentLevel * 20; // 20px per 2 spaces (or 1 tab)
            
            const isDragged = draggedLineIndex === index;
            const isDragOver = dragOverIndex === index;
            const isHovered = hoveredLineIndex === index;
            const draggedGroup = draggedLineIndex !== null ? getLineGroupIndices(draggedLineIndex) : [];
            const isInDraggedGroup = draggedGroup.includes(index);
            
            return (
              <div
                key={index}
                className={`min-h-[1.75rem] relative group ${
                  isDragged || isInDraggedGroup ? 'opacity-50' : ''
                } ${isDragOver ? 'border-t-2 border-rose-brand' : ''}`}
                style={{ paddingLeft: `${8 + indentPx + 20}px` }}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onMouseEnter={() => setHoveredLineIndex(index)}
                onMouseLeave={() => setHoveredLineIndex(null)}
              >
                <div
                  className={`absolute top-0 bottom-0 w-5 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10 ${
                    isHovered ? 'opacity-100' : ''
                  }`}
                  style={{ left: `${8 + indentPx}px` }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <GripVertical size={14} className="text-slate-400" />
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={line}
                  onChange={(e) => updateLine(index, e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  onContextMenu={(e) => {
                    // Don't prevent default - let native menu show for spell-checking
                    // stopPropagation prevents parent handlers but allows Electron's handler
                    e.stopPropagation();
                    // Don't call preventDefault() - this allows Electron's native menu
                  }}
                  spellCheck={true}
                  onBlur={() => {
                    // Small delay to allow click events to fire first
                    setTimeout(() => {
                      setActiveLineIndex(null);
                      setShowCommandMenu(false);
                    }, 200);
                  }}
                  className="w-full px-0 py-1 bg-slate-100 border-b-2 border-rose-brand text-sm text-slate-900 outline-none focus:ring-0 font-mono"
                  data-line-indent={indentPx}
                />
                {showCommandMenu && commandMenuPosition && activeLineIndex === index && (() => {
                  const filteredCommands = commands.filter(cmd => 
                    cmd.label.toLowerCase().includes(commandFilter) || 
                    cmd.id.toLowerCase().includes(commandFilter) ||
                    cmd.description.toLowerCase().includes(commandFilter)
                  );
                  
                  return (
                    <div
                      className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden min-w-[280px] max-w-[320px]"
                      style={{
                        top: `${commandMenuPosition.top}px`,
                        left: `${commandMenuPosition.left}px`
                      }}
                      onMouseDown={(e) => e.preventDefault()} // Prevent input blur on click
                    >
                      {commandFilter && (
                        <div className="px-3 py-2 border-b border-slate-200 bg-slate-50">
                          <div className="text-xs text-gray-800">
                            Searching for: <span className="font-semibold text-slate-900">/{commandFilter}</span>
                          </div>
                        </div>
                      )}
                      <div className="py-1 max-h-[300px] overflow-y-auto">
                        {filteredCommands.length === 0 ? (
                          <div className="px-3 py-4 text-center text-sm text-slate-500">
                            No commands found
                            <div className="text-xs text-slate-400 mt-1">Try a different search term</div>
                          </div>
                        ) : (
                          filteredCommands.map((cmd, idx) => (
                            <button
                              key={cmd.id}
                              onClick={() => insertCommand(cmd)}
                              className={`w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-rose-light transition-colors ${
                                idx === commandMenuIndex ? 'bg-rose-light border-l-2 border-rose-brand' : ''
                              }`}
                              onMouseEnter={() => setCommandMenuIndex(idx)}
                            >
                              <span className="flex-shrink-0 w-8 text-center text-gray-800 text-base">{cmd.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-slate-900">{cmd.label}</div>
                                <div className="text-xs text-slate-500 mt-0.5">{cmd.description}</div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                      {filteredCommands.length > 0 && (
                        <div className="px-3 py-2 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
                          <span className="font-semibold">↑↓</span> Navigate • <span className="font-semibold">Enter</span> Insert • <span className="font-semibold">Esc</span> Close
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          }

          // Calculate indentation level (count leading spaces/tabs)
          // Convert tabs to 2 spaces for consistent rendering
          const indentMatch = line.match(/^(\s*)/);
          const indent = indentMatch ? indentMatch[1] : '';
          // Count spaces and tabs (tabs = 2 spaces)
          const indentLevel = indent.replace(/\t/g, '  ').length;
          const indentPx = indentLevel * 20; // 20px per 2 spaces (or 1 tab)
          const trimmed = line.trim();

          // Visual indicator for nested content (border on left)
          const hasNesting = indentLevel > 0;
          const borderStyle = hasNesting ? { borderLeft: `2px solid ${indentLevel % 2 === 0 ? '#e2e8f0' : '#cbd5e1'}` } : {};

          // Drag state for non-active lines
          const isDragged = draggedLineIndex === index;
          const isDragOver = dragOverIndex === index;
          const isHovered = hoveredLineIndex === index;
          const draggedGroup = draggedLineIndex !== null ? getLineGroupIndices(draggedLineIndex) : [];
          const isInDraggedGroup = draggedGroup.includes(index);

          // Render markdown for non-active lines
          if (trimmed === '') {
            return (
              <div
                key={index}
                className={`min-h-[1.75rem] cursor-text hover:bg-slate-50/50 group relative pl-5 ${
                  isDragged || isInDraggedGroup ? 'opacity-50' : ''
                } ${isDragOver ? 'border-t-2 border-rose-brand' : ''}`}
                onClick={() => handleLineClick(index)}
                style={{ paddingLeft: `${8 + indentPx + 20}px`, ...borderStyle }}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onMouseEnter={() => setHoveredLineIndex(index)}
                onMouseLeave={() => setHoveredLineIndex(null)}
              >
                <div
                  className={`absolute left-0 top-0 bottom-0 w-5 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10 ${
                    isHovered ? 'opacity-100' : ''
                  }`}
                  style={{ left: `${8 + indentPx}px` }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <GripVertical size={14} className="text-slate-400" />
                </div>
              </div>
            );
          }

          // Headers (ignore indentation for headers)
          if (trimmed.match(/^#{1,6}\s/)) {
            const match = trimmed.match(/^(#{1,6})\s(.+)$/);
            if (match) {
              const level = match[1].length;
              const text = match[2];
              const className = level === 1 ? 'text-2xl font-bold' : level === 2 ? 'text-xl font-bold' : 'text-lg font-semibold';
              return (
                <div
                  key={index}
                  className={`min-h-[1.75rem] cursor-text hover:bg-slate-50/50 group relative ${className} text-slate-900 leading-relaxed ${
                    isDragged || isInDraggedGroup ? 'opacity-50' : ''
                  } ${isDragOver ? 'border-t-2 border-rose-brand' : ''}`}
                  onClick={() => handleLineClick(index)}
                  style={{ paddingLeft: `${8 + indentPx + 20}px`, ...borderStyle }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  onMouseEnter={() => setHoveredLineIndex(index)}
                  onMouseLeave={() => setHoveredLineIndex(null)}
                >
                  <div
                    className={`absolute top-0 bottom-0 w-5 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10 ${
                      isHovered ? 'opacity-100' : ''
                    }`}
                    style={{ left: `${8 + indentPx}px` }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <GripVertical size={14} className="text-slate-400" />
                  </div>
                  <span>{renderInlineMarkdown(text)}</span>
                </div>
              );
            }
          }

          // Task lists - [ ] or [x] (supports nested with indentation)
          const taskMatch = trimmed.match(/^[-*+]\s+\[([ x])\]\s(.+)$/);
          if (taskMatch) {
            const isChecked = taskMatch[1] === 'x';
            const text = taskMatch[2];
            const hasChildren = hasNestedChildren(index);
            const isCollapsed = collapsedLines.has(index);
            return (
              <div
                key={index}
                className={`min-h-[1.75rem] cursor-text hover:bg-slate-50/50 group relative flex items-center text-gray-800 leading-relaxed transition-colors ${
                  isDragged || isInDraggedGroup ? 'opacity-50' : ''
                } ${isDragOver ? 'border-t-2 border-rose-brand' : ''}`}
                onClick={() => handleLineClick(index)}
                style={{ paddingLeft: `${8 + indentPx + 20}px`, ...borderStyle }}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onMouseEnter={() => setHoveredLineIndex(index)}
                onMouseLeave={() => setHoveredLineIndex(null)}
              >
                <div
                  className={`absolute top-0 bottom-0 w-5 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10 ${
                    isHovered ? 'opacity-100' : ''
                  }`}
                  style={{ left: `${8 + indentPx}px` }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <GripVertical size={14} className="text-slate-400" />
                </div>
                {hasChildren && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleListCollapse(index);
                    }}
                    className="flex-shrink-0 w-4 h-4 flex items-center justify-center hover:bg-slate-200 rounded mr-1"
                    title={isCollapsed ? 'Expand' : 'Collapse'}
                  >
                    {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  </button>
                )}
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    e.stopPropagation();
                    const newLine = line.replace(/\[([ x])\]/, `[${isChecked ? ' ' : 'x'}]`);
                    updateLine(index, newLine);
                  }}
                  className="accent-indigo-600 cursor-pointer flex-shrink-0 w-4 h-4 mr-1.5"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className={`flex-1 ${isChecked ? 'line-through text-slate-500' : ''}`}>
                  {renderInlineMarkdown(text)}
                </span>
              </div>
            );
          }

          // Regular lists (supports nested with indentation)
          if (trimmed.match(/^[-*+]\s/)) {
            const text = trimmed.replace(/^[-*+]\s/, '');
            const hasChildren = hasNestedChildren(index);
            const isCollapsed = collapsedLines.has(index);
            return (
              <div
                key={index}
                className={`min-h-[1.75rem] cursor-text hover:bg-slate-50/50 group relative flex items-center text-gray-800 leading-relaxed transition-colors ${
                  isDragged || isInDraggedGroup ? 'opacity-50' : ''
                } ${isDragOver ? 'border-t-2 border-rose-brand' : ''}`}
                onClick={() => handleLineClick(index)}
                style={{ paddingLeft: `${8 + indentPx + 20}px`, ...borderStyle }}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onMouseEnter={() => setHoveredLineIndex(index)}
                onMouseLeave={() => setHoveredLineIndex(null)}
              >
                <div
                  className={`absolute top-0 bottom-0 w-5 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10 ${
                    isHovered ? 'opacity-100' : ''
                  }`}
                  style={{ left: `${8 + indentPx}px` }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <GripVertical size={14} className="text-slate-400" />
                </div>
                {hasChildren && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleListCollapse(index);
                    }}
                    className="flex-shrink-0 w-4 h-4 flex items-center justify-center hover:bg-slate-200 rounded mr-1"
                    title={isCollapsed ? 'Expand' : 'Collapse'}
                  >
                    {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  </button>
                )}
                <span className="text-slate-400 flex-shrink-0 mr-1.5">•</span>
                <span className="flex-1">{renderInlineMarkdown(text)}</span>
              </div>
            );
          }

          // Numbered lists (supports nested)
          const numberedMatch = trimmed.match(/^(\d+)\.\s(.+)$/);
          if (numberedMatch) {
            const number = numberedMatch[1];
            const text = numberedMatch[2];
            const hasChildren = hasNestedChildren(index);
            const isCollapsed = collapsedLines.has(index);
            return (
              <div
                key={index}
                className={`min-h-[1.75rem] cursor-text hover:bg-slate-50/50 group relative flex items-center text-gray-800 leading-relaxed transition-colors ${
                  isDragged || isInDraggedGroup ? 'opacity-50' : ''
                } ${isDragOver ? 'border-t-2 border-rose-brand' : ''}`}
                onClick={() => handleLineClick(index)}
                style={{ paddingLeft: `${8 + indentPx + 20}px`, ...borderStyle }}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onMouseEnter={() => setHoveredLineIndex(index)}
                onMouseLeave={() => setHoveredLineIndex(null)}
              >
                <div
                  className={`absolute top-0 bottom-0 w-5 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10 ${
                    isHovered ? 'opacity-100' : ''
                  }`}
                  style={{ left: `${8 + indentPx}px` }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <GripVertical size={14} className="text-slate-400" />
                </div>
                {hasChildren && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleListCollapse(index);
                    }}
                    className="flex-shrink-0 w-4 h-4 flex items-center justify-center hover:bg-slate-200 rounded mr-1"
                    title={isCollapsed ? 'Expand' : 'Collapse'}
                  >
                    {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  </button>
                )}
                <span className="text-slate-500 flex-shrink-0 text-sm mr-1.5">{number}.</span>
                <span className="flex-1">{renderInlineMarkdown(text)}</span>
              </div>
            );
          }

          // Blockquotes (lines starting with >)
          const quoteMatch = trimmed.match(/^>\s(.+)$/);
          if (quoteMatch) {
            const text = quoteMatch[1];
            return (
              <div
                key={index}
                className={`min-h-[1.75rem] cursor-text hover:bg-slate-50/50 group relative border-l-4 border-slate-300 pl-4 py-1 my-1 text-gray-800 italic leading-relaxed transition-colors ${
                  isDragged || isInDraggedGroup ? 'opacity-50' : ''
                } ${isDragOver ? 'border-t-2 border-rose-brand' : ''}`}
                onClick={() => handleLineClick(index)}
                style={{ paddingLeft: `${16 + indentPx + 20}px`, ...borderStyle }}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onMouseEnter={() => setHoveredLineIndex(index)}
                onMouseLeave={() => setHoveredLineIndex(null)}
              >
                <div
                  className={`absolute top-0 bottom-0 w-5 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10 ${
                    isHovered ? 'opacity-100' : ''
                  }`}
                  style={{ left: `${8 + indentPx}px` }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <GripVertical size={14} className="text-slate-400" />
                </div>
                <span>{renderInlineMarkdown(text)}</span>
              </div>
            );
          }

          // Helper to construct file URL for Electron
          const getFileUrl = (filePath: string): string => {
            if (filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('file://')) {
              return filePath;
            }
            if (vaultPath) {
              // Normalize path separators and construct file:// URL
              // Handle both Windows and Unix paths
              const normalizedVault = vaultPath.replace(/\\/g, '/');
              const normalizedPath = filePath.replace(/\\/g, '/');
              // Remove leading slash from path if present
              const cleanPath = normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath;
              const fullPath = normalizedVault + '/' + cleanPath;
              // Encode the path properly for file:// URL
              const encodedPath = fullPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
              return `file:///${encodedPath}`;
            }
            return filePath;
          };

          // Image markdown: ![alt](path)
          const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
          if (imageMatch) {
            const alt = imageMatch[1];
            const imagePath = imageMatch[2];
            
            return (
              <div
                key={index}
                className={`min-h-[1.75rem] cursor-text hover:bg-slate-50/50 group relative ${
                  isDragged || isInDraggedGroup ? 'opacity-50' : ''
                } ${isDragOver ? 'border-t-2 border-rose-brand' : ''}`}
                onClick={() => handleLineClick(index)}
                style={{ paddingLeft: `${8 + indentPx + 20}px`, ...borderStyle }}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onMouseEnter={() => setHoveredLineIndex(index)}
                onMouseLeave={() => setHoveredLineIndex(null)}
              >
                <div
                  className={`absolute top-0 bottom-0 w-5 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10 ${
                    isHovered ? 'opacity-100' : ''
                  }`}
                  style={{ left: `${8 + indentPx}px` }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <GripVertical size={14} className="text-slate-400" />
                </div>
                <img 
                  src={getFileUrl(imagePath)}
                  alt={alt}
                  className="max-w-full h-auto rounded-lg my-2"
                  onError={(e) => {
                    // Fallback if image fails to load
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            );
          }

          // Video tag: <video controls src="path"></video>
          const videoMatch = trimmed.match(/^<video\s+controls\s+src="([^"]+)"[^>]*><\/video>$/);
          if (videoMatch) {
            const videoPath = videoMatch[1];
            return (
              <div
                key={index}
                className={`min-h-[1.75rem] cursor-text hover:bg-slate-50/50 group relative ${
                  isDragged || isInDraggedGroup ? 'opacity-50' : ''
                } ${isDragOver ? 'border-t-2 border-rose-brand' : ''}`}
                onClick={() => handleLineClick(index)}
                style={{ paddingLeft: `${8 + indentPx + 20}px`, ...borderStyle }}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onMouseEnter={() => setHoveredLineIndex(index)}
                onMouseLeave={() => setHoveredLineIndex(null)}
              >
                <div
                  className={`absolute top-0 bottom-0 w-5 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10 ${
                    isHovered ? 'opacity-100' : ''
                  }`}
                  style={{ left: `${8 + indentPx}px` }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <GripVertical size={14} className="text-slate-400" />
                </div>
                <video 
                  controls 
                  src={getFileUrl(videoPath)}
                  className="max-w-full h-auto rounded-lg my-2"
                />
              </div>
            );
          }

          // Audio tag: <audio controls src="path"></audio>
          const audioMatch = trimmed.match(/^<audio\s+controls\s+src="([^"]+)"[^>]*><\/audio>$/);
          if (audioMatch) {
            const audioPath = audioMatch[1];
            return (
              <div
                key={index}
                className={`min-h-[1.75rem] cursor-text hover:bg-slate-50/50 group relative ${
                  isDragged || isInDraggedGroup ? 'opacity-50' : ''
                } ${isDragOver ? 'border-t-2 border-rose-brand' : ''}`}
                onClick={() => handleLineClick(index)}
                style={{ paddingLeft: `${8 + indentPx + 20}px`, ...borderStyle }}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onMouseEnter={() => setHoveredLineIndex(index)}
                onMouseLeave={() => setHoveredLineIndex(null)}
              >
                <div
                  className={`absolute top-0 bottom-0 w-5 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10 ${
                    isHovered ? 'opacity-100' : ''
                  }`}
                  style={{ left: `${8 + indentPx}px` }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <GripVertical size={14} className="text-slate-400" />
                </div>
                <audio 
                  controls 
                  src={getFileUrl(audioPath)}
                  className="w-full my-2"
                />
              </div>
            );
          }

          // Regular line (with indentation support)
          return (
            <div
              key={index}
              className={`min-h-[1.75rem] cursor-text hover:bg-slate-50/50 group relative text-gray-800 leading-relaxed transition-colors ${
                isDragged || isInDraggedGroup ? 'opacity-50' : ''
              } ${isDragOver ? 'border-t-2 border-rose-brand' : ''}`}
              onClick={() => handleLineClick(index)}
              style={{ paddingLeft: `${8 + indentPx + 20}px`, ...borderStyle }}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onMouseEnter={() => setHoveredLineIndex(index)}
              onMouseLeave={() => setHoveredLineIndex(null)}
            >
              <div
                className={`absolute top-0 bottom-0 w-5 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10 ${
                  isHovered ? 'opacity-100' : ''
                }`}
                style={{ left: `${8 + indentPx}px` }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <GripVertical size={14} className="text-slate-400" />
              </div>
              <span>{renderInlineMarkdown(trimmed)}</span>
            </div>
          );
        })}
        
        {/* Add new line at end */}
        {activeLineIndex === null && (
          <div
            className="min-h-[1.5rem] cursor-text hover:bg-slate-50 rounded px-2 py-1 text-slate-400 text-sm"
            onClick={() => setActiveLineIndex(lines.length)}
          >
            Click to add new line...
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default App;

