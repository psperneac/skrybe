# Skrybe Electron App

## Project Overview

- **Name**: skrybe
- **Type**: Electron desktop application
- **Author**: Paul Sperneac
- **Description**: Electron application with React UI, built with electron-vite + Vite + TypeScript + Tailwind CSS

## Tech Stack

| Layer | Technology | Version |
| --- | --- | --- |
| Runtime | Electron | 41.5.0 |
| Build Tool | electron-vite | 5.0+ |
| Language | TypeScript | 5.9 |
| Bundler | Vite | 5.4.21 |
| UI Framework | React | 19 |
| Styling | Tailwind CSS | 4.3+ |
| UI Components | Radix UI + shadcn/ui utilities | — |

## Project Structure

```text
src/
  main/              # Main process (IPC handlers, app lifecycle)
    index.ts
  preload/           # Preload script (exposes API via contextBridge)
    index.ts
    index.d.ts       # TypeScript declarations for window API
  renderer/          # Renderer process (React app)
    renderer.tsx     # React entry point (createRoot)
    app/
      App.tsx
      ConfigSelector.tsx
    components/ui/
      select.tsx
  api/               # Typed wrappers for preload API
    counter.ts
    ai.ts
  config.ts          # Shared config types & helpers
  css.d.ts           # CSS module type declarations
  global.css
  style.css
  lib/
    utils.ts         # cn() utility (clsx + tailwind-merge)
package.json
tsconfig.json
```

## Electron Architecture

### Processes

- **Main Process**: Node.js environment. Window creation, app lifecycle, native APIs, IPC handlers.
- **Renderer Process**: Chromium browser context. UI rendering, user interactions.
- **Preload Script**: Secure bridge. Exposes limited API to renderer via `contextBridge`.

### Communication Flow

```text
Renderer  -->  Preload (contextBridge)  -->  Main Process
   |                  |                        |
counterAPI.increment()  ipcRenderer.invoke()   handler
   ^                   |                        |
   |____________________|________________________|
              returns new value
```

## IPC Communication

Use `invoke/handle` for async request-response:

```typescript
// Main
ipcMain.handle('channel:name', () => result);

// Preload
contextBridge.exposeInMainWorld('api', {
  method: () => ipcRenderer.invoke('channel:name')
});
```

For one-way messages, use `send/on`.

## API Pattern

Renderer accesses preload API through typed wrappers in `src/api/`:

```typescript
import { counterAPI } from './api/counter';
const count = await counterAPI.get();
```

Never access `window` directly in components.

## Development

```bash
npm run dev        # Run in dev mode with electron-vite
npm run build      # Build production bundle
npm run preview    # Preview production build
npm start          # Start the packaged app
npm run package    # Build + package with electron-builder
```

## Dependencies

### Dev Dependencies
- `electron-vite` — build orchestration (replaced Electron Forge)
- `electron-builder` — creates distributable packages
- `electron` 41.5.0 — runtime
- `@electron/fuses` — security fuses

### Runtime Dependencies
- `react` 19 + `react-dom` 19
- `@radix-ui/react-select` — headless UI primitives
- `openai` — OpenAI SDK client
- `react-markdown` — Markdown rendering in chat

### Styling
- `tailwindcss` 4.x — utility-first CSS
- `tailwind-merge` + `clsx` + `class-variance-authority` — shadcn/ui style composition
