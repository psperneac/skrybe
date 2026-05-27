import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('counterAPI', {
  get: () => ipcRenderer.invoke('counter:get'),
  increment: () => ipcRenderer.invoke('counter:increment'),
});

contextBridge.exposeInMainWorld('aiAPI', {
  chat: (prompt: string) => ipcRenderer.invoke('ai:chat', prompt),
  getMessages: () => ipcRenderer.invoke('chat:getMessages'),
  clear: () => ipcRenderer.invoke('chat:clear'),
  getContextSize: () => ipcRenderer.invoke('chat:contextSize'),
  deleteConfig: (name: string) => ipcRenderer.invoke('config:delete', name),
  saveConfig: (name: string, config: any) => ipcRenderer.invoke('config:save', name, config),
  getAllConfigs: () => ipcRenderer.invoke('config:getAll'),
});