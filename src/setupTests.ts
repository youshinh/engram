import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { JSDOM } from 'jsdom'; // JSDOMをインポート
import { indexedDB, IDBKeyRange } from 'fake-indexeddb'; // fake-indexeddbをインポート

// JSDOM環境でindexedDBとIDBKeyRangeをグローバルに設定
const dom = new JSDOM();
global.window = dom.window as any;
global.document = dom.window.document;
global.indexedDB = indexedDB;
global.IDBKeyRange = IDBKeyRange;

// window.matchMediaをモック
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});