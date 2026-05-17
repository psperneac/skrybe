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
});