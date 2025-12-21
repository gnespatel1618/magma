# Note Hub — Guidebook

## Quick start
1) Install: `npm install`
2) Dev (live reload): `npm run dev` (keeps Vite + Electron running)
3) Prod-style run: `npm run start` (builds then launches Electron)
4) Select a vault: click **Change** in the left rail and pick a folder with `.md` files.

## Core concepts
- Vault = any folder with Markdown files.
- Notes load from real `.md` files; edits are saved back to disk.
- Tasks are parsed from Markdown checkboxes (`- [ ]` todo, `- [x]` done) with optional metadata (`@owner`, `project:foo`, `due:YYYY-MM-DD`, `#high|#med|#low`).
- Git snapshot/push/pull runs inside the vault folder (requires a configured remote for push/pull).
- Excalidraw canvases are attached on demand and saved as `<note-id>.excalidraw.json` in the vault.

## Using the app
1) **Select vault**: left rail → **Change** → choose folder.
2) **Open a note**: click a note in the Notes list. Content loads into the editor (bottom of the main pane).
3) **Edit & save**: change text and click **Save note**. Tasks refresh automatically from the Markdown content.
4) **Tasks**:
   - Add tasks in Markdown: `- [ ] Prep sprint @ben project:delivery due:2025-01-05 #med`
   - View in Kanban (by status), Table, and Due Soon cards.
5) **Git**:
   - **Snapshot**: stages and commits all changes in the vault (initializes git if needed).
   - **Push/Pull**: uses the vault’s git remote; configure your remote once via git CLI in the vault.
6) **Excalidraw**:
   - Click **Attach canvas**, draw, then **Snapshot canvas** to save JSON into the vault.
   - Close to hide; reopen to continue working.
7) **Mindmap**: displays pills for notes; auto-generation from headings/backlinks is stubbed (placeholder).
8) **Settings**: UI-only placeholders for remote URL, ignore patterns, autosync cadence, and OpenAI key.

## Supported task metadata (inline)
- Status: `- [ ]` (todo) or `- [x]` (done). You can mark doing by editing status in UI in a future update.
- Owner: `@alice`
- Project: `project:alpha`
- Due date: `due:2025-01-15`
- Priority: `#high`, `#med`, `#low`

## Tips & troubleshooting
- Blank/empty UI in prod build: ensure `vite.config.ts` has `base: './'` (already set) and rebuild with `npm run start`.
- Git push/pull errors: set a remote in the vault (`git remote add origin ...`) and ensure auth is configured.
- Excalidraw save needs a selected vault and note; otherwise you’ll be prompted.
- If watchers stop, rerun `npm run dev`.

## What’s stubbed
- AI actions (summaries/Q&A) are placeholders.
- Mindmap auto-generation/backlink sync is placeholder.
- Settings are not yet persisted; git remote/ignore/autosync fields are visual only.

