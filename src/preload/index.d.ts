export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIAPI {
  chat: (prompt: string) => Promise<{ reasoning: string; content: string }>;
  getMessages: () => Promise<ChatMessage[]>;
  clear: () => Promise<ChatMessage[]>;
  getContextSize: () => Promise<{ chars: number; tokens: number }>;
  fetchModels: (config: unknown) => Promise<string[]>;
}

export interface ConfigAPI {
  deleteConfig: (name: string) => Promise<void>;
  saveConfig: (name: string, config: unknown) => Promise<void>;
  getAllConfigs: () => Promise<unknown>;
  getCurrentConfig: () => Promise<string>;
  setCurrentConfig: (name: string) => Promise<string>;
}

export interface WindowAPI {
  getDevToolsSplit: () => Promise<number>;
  setDevToolsSplit: (split: number) => Promise<void>;
}

export interface ContextSize {
  chars: number;
  tokens: number;
}

declare global {
  interface Window {
    aiAPI: AIAPI;
    configAPI: ConfigAPI;
    windowAPI: WindowAPI;
  }
}
