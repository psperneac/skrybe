export const DEFAULT_CONFIG_NAME = 'default';

export interface AIConfig {
  endpoint: string;
  apiKey: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
}

export const CONFIGS: Record<string, AIConfig> = {
  [DEFAULT_CONFIG_NAME]: {
    endpoint: 'http://gx10-9803.local:8000/v1',
    apiKey: 'not-needed',
    modelName: 'RedHatAI/Qwen3.6-35B-A3B-NVFP4',
    temperature: 0.7,
    maxTokens: 70000,
  },
};

export function getConfig(name: string): AIConfig {
  const config = CONFIGS[name];
  if (!config) {
    throw new Error(`Unknown AI config: ${name}`);
  }
  return config;
}
