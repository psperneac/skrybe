import { ipcMain } from "electron";
import OpenAI from "openai";
import { AIConfig, getConfig, getCurrentConfigName } from "../config";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Cache clients so we reuse them across calls with the same config
const clientCache = new Map<string, OpenAI>();

function getClient(config: AIConfig): OpenAI {
  const key = `${config.endpoint}::${config.apiKey}`;
  if (!clientCache.has(key)) {
    clientCache.set(key, new OpenAI({
      baseURL: config.endpoint,
      apiKey: config.apiKey || "not-needed",
    }));
  }
  return clientCache.get(key)!;
}

function getActiveConfig() {
  return getConfig(getCurrentConfigName());
}

const SYSTEM_PROMPT = "You are a helpful assistant.";

let messages: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];

interface EndpointValidation {
  valid: boolean;
  models: string[];
  error?: string;
}

interface ModelInfoResult {
  valid: boolean;
  info: unknown;
  error?: string;
}

export function registerAIHandlers(): void {
  ipcMain.handle("ai:fetchModels",
    async (_event, config: AIConfig): Promise<EndpointValidation> => {
      try {
        const client = getClient(config);
        const response = await client.models.list();
        // console.log(
        //   "[AI] /v1/models response:",
        //   JSON.stringify(response, null, 2),
        // );
        const models: string[] = response.data.map((m) => m.id).sort();
        return { valid: true, models };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch models";
        console.error("[AI] Failed to fetch models:", message);
        return { valid: false, models: [], error: message };
      }
    },
  );

  ipcMain.handle("ai:fetchModelInfo",
    async (_event, config: AIConfig): Promise<ModelInfoResult> => {
      try {
        const client = getClient(config);
        const info = await client.get("/model/info");
        return { valid: true, info };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch model info";
        console.error("[AI] Failed to fetch model info:", message);
        return { valid: false, info: null, error: message };
      }
    },
  );

  ipcMain.handle("chat:getMessages", () => messages);

  ipcMain.handle("chat:clear", () => {
    messages = [{ role: "system", content: SYSTEM_PROMPT }];
    return messages;
  });

  ipcMain.handle("chat:contextSize", () => {
    const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    const estimatedTokens = Math.ceil(totalChars / 4);
    return { chars: totalChars, tokens: estimatedTokens };
  });

  ipcMain.handle("ai:chat", async (_event, prompt: string) => {
    messages.push({ role: "user", content: prompt });

    const messagesToSend = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const config = getActiveConfig();
    const response = await getClient(config).chat.completions.create({
      model: config.modelName,
      messages: messagesToSend,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    });

    const rawMessage = response.choices[0]?.message;
    const messageContent = rawMessage?.content ?? "";

    // Get reasoning from various possible locations
    // Server sends: reasoning_content at top level, and in provider_specific_fields
    const reasoningText =
      (rawMessage as any)?.reasoning_content ??
      (rawMessage as any)?.provider_specific_fields?.reasoning ??
      "";

    // Response handled below

    // Reconstruct content with XML tags so renderer can parse it
    // App.tsx expects <think>...</think> tags in the content
    const thinkOpen = "<think>";
    const thinkClose = "</think>";
    const assistantHistoryMessage: ChatMessage = {
      role: "assistant",
      content: reasoningText
        ? thinkOpen + reasoningText + "\n" + thinkClose + "\n" + messageContent
        : messageContent,
    };

    messages.push(assistantHistoryMessage);

    return {
      reasoning: reasoningText,
      content: messageContent,
    };
  });
}
