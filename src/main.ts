import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import OpenAI from 'openai';

if (started) {
  app.quit();
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface VLLMResponse {
  reasoning?: string;
  content?: string;
}

const client = new OpenAI({
  baseURL: 'http://gx10-9803.local:8000/v1',
  apiKey: 'not-needed',
});

const SYSTEM_PROMPT = 'You are a helpful assistant.';

let messages: ChatMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }];

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
  console.log('[AI Chat] Messages sent:', messagesToSend);

  const response = await client.chat.completions.create({
    model: 'RedHatAI/Qwen3.6-35B-A3B-NVFP4',
    messages: messagesToSend,
    temperature: 0.7,
    max_tokens: 70000,
  });

  const vllmResponse: VLLMResponse = {
    reasoning: (response.choices[0]?.message as any)?.reasoning,
    content: response.choices[0]?.message?.content ?? '',
  };

  console.log('[AI Chat] Response:', response.choices[0]?.message);

  const rawContent = vllmResponse.content ?? '';
  const splitParts = rawContent.split('</think>');
  const reasoningText = splitParts[0]?.trim() ?? '';
  const contentText = splitParts.slice(1).join('</think>').trim();

  const assistantHistoryMessage: ChatMessage = {
    role: 'assistant',
    content: splitParts[1],
  };

  messages.push(assistantHistoryMessage);

  return {
    reasoning: reasoningText,
    content: contentText,
  };
});

let counter = 0;

ipcMain.handle('counter:get', () => {
  return counter;
});

ipcMain.handle('counter:increment', () => {
  counter += 1;
  return counter;
});

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  mainWindow.webContents.openDevTools();
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});