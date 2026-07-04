import { contextBridge, ipcRenderer } from 'electron';

// AI API - chat and model operations
const aiAPI = {
  chat: (prompt: string) => ipcRenderer.invoke('ai:chat', prompt),
  getMessages: () => ipcRenderer.invoke('chat:getMessages'),
  clear: () => ipcRenderer.invoke('chat:clear'),
  getContextSize: () => ipcRenderer.invoke('chat:contextSize'),
  fetchModels: (config: unknown) => ipcRenderer.invoke('ai:fetchModels', config),
};

// Config API - configuration management
const configAPI = {
  deleteConfig: (name: string) => ipcRenderer.invoke('config:delete', name),
  saveConfig: (name: string, config: unknown) => ipcRenderer.invoke('config:save', name, config),
  getAllConfigs: () => ipcRenderer.invoke('config:getAll'),
  getCurrentConfig: () => ipcRenderer.invoke('config:getCurrent'),
  setCurrentConfig: (name: string) => ipcRenderer.invoke('config:setCurrent', name),
};

// Window API - window state management
const windowAPI = {
  getDevToolsSplit: () => ipcRenderer.invoke('window:getDevToolsSplit'),
  setDevToolsSplit: (split: number) => ipcRenderer.invoke('window:setDevToolsSplit', split),
};

contextBridge.exposeInMainWorld('aiAPI', aiAPI);
contextBridge.exposeInMainWorld('configAPI', configAPI);
contextBridge.exposeInMainWorld('windowAPI', windowAPI);