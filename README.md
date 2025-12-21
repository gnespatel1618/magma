# Note Hub

A modern, Electron-based note-taking application designed for Obsidian-style vaults. Edit Markdown files directly, manage tasks with Kanban views, and integrate with Git for version control.

## Features

- **Markdown-first editing**: Edit real `.md` files with a live preview editor
- **Task management**: Parse tasks from Markdown checkboxes with metadata (owner, project, due date, priority)
- **Kanban & Table views**: Visualize tasks across your entire vault
- **Git integration**: Snapshot, push, and pull changes directly from the app
- **Tag extraction**: Automatically extract and display hashtags from notes
- **Folder organization**: Create and organize notes in folders
- **Excalidraw support**: Attach and save Excalidraw canvases alongside notes

## Architecture

The application is built with a modular architecture:

### Frontend (React + TypeScript)
- **Components**: Modular React components organized by feature
  - `components/dashboard/`: Dashboard views (Kanban, Table, Tags, Settings)
  - `components/notes/`: Note management components (NoteTree, Editor)
  - `components/ui/`: Reusable UI components (Badge, LabeledInput)
- **Hooks**: Custom React hooks for state management (to be implemented)
- **Lib**: Utility functions for parsing and processing
  - `taskParser.ts`: Parses tasks from Markdown with metadata extraction
  - `tagParser.ts`: Extracts hashtags from Markdown content
  - `git.ts`: Git operations (snapshot, push, pull)
  - `indexer.ts`: Vault indexing utilities
  - `ai.ts`: AI integration (stubbed)

### Backend (Electron)
- **Main process** (`electron/main.ts`): Handles file system operations, Git commands, and IPC
- **Preload script** (`electron/preload.ts`): Secure bridge between renderer and main process

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd note-taking-app
```

2. Install dependencies:
```bash
npm install
```

## Development

### Running in Development Mode

Start the development server with hot reload:
```bash
npm run dev
```

This command:
- Starts the Vite dev server on port 5173
- Watches and rebuilds Electron main/preload scripts
- Launches Electron with DevTools open

### Building for Production

Build the application:
```bash
npm run build
```

Run the production build:
```bash
npm run start
```

Package for distribution:
```bash
npm run package
```

## Usage

### Getting Started

1. **Open a vault**: Click "Open vault" or "Change" in the sidebar to select a folder containing Markdown files
2. **Browse notes**: Use the Notes section to view and navigate your notes
3. **Edit notes**: Click on a note to open it in the editor
4. **Save changes**: Click "Save note" to persist changes to disk

### Task Management

Tasks are parsed from Markdown checkbox syntax:
```markdown
- [ ] Complete task @alice project:alpha due:2025-01-15 #high
- [x] Finished task @bob project:beta #med
```

Supported metadata:
- **Status**: `- [ ]` (todo) or `- [x]` (done)
- **Owner**: `@username`
- **Project**: `project:name`
- **Due date**: `due:YYYY-MM-DD`
- **Priority**: `#high`, `#med`, or `#low`

### Git Operations

- **Snapshot**: Stages and commits all changes in the vault (creates a Git repo if needed)
- **Push**: Pushes local commits to the remote repository
- **Pull**: Pulls changes from the remote repository

**Note**: Configure your Git remote using the command line before using push/pull:
```bash
cd /path/to/vault
git remote add origin <repository-url>
```

### Tags

Tags are automatically extracted from notes using `#hashtag` syntax. Tags are displayed in the Dashboard and can be used for filtering (feature to be implemented).

## Project Structure

```
note-taking-app/
├── src/
│   ├── components/          # React components
│   │   ├── dashboard/      # Dashboard views
│   │   ├── notes/          # Note management
│   │   └── ui/             # Reusable UI components
│   ├── lib/                # Utility functions
│   ├── types/              # TypeScript type definitions
│   ├── App.tsx             # Main application component
│   └── main.tsx            # React entry point
├── electron/
│   ├── main.ts             # Electron main process
│   └── preload.ts          # Preload script
├── dist/                   # Build output
└── package.json
```

## Development Guidelines

### Code Style

- Use TypeScript for all new code
- Add JSDoc comments to all exported functions and components
- Follow React best practices (functional components, hooks)
- Keep components small and focused on a single responsibility

### Adding New Features

1. Create components in appropriate directories (`components/feature-name/`)
2. Add utility functions to `lib/` with proper JSDoc documentation
3. Update types in `types/` if needed
4. Update this README and GUIDE.md with new features

## Known Limitations

- AI features are currently stubbed (placeholders)
- Mindmap auto-generation is not yet implemented
- Settings are not persisted to disk
- Auto-save is temporarily disabled (manual save only)
- Search functionality is not yet implemented

## Contributing

1. Follow the existing code structure and patterns
2. Add JSDoc comments to all functions
3. Keep components modular and reusable
4. Update documentation for new features

## License

[Add your license here]

## Acknowledgments

Built with:
- [Electron](https://www.electronjs.org/)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Excalidraw](https://excalidraw.com/)

