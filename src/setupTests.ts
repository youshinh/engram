import { vi } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom';
import { JSDOM } from 'jsdom';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

// Mock React.Suspense to render children immediately in tests
// This helps with testing components that are loaded with React.lazy
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Suspense: ({ children }) => children,
  };
});

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
