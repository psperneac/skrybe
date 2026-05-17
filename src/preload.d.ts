export interface CounterAPI {
  get: () => Promise<number>;
  increment: () => Promise<number>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIAPI {
  chat: (prompt: string) => Promise<{ reasoning: string; content: string }>;
  getMessages: () => Promise<ChatMessage[]>;
  clear: () => Promise<ChatMessage[]>;
  getContextSize: () => Promise<{ chars: number; tokens: number }>;
}

export interface ContextSize {
  chars: number;
  tokens: number;
}

declare global {
  interface Window {
    counterAPI: CounterAPI;
    aiAPI: AIAPI;
  }
}