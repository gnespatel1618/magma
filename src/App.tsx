import React, { Suspense, useMemo, useState } from 'react';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';
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
  RefreshCw
} from 'lucide-react';
import { parseTasksFromMarkdown, type ParsedTask } from './lib/taskParser';

const LazyExcalidraw = React.lazy(async () => {
  const mod = await import('@excalidraw/excalidraw');
  return { default: mod.Excalidraw };
});

type NoteMeta = { id: string; path: string; title: string };

const statusTone: Record<'todo' | 'doing' | 'done', string> = {
  todo: 'bg-slate-100 text-slate-700',
  doing: 'bg-indigo-100 text-indigo-700',
  done: 'bg-emerald-100 text-emerald-700'
};

const priorityTone: Record<'low' | 'med' | 'high', string> = {
  low: 'bg-slate-100 text-slate-600',
  med: 'bg-amber-100 text-amber-700',
  high: 'bg-rose-100 text-rose-700'
};

const badge = (label: string, tone = 'bg-slate-100 text-slate-700') => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{label}</span>
);

function App() {
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [notes, setNotes] = useState<NoteMeta[]>([]);
  const [selectedNote, setSelectedNote] = useState<NoteMeta | null>(null);
  const [noteContent, setNoteContent] = useState<string>('');
  const [tasks, setTasks] = useState<ParsedTask[]>([]);
  const [showCanvas, setShowCanvas] = useState(false);
  const [excalidrawApi, setExcalidrawApi] = useState<ExcalidrawImperativeAPI | null>(null);

  const grouped = useMemo(
    () =>
      tasks.reduce<Record<'todo' | 'doing' | 'done', ParsedTask[]>>(
        (acc, t) => {
          acc[t.status].push(t);
          return acc;
        },
        { todo: [], doing: [], done: [] }
      ),
    [tasks]
  );

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
    if (list[0]) {
      await openNote(list[0]);
    } else {
      setSelectedNote(null);
      setNoteContent('');
      setTasks([]);
    }
  };

  const openNote = async (note: NoteMeta) => {
    setSelectedNote(note);
    const content = (await window.appBridge?.readNote?.(note.path)) ?? '';
    setNoteContent(content);
    setTasks(parseTasksFromMarkdown(content));
  };

  const createNote = async () => {
    if (!vaultPath) {
      alert('Select a vault first');
      return;
    }
    const title = window.prompt('New note title', 'Untitled note');
    if (!title) return;
    const res = await window.appBridge?.createNote?.(vaultPath, title);
    if (!res?.ok || !res.note) {
      alert(res?.message ?? 'Could not create note');
      return;
    }
    await loadNotes(vaultPath);
    await openNote(res.note);
  };

  const saveNote = async () => {
    if (!selectedNote) return;
    await window.appBridge?.writeNote?.(selectedNote.path, noteContent);
    setTasks(parseTasksFromMarkdown(noteContent));
    alert('Saved');
  };

  const gitAction = async (action: 'snapshot' | 'push' | 'pull') => {
    if (!vaultPath) return alert('Select a vault first');
    const res = await window.appBridge?.gitAction?.(vaultPath, action);
    alert(res?.message ?? `${action} done`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid grid-rows-[64px_1fr] grid-cols-[280px_360px_1fr] min-h-screen gap-px bg-slate-200">
        <header className="col-span-3 flex items-center justify-between px-4 py-3 bg-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-indigo-700 font-semibold">
              <NotebookPen size={18} />
              Note Hub
            </div>
            <div className="hidden md:flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm w-72">
              <Search size={16} className="text-slate-500" />
              <input className="w-full text-sm outline-none" placeholder="Search notes, tasks, projects" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => gitAction('snapshot')} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-soft hover:bg-indigo-700">
              <GitCommit size={16} /> Snapshot
            </button>
            <button onClick={() => gitAction('push')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <UploadCloud size={16} /> Push
            </button>
            <button onClick={() => gitAction('pull')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <DownloadCloud size={16} /> Pull
            </button>
            <button onClick={() => alert('AI summary stub')} className="inline-flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100">
              <Sparkles size={16} /> AI
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <Settings size={16} />
            </button>
          </div>
        </header>

        <aside className="row-start-2 bg-white border-r border-slate-200 px-4 py-4 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Vault</p>
              <p className="text-sm font-semibold text-slate-800 truncate max-w-[180px]">{vaultPath ?? 'No vault selected'}</p>
            </div>
            <button onClick={openVault} className="text-xs font-semibold text-indigo-700 hover:text-indigo-800">Change</button>
          </div>
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Navigation</p>
            <div className="space-y-2">
              <SidebarItem icon={<KanbanSquare size={16} />} label="Dashboard" active />
              <SidebarItem icon={<Calendar size={16} />} label="Calendar" />
              <SidebarItem icon={<Table size={16} />} label="Table" />
              <SidebarItem icon={<MapIcon size={16} />} label="Mindmap" />
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Saved views</p>
            <TagPill label="Manager dashboard" />
            <TagPill label="Upcoming due" />
            <TagPill label="Blocked items" tone="bg-amber-50 text-amber-700 border-amber-100" />
          </div>
        </aside>

        <section className="row-start-2 bg-white border-r border-slate-200 px-4 py-4 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Notes</h3>
            <button
              onClick={createNote}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Plus size={14} /> New note
            </button>
          </div>
          <div className="space-y-3">
            {notes.map((n) => (
              <button
                key={n.id}
                onClick={() => openNote(n)}
                className={`w-full text-left rounded-xl border ${selectedNote?.id === n.id ? 'border-indigo-200 ring-2 ring-indigo-100' : 'border-slate-200'} bg-white p-3 shadow-sm hover:shadow-md transition-shadow`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900 truncate">{n.title}</p>
                  <Link2 size={14} className="text-slate-400" />
                </div>
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-slate-700 text-sm font-semibold"><Calendar size={14} /> Due soon</div>
            <div className="mt-2 space-y-2">
              {tasks.filter((t) => t.due).map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 shadow-sm">
                  <div>
                    <p className="font-semibold text-slate-800">{t.title}</p>
                    <p className="text-xs text-slate-500">Due {t.due} {t.owner ? `· ${t.owner}` : ''}</p>
                  </div>
                  {t.priority && badge(t.priority, priorityTone[t.priority])}
                </div>
              ))}
            </div>
          </div>
        </section>

        <main className="row-start-2 bg-slate-50 px-5 py-5 overflow-y-auto space-y-4">
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
                    <span className="text-xs font-semibold uppercase text-slate-600">{col}</span>
                    <span className="text-xs text-slate-500">{grouped[col].length}</span>
                  </div>
                  {grouped[col].map((task) => (
                    <div key={task.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-slate-900">{task.title}</p>
                        {task.priority && badge(task.priority, priorityTone[task.priority])}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        {task.owner && <span>{task.owner}</span>}
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
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Task</th>
                      <th className="px-3 py-2 text-left font-semibold">Status</th>
                      <th className="px-3 py-2 text-left font-semibold">Owner</th>
                      <th className="px-3 py-2 text-left font-semibold">Due</th>
                      <th className="px-3 py-2 text-left font-semibold">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tasks.map((t) => (
                      <tr key={t.id} className="bg-white hover:bg-slate-50">
                        <td className="px-3 py-2 font-semibold text-slate-900">{t.title}</td>
                        <td className="px-3 py-2">{badge(t.status, statusTone[t.status])}</td>
                        <td className="px-3 py-2 text-slate-700">{t.owner ?? '—'}</td>
                        <td className="px-3 py-2 text-slate-700">{t.due ?? '—'}</td>
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
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                Auto-generated from headings/backlinks. Edits in mindmap will sync back to linked notes/tasks (stubbed).
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><AlertCircle size={16} /> Excalidraw (attach on demand)</div>
            {!showCanvas && (
              <button onClick={() => setShowCanvas(true)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <Plus size={16} /> Attach canvas
              </button>
            )}
            {showCanvas && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                <div className="h-[380px] overflow-hidden rounded-lg border border-slate-200">
                  <Suspense fallback={<div className="h-full flex items-center justify-center text-slate-500">Loading canvas...</div>}>
                    <LazyExcalidraw
                      ref={(api) => setExcalidrawApi(api as ExcalidrawImperativeAPI)}
                      onChange={() => {
                        // hook to save canvas JSON with note
                      }}
                    />
                  </Suspense>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-soft hover:bg-indigo-700"
                    onClick={() => {
                      const data = excalidrawApi?.getSceneElements() ?? [];
                      if (!vaultPath || !selectedNote) {
                        alert('Select a vault and note first');
                        return;
                      }
                      window.appBridge?.saveExcalidraw?.(vaultPath, selectedNote.id, data);
                      alert(`Saved canvas with ${data.length} elements`);
                    }}
                  >
                    <RefreshCw size={16} /> Snapshot canvas
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => setShowCanvas(false)}
                  >
                    Close
                  </button>
                </div>
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
              <button className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-soft hover:bg-indigo-700">
                Save settings
              </button>
            </div>
          </div>

          {selectedNote && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><NotebookPen size={16} /> {selectedNote.title}</div>
                <div className="flex items-center gap-2">
                  <button onClick={saveNote} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-soft hover:bg-indigo-700">
                    Save note
                  </button>
                </div>
              </div>
              <textarea
                className="w-full h-64 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const SidebarItem = ({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) => (
  <button className={`w-full inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${active ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'text-slate-700 hover:bg-slate-50 border border-transparent'}`}>
    {icon} {label}
  </button>
);

const TagPill = ({ label, tone = 'bg-slate-50 text-slate-700 border-slate-200' }: { label: string; tone?: string }) => (
  <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>{label}</div>
);

const LabeledInput = ({ label, placeholder }: { label: string; placeholder?: string }) => (
  <label className="flex flex-col gap-1 text-sm text-slate-700">
    <span className="text-xs font-semibold text-slate-600">{label}</span>
    <input
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      placeholder={placeholder}
    />
  </label>
);

export default App;

