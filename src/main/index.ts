import { app, BrowserWindow, ipcMain, screen } from "electron";
import started from "electron-squirrel-startup";
import path from "path";
import { fileURLToPath } from "url";

import { loadConfigs, registerConfigHandlers, saveWindowState, getWindowState } from "./config";
import { registerAIHandlers } from "./ai";

// Reconstruct __dirname for strict ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (started) {
  app.quit();
}

// Initialize config
loadConfigs();

// Register IPC handlers
registerConfigHandlers();

// Registers AI handlers
registerAIHandlers();

// Window state IPC handlers
ipcMain.handle('window:setDevToolsSplit', (_event, split: number) => {
  const state = getWindowState();
  state.devToolsSplit = split;
  saveWindowState(state);
});

ipcMain.handle('window:getDevToolsSplit', () => {
  const state = getWindowState();
  return state.devToolsSplit;
});

// Window management
let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  const savedState = getWindowState();

  // Ensure window is within screen bounds
  const displays = screen.getAllDisplays();
  let { x, y, width, height, isMaximized, isDevToolsOpen } = savedState;

  // Validate position is on a visible display
  if (x !== undefined && y !== undefined) {
    const isOnScreen = displays.some(display => {
      const { bounds } = display;
      return x >= bounds.x && x < bounds.x + bounds.width &&
             y >= bounds.y && y < bounds.y + bounds.height;
    });
    if (!isOnScreen) {
      x = undefined;
      y = undefined;
    }
  }

  mainWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false, // Required by Electron to load pure ESM preload modules
    },
  });

  // Restore maximized state
  if (isMaximized) {
    mainWindow.maximize();
  }

  // Check if the development server is running
  if (!app.isPackaged && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  // Restore devtools state
  if (isDevToolsOpen) {
    mainWindow.webContents.openDevTools();
  }

  // Save window state on close
  mainWindow.on('close', () => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      const devToolsOpen = mainWindow.webContents.isDevToolsOpened();
      saveWindowState({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized: mainWindow.isMaximized(),
        isDevToolsOpen: devToolsOpen,
        devToolsSplit: savedState.devToolsSplit, // Will be updated by renderer
      });
    }
  });
};

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
