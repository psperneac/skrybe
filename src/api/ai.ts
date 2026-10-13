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

export interface FetchModelInfoResult {
  valid: boolean;
  info: unknown;
  error?: string;
}

export interface LiteLLMModelInfo {
  model_name?: string;
  litellm_params?: {
    api_base?: string;
    model?: string;
    [key: string]: unknown;
  };
  model_info?: {
    id?: string;
    key?: string;
    max_tokens?: number | null;
    max_input_tokens?: number | null;
    max_output_tokens?: number | null;
    litellm_provider?: string;
    supports_vision?: boolean;
    supports_function_calling?: boolean;
    supports_tool_choice?: boolean;
    supports_reasoning?: boolean;
    supports_prompt_caching?: boolean;
    supports_native_streaming?: boolean;
    supports_system_messages?: boolean;
    supported_openai_params?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ModelInfoResponse {
  data?: LiteLLMModelInfo[];
  [key: string]: unknown;
}

interface AIAPI {
  chat: (prompt: string) => Promise<AIResponse>;
  getMessages: () => Promise<ChatMessage[]>;
  clear: () => Promise<ChatMessage[]>;
  getContextSize: () => Promise<ContextSize>;
  fetchModels: (config: Partial<AIConfig>) => Promise<FetchModelsResult>;
  fetchModelInfo: (config: Partial<AIConfig>) => Promise<FetchModelInfoResult>;
}

export const aiAPI: AIAPI = {
  chat: (prompt: string) => window.aiAPI.chat(prompt),
  getMessages: () => window.aiAPI.getMessages(),
  clear: () => window.aiAPI.clear(),
  getContextSize: () => window.aiAPI.getContextSize(),
  fetchModels: (config: Partial<AIConfig>) => window.aiAPI.fetchModels(config),
  fetchModelInfo: (config: Partial<AIConfig>) => window.aiAPI.fetchModelInfo(config),
};
