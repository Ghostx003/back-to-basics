import '@testing-library/jest-dom';
import { beforeEach } from 'vitest';

// Simple in-memory mock for chrome.storage and chrome.alarms for tests
const memoryStorage: Record<string, any> = {};

(global as any).chrome = {
  storage: {
    local: {
      get: (keys: string[], cb: (res: any) => void) => {
        const result: Record<string, any> = {};
        for (const k of keys) {
          result[k] = memoryStorage[k];
        }
        cb(result);
      },
      set: (items: Record<string, any>, cb: () => void) => {
        Object.assign(memoryStorage, items);
        if (cb) cb();
      },
    },
  },
  alarms: {
    create: () => {},
    clear: () => Promise.resolve(true),
  },
  runtime: {
    sendMessage: () => Promise.resolve(),
    onMessage: {
      addListener: () => {},
      removeListener: () => {},
    },
  },
  tabs: {
    create: (opts: any) => Promise.resolve({ id: 99, ...opts }),
    update: (id: number, opts: any) => Promise.resolve({ id, ...opts }),
    get: (id: number) => Promise.resolve({ id }),
    remove: () => Promise.resolve(),
    sendMessage: () => Promise.resolve(),
  },
};

beforeEach(() => {
  for (const k of Object.keys(memoryStorage)) {
    delete memoryStorage[k];
  }
});
