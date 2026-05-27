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

let configs: Configs = {};

export function setConfigs(cfg: Configs): void {
  configs = cfg;
}

export function getConfig(name: string): AIConfig {
  const config = configs[name];
  if (!config) {
    throw new Error(`Unknown AI config: ${name}`);
  }
  return config;
}

export function getConfigs(): Configs {
  return configs;
}
