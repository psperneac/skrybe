import { app, BrowserWindow, ipcMain } from "electron";
import started from "electron-squirrel-startup";
import path from "path";
import { fileURLToPath } from "url";

import { loadConfigs, registerConfigHandlers } from "./config";
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

// Counter handlers (can be moved to separate file if needed)
let counter = 0;

ipcMain.handle("counter:get", () => {
  return counter;
});

ipcMain.handle("counter:increment", () => {
  counter += 1;
  return counter;
});

// Window management
const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false, // Required by Electron to load pure ESM preload modules
    },
  });

  // Check if the development server is running
  if (!app.isPackaged && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  mainWindow.webContents.openDevTools();
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
