export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ContextSize {
  chars: number;
  tokens: number;
}

export interface AIResponse {
  reasoning: string;
  content: string;
}

interface AIAPI {
  chat: (prompt: string) => Promise<AIResponse>;
  getMessages: () => Promise<ChatMessage[]>;
  clear: () => Promise<ChatMessage[]>;
  getContextSize: () => Promise<ContextSize>;
  deleteConfig: (name: string) => Promise<void>;
  saveConfig: (name: string, config: any) => Promise<void>;
  getAllConfigs: () => Promise<Record<string, AIConfig>>;
}

declare global {
  interface Window {
    aiAPI: AIAPI;
  }
}

export const aiAPI: AIAPI = {
  chat: (prompt: string) => window.aiAPI.chat(prompt),
  getMessages: () => window.aiAPI.getMessages(),
  clear: () => window.aiAPI.clear(),
  getContextSize: () => window.aiAPI.getContextSize(),
  deleteConfig: (name: string) => window.aiAPI.deleteConfig(name),
  saveConfig: (name: string, config: any) => window.aiAPI.saveConfig(name, config),
  getAllConfigs: () => window.aiAPI.getAllConfigs(),
};