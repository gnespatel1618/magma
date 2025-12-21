import React from 'react';
import { Plus } from 'lucide-react';
import { Logo } from './ui/Logo';

/**
 * Landing page component displayed when no vault is selected.
 * Provides an introduction to the app and a button to open a vault.
 * 
 * @param onOpenVault - Callback function to trigger vault selection dialog
 */
export const LandingPage: React.FC<{ onOpenVault: () => void }> = ({ onOpenVault }) => {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-900 text-slate-100">
      <div className="max-w-5xl mx-auto px-6 py-14">
        <header className="flex items-center gap-3 mb-8">
          <div className="flex items-center gap-2 rounded-full bg-rose-brand/20 px-3 py-1.5 text-rose-light border border-rose-brand/40">
            <Logo size={18} />
            <span>Magma</span>
          </div>
          <span className="text-sm text-slate-300">Obsidian-friendly vaults</span>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-8 items-center">
          <section className="space-y-4">
            <h1 className="text-4xl font-semibold text-slate-50 tracking-tight">Welcome back to your vaults</h1>
            <p className="text-slate-300 text-lg leading-relaxed">
              Open any Obsidian-style folder with Markdown notes. Tasks, canvases, and Git snapshots are ready to go.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={onOpenVault}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-brand px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-brand/40 hover:opacity-90 transition-opacity"
                aria-label="Open vault folder"
              >
                <Plus size={16} />
                Open vault
              </button>
              <a
                href="https://obsidian.md/"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800"
                aria-label="Learn more about Obsidian"
              >
                Learn more
              </a>
            </div>
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-label="Features">
              <LandingCard title="Markdown-first" body="Edit real .md files; frontmatter and tasks stay intact." />
              <LandingCard title="Backlinks & tasks" body="Notes feed Kanban/Table views; canvases save per note." />
              <LandingCard title="Git built-in" body="Snapshot, push, and pull directly inside your vault." />
              <LandingCard title="Canvas ready" body="Attach Excalidraw canvases alongside your notes." />
            </section>
          </section>

          <aside className="rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur p-6 shadow-2xl shadow-black/30">
            <h2 className="text-sm text-slate-300 mb-3 font-semibold">Quick start</h2>
            <ol className="space-y-3 text-sm text-slate-200">
              <li className="flex gap-3">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-brand text-white text-xs font-bold" aria-hidden="true">1</span>
                <div>
                  <h3 className="font-semibold text-slate-100">Open vault</h3>
                  <p className="text-slate-400">Select any folder with Markdown files.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-brand text-white text-xs font-bold" aria-hidden="true">2</span>
                <div>
                  <h3 className="font-semibold text-slate-100">Pick a note</h3>
                  <p className="text-slate-400">Edit and save; tasks auto-sync to Kanban/Table.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 text-white text-xs font-bold" aria-hidden="true">3</span>
                <div>
                  <h3 className="font-semibold text-slate-100">Snapshot to Git</h3>
                  <p className="text-slate-400">Use Snapshot/Push/Pull to keep history in the vault.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 text-white text-xs font-bold" aria-hidden="true">4</span>
                <div>
                  <h3 className="font-semibold text-slate-100">Attach a canvas</h3>
                  <p className="text-slate-400">Save Excalidraw JSON next to the note.</p>
                </div>
              </li>
            </ol>
          </aside>
        </div>
      </div>
    </main>
  );
};

/**
 * Individual feature card component for the landing page.
 * 
 * @param title - The title of the feature
 * @param body - The description text for the feature
 */
const LandingCard: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <article className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-200 shadow-lg shadow-black/20">
    <h2 className="font-semibold text-slate-50 mb-1 text-base">{title}</h2>
    <p className="text-slate-400 leading-relaxed">{body}</p>
  </article>
);

