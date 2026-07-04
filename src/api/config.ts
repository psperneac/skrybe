import { AIConfig } from "../config";

export interface ConfigAPI {
  deleteConfig: (name: string) => Promise<void>;
  saveConfig: (name: string, config: AIConfig) => Promise<void>;
  getAllConfigs: () => Promise<Record<string, AIConfig>>;
  getCurrentConfig: () => Promise<string>;
  setCurrentConfig: (name: string) => Promise<string>;
}

declare global {
  interface Window {
    configAPI: ConfigAPI;
  }
}

export const configAPI: ConfigAPI = {
  deleteConfig: (name: string) => window.configAPI.deleteConfig(name),
  saveConfig: (name: string, config: AIConfig) =>
    window.configAPI.saveConfig(name, config),
  getAllConfigs: () => window.configAPI.getAllConfigs(),
  getCurrentConfig: () => window.configAPI.getCurrentConfig(),
  setCurrentConfig: (name: string) => window.configAPI.setCurrentConfig(name),
};
