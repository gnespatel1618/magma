# Note Hub — User Guide

## Quick Start

1. **Install dependencies**: `npm install`
2. **Run in development mode**: `npm run dev` (starts Vite dev server + Electron with hot reload)
3. **Run production build**: `npm run start` (builds then launches Electron)
4. **Select a vault**: Click **Change** in the left sidebar and pick a folder containing `.md` files

## Core Concepts

### Vault
A **vault** is any folder containing Markdown files. The app treats it as a self-contained workspace where all notes, tasks, and related files are stored.

### Notes
- Notes are real `.md` files on disk
- Edits are saved directly to the file system
- Supports folders for organization
- Each note can have associated Excalidraw canvases

### Tasks
Tasks are automatically parsed from Markdown checkbox syntax:
```markdown
- [ ] Complete task @alice project:alpha due:2025-01-15 #high
- [x] Finished task @bob project:beta #med
```

Tasks support the following metadata:
- **Status**: `- [ ]` (todo) or `- [x]` (done)
- **Owner**: `@username` - Assigns a task to a person
- **Project**: `project:name` - Groups tasks by project
- **Due date**: `due:YYYY-MM-DD` - Sets a deadline
- **Priority**: `#high`, `#med`, or `#low` - Sets priority level

### Git Integration
- **Snapshot**: Stages and commits all changes in the vault (initializes Git if needed)
- **Push**: Pushes local commits to the remote repository
- **Pull**: Pulls changes from the remote repository

**Note**: Configure your Git remote before using push/pull:
```bash
cd /path/to/vault
git remote add origin <repository-url>
```

### Tags
Tags are automatically extracted from notes using `#hashtag` syntax. All unique tags are displayed in the Dashboard and can be used for organization and filtering.

## Using the Application

### 1. Selecting a Vault
- Click **Change** in the left sidebar
- Select a folder containing Markdown files
- The app will scan and display all notes in the vault

### 2. Navigating Notes
- Use the **Notes** section in the sidebar to switch between Dashboard and Notes view
- Click on any note in the Notes list to open it
- Folders can be expanded/collapsed by clicking the chevron icon
- Select a folder before creating a new note/folder to create it inside that folder

### 3. Editing Notes
- Click a note to open it in the editor
- The editor supports:
  - Headers (`#`, `##`, `###`)
  - Lists (bulleted, numbered, task lists)
  - Inline formatting (bold, italic, code)
  - Nested lists with indentation
  - List collapse/expand (Ctrl+L / Cmd+L)
- Click **Save note** to persist changes to disk
- Tasks are automatically refreshed after saving

### 4. Creating Notes and Folders
- Click the **New note** button (plus icon) in the Notes panel
- Enter a title and click **Create**
- To create a folder, click the folder icon button
- Select a folder first to create items inside it

### 5. Managing Tasks
Tasks are displayed in multiple views:

**Kanban Board**:
- Three columns: Todo, Doing, Done
- Tasks are grouped by status
- Shows task metadata (owner, project, due date, priority)

**Table View**:
- All tasks in a sortable table
- Columns: Task, Status, Owner, Due, Priority

**Due Soon** (to be implemented):
- Cards showing tasks approaching their due dates

### 6. Git Operations
- **Snapshot**: Creates a commit with all current changes
- **Push**: Uploads commits to the remote repository
- **Pull**: Downloads changes from the remote repository

### 7. Tags
- Tags are automatically extracted from all notes
- View all tags in the Dashboard
- Click a tag to filter notes (feature to be implemented)

### 8. Excalidraw Canvases
- Click **Attach canvas** to open Excalidraw
- Draw your diagram
- Click **Snapshot canvas** to save as JSON in the vault
- Canvas files are saved as `<note-id>.excalidraw.json`

## Keyboard Shortcuts

- **Ctrl+L / Cmd+L**: Toggle list collapse/expand (when editing a list item)
- **Tab**: Indent current line
- **Shift+Tab**: Unindent current line
- **Enter**: Create new line (preserves indentation)
- **Arrow Up/Down**: Navigate between lines
- **Escape**: Exit line editing mode
- **Backspace** (at start of line): Merge with previous line

## Tips & Troubleshooting

### Common Issues

**Blank/empty UI in production build**:
- Ensure `vite.config.ts` has `base: './'` (already configured)
- Rebuild with `npm run start`

**Git push/pull errors**:
- Ensure a remote is configured: `git remote add origin <url>`
- Check authentication credentials
- Verify network connectivity

**Excalidraw save fails**:
- Ensure a vault is selected
- Ensure a note is open
- Check file system permissions

**Watchers stop working**:
- Restart the dev server: `npm run dev`
- Check for file system errors

**Tasks not updating**:
- Click **Save note** to refresh task parsing
- Check that tasks use correct syntax: `- [ ]` or `- [x]`

### Best Practices

1. **Organize with folders**: Create folders to group related notes
2. **Use consistent task syntax**: Follow the metadata format for reliable parsing
3. **Regular snapshots**: Use Git snapshot frequently to preserve work
4. **Tag consistently**: Use consistent tag names (e.g., `#project-alpha` vs `#projectAlpha`)
5. **Backup your vault**: Keep your vault in a Git repository for version control

## Current Limitations

### Stubbed Features
- **AI actions**: Summaries and Q&A are placeholders
- **Mindmap auto-generation**: Currently shows note pills only; backlink sync not implemented
- **Settings persistence**: Settings UI exists but values are not saved to disk
- **Auto-save**: Currently disabled; manual save required
- **Search**: Search bar exists but functionality not yet implemented

### Planned Features
- Task status editing in UI (currently only via Markdown)
- Due Soon task cards
- Tag filtering
- Settings persistence
- Auto-save with debouncing
- Full-text search
- Backlink detection and visualization
- AI integration with OpenAI

## Technical Details

### File Structure
- Notes are stored as `.md` files in the vault directory
- Excalidraw canvases are saved as `.excalidraw.json` files
- Git repository is initialized in the vault root (if not present)
- `.gitignore` is automatically created with sensible defaults

### Task Parsing
Tasks are parsed using regex patterns:
- Checkbox: `/^- \[( |x)\]\s+(.*)$/i`
- Owner: `/@([A-Za-z0-9_-]+)/`
- Project: `/\bproject:([A-Za-z0-9_-]+)/i`
- Due date: `/(?:due[:\s]|@due\()?(\d{4}-\d{2}-\d{2})\)?/i`
- Priority: `/#(low|med|high)/i`

### Tag Extraction
Tags are extracted from Markdown content, excluding:
- Code blocks (between ` ``` `)
- Inline code (between `` ` ``)

## Support

For issues, feature requests, or contributions, please refer to the project repository.

## Version History

See `package.json` for current version information.

