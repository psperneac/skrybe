export interface CounterAPI {
  get: () => Promise<number>;
  increment: () => Promise<number>;
}

declare global {
  interface Window {
    counterAPI: CounterAPI;
  }
}