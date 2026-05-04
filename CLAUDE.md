# Skrybe Electron App

## Project Overview

- **Name**: skrybe
- **Type**: Electron desktop application
- **Author**: Paul Sperneac
- **Description**: Electron application with React UI, built with Electron Forge + Vite + TypeScript

## Tech Stack

| Layer | Technology | Version |
| --- | --- | --- |
| Runtime | Electron | 41.5.0 |
| Build Tool | Electron Forge + Vite Plugin | 7.11.1 |
| Language | TypeScript | 5.9 |
| Bundler | Vite | 5.4.21 |
| UI Framework | React | 19 |

## Project Structure

```text
src/
  main.ts         # Main process (IPC handlers, app lifecycle)
  preload.ts      # Preload script (exposes API via contextBridge)
  preload.d.ts    # TypeScript declarations for window API
  renderer.tsx    # React renderer entry point (createRoot)
  api/            # Typed wrappers for preload API
    counter.ts
  app/            # React components
    App.tsx
index.html
forge.config.ts
vite.*.config.ts
tsconfig.json
package.json
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
npm start        # Run in dev mode with hot reload
npm run lint     # Run ESLint
npm run package # Package app
npm run make     # Create distributable
```

## Security (Fuses)

Fuses are applied at package time to restrict Electron capabilities:

- RunAsNode: **OFF** - Prevents running as Node process
- EnableCookieEncryption: **ON**
- EnableNodeOptionsEnvironmentVariable: **OFF**
- EnableNodeCliInspectArguments: **OFF**
- EnableEmbeddedAsarIntegrityValidation: **ON**
- OnlyLoadAppFromAsar: **ON**
