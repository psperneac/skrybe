import { ipcMain } from 'electron';
import * as fs from 'fs';
import * as os from 'os';
import path from 'path';
import {
  DEFAULT_CONFIG_NAME,
  getAppConfig,
  setAppConfig,
  getConfigs,
  getCurrentConfigName,
  setCurrentConfigName,
} from '../config';
import type { AIConfig, AppConfig } from '../config';

const CONFIG_FILE_NAME = '.skrybe.json';



function createDefaultAppConfig(): AppConfig {
  return {
    current: DEFAULT_CONFIG_NAME,
    configs: {
      [DEFAULT_CONFIG_NAME]: {
        endpoint: 'http://gx10-9803.local:8000/v1',
        apiKey: 'not-needed',
        modelName: 'RedHatAI/Qwen3.6-35B-A3B-NVFP4',
        temperature: 0.7,
        maxTokens: 70000,
      },
    },
  };
}

export function loadConfigs(): void {
  // Check local first, then home directory
  const localPath = path.join(process.cwd(), CONFIG_FILE_NAME);
  const homePath = path.join(os.homedir(), CONFIG_FILE_NAME);
  
  let configPath: string;
  if (fs.existsSync(localPath)) {
    configPath = localPath;
  } else if (fs.existsSync(homePath)) {
    configPath = homePath;
  } else {
    // No config file exists, create local one
    const defaultConfig = createDefaultAppConfig();
    setAppConfig(defaultConfig);
    fs.writeFileSync(localPath, JSON.stringify(defaultConfig, null, 2));
    return;
  }
  
  const content = fs.readFileSync(configPath, 'utf-8');
  const raw = JSON.parse(content);
  
  // Migrate old format if needed
  let loaded: AppConfig;
  if (raw.configs && raw.current) {
    // Already new format
    loaded = raw as AppConfig;
  } else {
    // Old format: { "default": { ... } }
    loaded = {
      current: DEFAULT_CONFIG_NAME,
      configs: raw as Record<string, AIConfig>,
    };
  }
  
  // Ensure current is valid
  if (!loaded.configs[loaded.current]) {
    loaded.current = DEFAULT_CONFIG_NAME;
  }
  setAppConfig(loaded);
}

function saveConfigs(): void {
  // Always save to local path for development convenience
  const localPath = path.join(process.cwd(), CONFIG_FILE_NAME);
  fs.writeFileSync(localPath, JSON.stringify(getAppConfig(), null, 2));
}

export function registerConfigHandlers(): void {
  ipcMain.handle('config:getAll', () => {
    return getConfigs();
  });

  ipcMain.handle('config:getCurrent', () => {
    return getCurrentConfigName();
  });

  ipcMain.handle('config:setCurrent', (_event, name: string) => {
    setCurrentConfigName(name);
    saveConfigs();
    return getCurrentConfigName();
  });

  ipcMain.handle('config:save', (_event, name: string, config: AIConfig) => {
    const appConfig = getAppConfig();
    appConfig.configs[name] = config;
    setAppConfig(appConfig);
    saveConfigs();
  });

  ipcMain.handle('config:delete', (_event, name: string) => {
    const appConfig = getAppConfig();
    if (name !== DEFAULT_CONFIG_NAME && appConfig.configs[name]) {
      delete appConfig.configs[name];
      // If deleted current config, switch to default
      if (appConfig.current === name) {
        appConfig.current = DEFAULT_CONFIG_NAME;
      }
      setAppConfig(appConfig);
      saveConfigs();
    }
  });
}
