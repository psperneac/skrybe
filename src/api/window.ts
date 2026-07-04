export interface WindowAPI {
  getDevToolsSplit: () => Promise<number>;
  setDevToolsSplit: (split: number) => Promise<void>;
}

declare global {
  interface Window {
    windowAPI: WindowAPI;
  }
}

export const windowAPI: WindowAPI = {
  getDevToolsSplit: () => window.windowAPI.getDevToolsSplit(),
  setDevToolsSplit: (split: number) => window.windowAPI.setDevToolsSplit(split),
};
