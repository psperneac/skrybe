import { AIConfig } from "../config";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
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

export interface FetchModelsResult {
  valid: boolean;
  models: string[];
  error?: string;
}

interface AIAPI {
  chat: (prompt: string) => Promise<AIResponse>;
  getMessages: () => Promise<ChatMessage[]>;
  clear: () => Promise<ChatMessage[]>;
  getContextSize: () => Promise<ContextSize>;
  fetchModels: (config: Partial<AIConfig>) => Promise<FetchModelsResult>;
}

export const aiAPI: AIAPI = {
  chat: (prompt: string) => window.aiAPI.chat(prompt),
  getMessages: () => window.aiAPI.getMessages(),
  clear: () => window.aiAPI.clear(),
  getContextSize: () => window.aiAPI.getContextSize(),
  fetchModels: (config: Partial<AIConfig>) => window.aiAPI.fetchModels(config),
};
