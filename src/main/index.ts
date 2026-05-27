import { app, BrowserWindow, ipcMain } from 'electron';
import started from 'electron-squirrel-startup';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as os from 'os';
import { DEFAULT_CONFIG_NAME, getConfig, getConfigs, setConfigs } from '../config';

import path from 'path';
import { fileURLToPath } from 'url';

// Reconstruct __dirname for strict ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (started) {
  app.quit();
}

function findConfigPath(): string | null {
  const candidates = [
    path.join(process.resourcesPath || '', '.skrybe.json'),
    path.join(os.homedir(), '.skrybe.json'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function loadConfigs(): void {
  const configPath = findConfigPath();
  if (configPath) {
    const content = fs.readFileSync(configPath, 'utf-8');
    setConfigs(JSON.parse(content));
  } else {
    setConfigs({
      [DEFAULT_CONFIG_NAME]: {
        endpoint: 'http://gx10-9803.local:8000/v1',
        apiKey: 'not-needed',
        modelName: 'RedHatAI/Qwen3.6-35B-A3B-NVFP4',
        temperature: 0.7,
        maxTokens: 70000,
      },
    });
  }
}

ipcMain.handle('config:getAll', () => {
  return getConfigs();
});

ipcMain.handle('config:save', (_event, name: string, config: any) => {
  const configPath = findConfigPath();
  if (configPath) {
    const content = fs.readFileSync(configPath, 'utf-8');
    const configs = JSON.parse(content);
    configs[name] = config;
    fs.writeFileSync(configPath, JSON.stringify(configs, null, 2));
    loadConfigs();
  }
});

ipcMain.handle('config:delete', (_event, name: string) => {
  const configPath = findConfigPath();
  if (configPath && name !== DEFAULT_CONFIG_NAME) {
    const content = fs.readFileSync(configPath, 'utf-8');
    const configs = JSON.parse(content);
    delete configs[name];
    fs.writeFileSync(configPath, JSON.stringify(configs, null, 2));
    loadConfigs();
  }
});

loadConfigs();
const config = getConfig(DEFAULT_CONFIG_NAME);

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface VLLMResponse {
  reasoning?: string;
  content?: string;
}

const client = new OpenAI({
  baseURL: config.endpoint,
  apiKey: config.apiKey,
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
    model: config.modelName,
    messages: messagesToSend,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
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
      // electron-vite bundles your preload script directly into an .mjs file
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false // Required by Electron to load pure ESM preload modules
    },
  });

  // Check if the development server is running
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    // Production fallback loading the compiled static HTML
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
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