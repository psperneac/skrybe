import { ipcMain } from 'electron';
import OpenAI from 'openai';
import { getConfig, getCurrentConfigName } from '../config';
import { AIConfig } from '../config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ModelsResponse {
  object: string;
  data: Array<{
    id: string;
    object: string;
    created: number;
    owned_by: string;
  }>;
}

function createClient(config: AIConfig) {
  return new OpenAI({
    baseURL: config.endpoint,
    apiKey: config.apiKey || 'not-needed',
  });
}

function getActiveConfig() {
  return getConfig(getCurrentConfigName());
}

const SYSTEM_PROMPT = 'You are a helpful assistant.';

let messages: ChatMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }];

interface EndpointValidation {
  valid: boolean;
  models: string[];
  error?: string;
}

export function registerAIHandlers(): void {
  ipcMain.handle('ai:fetchModels', async (_event, config: AIConfig): Promise<EndpointValidation> => {
    try {
      const client = createClient(config);
      const response = await client.models.list();
      const models: string[] = response.data.map(m => m.id).sort();
      return { valid: true, models };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch models';
      console.error('[AI] Failed to fetch models:', message);
      return { valid: false, models: [], error: message };
    }
  });

  ipcMain.handle('chat:getMessages', () => messages);

  ipcMain.handle('chat:clear', () => {
    messages = [{ role: 'system', content: SYSTEM_PROMPT }];
    return messages;
  });

  ipcMain.handle('chat:contextSize', () => {
    const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    const estimatedTokens = Math.ceil(totalChars / 4);
    return { chars: totalChars, tokens: estimatedTokens };
  });

  ipcMain.handle('ai:chat', async (_event, prompt: string) => {
    messages.push({ role: 'user', content: prompt });

    const messagesToSend = messages.map(m => ({ role: m.role, content: m.content }));

    const config = getActiveConfig();
    const response = await createClient(config).chat.completions.create({
      model: config.modelName,
      messages: messagesToSend,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    });

    const rawMessage = response.choices[0]?.message;
    const messageContent = rawMessage?.content ?? '';
    
    // Get reasoning from various possible locations
    // Server sends: reasoning_content at top level, and in provider_specific_fields
    const reasoningText = (rawMessage as any)?.reasoning_content 
      ?? (rawMessage as any)?.provider_specific_fields?.reasoning 
      ?? '';
    
    // Response handled below

    // Reconstruct content with XML tags so renderer can parse it
    // App.tsx expects <think>...</think> tags in the content
    const thinkOpen = '<think>';
    const thinkClose = '</think>';
    const assistantHistoryMessage: ChatMessage = {
      role: 'assistant',
      content: reasoningText 
        ? thinkOpen + reasoningText + '\n' + thinkClose + '\n' + messageContent
        : messageContent,
    };

    messages.push(assistantHistoryMessage);

    return {
      reasoning: reasoningText,
      content: messageContent,
    };
  });
}
