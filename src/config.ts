export const DEFAULT_CONFIG_NAME = 'default';

export interface AIConfig {
  endpoint: string;
  apiKey: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
}

export interface Configs {
  [name: string]: AIConfig;
}

export interface AppConfig {
  current: string;
  configs: Configs;
}

let appConfig: AppConfig = {
  current: DEFAULT_CONFIG_NAME,
  configs: {},
};

export function setAppConfig(cfg: AppConfig): void {
  appConfig = cfg;
}

export function getAppConfig(): AppConfig {
  return appConfig;
}

export function setConfigs(configs: Configs): void {
  appConfig.configs = configs;
}

export function getConfig(name: string): AIConfig {
  const config = appConfig.configs[name];
  if (!config) {
    throw new Error(`Unknown AI config: ${name}`);
  }
  return config;
}

export function getConfigs(): Configs {
  return appConfig.configs;
}

export function getCurrentConfigName(): string {
  return appConfig.current;
}

export function setCurrentConfigName(name: string): void {
  if (!appConfig.configs[name]) {
    throw new Error(`Unknown AI config: ${name}`);
  }
  appConfig.current = name;
}
