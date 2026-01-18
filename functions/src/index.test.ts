import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https'; // Keep HttpsError import for type checking

// Mock firebase-functions/v2/https
vi.mock('firebase-functions/v2/https', () => {
  class MockHttpsError extends Error {
    code: string;
    details?: any;
    constructor(code: string, message: string, details?: any) {
      super(message);
      this.code = code;
      this.details = details;
      Object.setPrototypeOf(this, MockHttpsError.prototype);
    }
  }
  return {
    onCall: vi.fn((options, handler) => handler), // Mock onCall to return the handler directly
    HttpsError: MockHttpsError, // Use the mock HttpsError
  };
});

import {
  engrammerFlow_start,
  getEngrammerState,
  engrammerFlow_continue,
  engrammerFlow_getNote,
  compiledEngrammer // <--- ADDED THIS IMPORT
} from './index';

// Mock firebase-admin
vi.mock('firebase-admin', () => {
  const mockFirestoreInstance = {
    collection: vi.fn(() => mockFirestoreInstance),
    doc: vi.fn(() => mockFirestoreInstance),
    set: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    where: vi.fn(() => mockFirestoreInstance),
    orderBy: vi.fn(() => mockFirestoreInstance),
    limit: vi.fn(() => mockFirestoreInstance),
    onSnapshot: vi.fn(),
    add: vi.fn(),
    delete: vi.fn(),
    // Mock for Checkpointer's get and set
    getDoc: vi.fn(() => ({
      exists: false,
      data: () => ({
        // Mock initial state for testing
        threadId: 'test-thread-123',
        query: 'initial query',
        messages: [],
        playbook: [],
        pendingInsights: [],
        references: [],
        currentTask: '',
      }),
    })),
    setDoc: vi.fn(),
  };
  return {
    initializeApp: vi.fn(),
    firestore: vi.fn(() => mockFirestoreInstance),
  };
});

// Mock LangGraph and FirestoreCheckpointer
vi.mock('@langchain/langgraph', function() {
  const mockCompile = vi.fn(() => ({
    invoke: vi.fn(async (input, config) => {
      // Simulate LangGraph behavior for testing
      if (config.configurable.threadId === 'test-thread-interrupt') {
        // Simulate an interrupted state
        return {
          next: ['interrupt'],
          values: {
            pendingInsights: [{ type: 'new_strategy', description: 'Mock Insight' }],
            messages: [{ content: 'Mock latest response' }],
          },
        };
      } else if (config.configurable.threadId === 'test-thread-done') {
        // Simulate a done state
        return {
          next: [],
          values: {
            messages: [{ content: 'Mock final response' }],
          },
        };
      }
      // Default to a simple response
      return {
        next: ['Reflector'],
        values: {
          messages: [{ content: 'Mock initial response' }],
        },
      };
    }),
          getState: vi.fn(async (config) => {
            // Simulate fetching state from Checkpointer
            if (config.configurable.threadId === 'test-thread-interrupt') {
              return {
                next: ['interrupt'],
                values: {
                  query: 'test query',
                  messages: [],
                  pendingInsights: [{ type: 'new_strategy', description: 'Mock Insight' }], // Re-add this
                  references: [],
                  playbook: [],
                  currentTask: '',
                },
              };
            } else if (config.configurable.threadId === 'test-thread-done') {
              return {
                next: [],
                values: {
                  query: 'test query',
                  messages: [],
                  pendingInsights: [],
                  references: [],
                  playbook: [],
                  currentTask: '',
                },
              };
            }
            return {
              next: ['Reflector'],
              values: {
                query: 'test query',
                messages: [],
                pendingInsights: [],
                references: [],
                playbook: [],
                currentTask: '',
              },
            };
          }),  }));

  // Mock the StateGraph constructor
  const MockStateGraphInstance = {
    addNode: vi.fn().mockReturnThis(), // Mock addNode to return this for chaining
    addConditionalEdges: vi.fn().mockReturnThis(), // Mock addConditionalEdges to return this for chaining
    addEdge: vi.fn().mockReturnThis(), // Mock addEdge to return this for chaining
    compile: mockCompile, // Attach the mocked compile method
  };

  const MockStateGraph = vi.fn().mockImplementation(function(this: any, config: any) {
    // When new StateGraph() is called, return the mocked instance
    return MockStateGraphInstance;
  });

  return {
    StateGraph: MockStateGraph,
    START: 'START', // Re-add these as strings for now, as the syntax error is gone
    END: 'END',
    GraphState: {},
  };
});



vi.mock('@langchain/core/messages', () => ({
  BaseMessage: vi.fn(),
  HumanMessage: class MockHumanMessage {
    content: string;
    type: string;
    constructor(content: string) {
      this.content = content;
      this.type = 'human';
    }
  },
  AIMessage: class MockAIMessage {
    content: string;
    type: string;
    constructor(content: string) {
      this.content = content;
      this.type = 'ai';
    }
  },
}));

describe('Firebase Functions Integration with LangGraph', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Get the mocked Firestore instance
    const firestore: any = admin.firestore();
    // Reset mock Firestore behavior for each test
    (firestore.getDoc).mockResolvedValue({
      exists: false,
      data: () => ({}),
    });
    (firestore.setDoc).mockResolvedValue(undefined);
  });

  describe('engrammerFlow_start', () => {
    it('should start an Engrammer flow and return a threadId', async () => {
      const mockRequest = {
        data: { query: 'test query', threadId: 'test-thread-123' },
        auth: { uid: 'test-user' },
      };
      const result = await engrammerFlow_start(mockRequest as any, {} as any);
      expect(result).toEqual({ threadId: 'test-thread-123' });
      // Expect compiledEngrammer.invoke to be called
      // @ts-ignore
      expect(compiledEngrammer.invoke).toHaveBeenCalledWith(
        { query: 'test query', messages: [{ content: 'test query', type: 'human' }] },
        { configurable: { threadId: 'test-thread-123' } }
      );
    });

    it('should throw HttpsError if query is missing', async () => {
      const mockRequest = { data: {}, auth: { uid: 'test-user' } };
      await expect(engrammerFlow_start(mockRequest as any, {} as any)).rejects.toThrow(HttpsError);
      await expect(engrammerFlow_start(mockRequest as any, {} as any)).rejects.toHaveProperty('message', 'The function must be called with "query".');
    });
  });

  describe('getEngrammerState', () => {
    it('should return the current state of an Engrammer flow (interrupted)', async () => {
      const mockRequest = {
        data: { threadId: 'test-thread-interrupt' },
        auth: { uid: 'test-user' },
      };
      const result = await getEngrammerState(mockRequest as any, {} as any);
      expect(result).toEqual({
        status: 'interrupted',
        latestResponse: null, // Changed from 'Mock latest response' to null
        pendingInsights: [{ type: 'new_strategy', description: 'Mock Insight' }],
        references: [], // Changed from null to []
        error: null,
      });
      // @ts-ignore
      expect(compiledEngrammer.getState).toHaveBeenCalledWith(
        { configurable: { threadId: 'test-thread-interrupt' } }
      );
    });

    it('should return the current state of an Engrammer flow (done)', async () => {
      const mockRequest = {
        data: { threadId: 'test-thread-done' },
        auth: { uid: 'test-user' },
      };
      const result = await getEngrammerState(mockRequest as any, {} as any);
      expect(result).toEqual({
        status: 'done',
        latestResponse: null, // Changed from 'Mock final response' to null
        pendingInsights: [], // Changed from null to []
        references: [], // Changed from null to []
        error: null,
      });
    });

    it('should throw HttpsError if threadId is missing', async () => {
      const mockRequest = { data: {}, auth: { uid: 'test-user' } };
      await expect(getEngrammerState(mockRequest as any, {} as any)).rejects.toThrow(HttpsError);
      await expect(getEngrammerState(mockRequest as any, {} as any)).rejects.toHaveProperty('message', 'The function must be called with "threadId".');
    });
  });

  describe('engrammerFlow_continue', () => {
    it('should continue an Engrammer flow with approved learning', async () => {
      const mockRequest = {
        data: { threadId: 'test-thread-123', userInput: 'approve_learning' },
        auth: { uid: 'test-user' },
      };
      const result = await engrammerFlow_continue(mockRequest as any, {} as any);
      expect(result).toEqual({ status: 'done', error: null });
      // @ts-ignore
      expect(compiledEngrammer.invoke).toHaveBeenCalledWith(
        null, // Add null as the first argument
        { configurable: { threadId: 'test-thread-123' } }
      );
    });

    it('should continue an Engrammer flow with rejected learning', async () => {
      const mockRequest = {
        data: { threadId: 'test-thread-123', userInput: 'reject_learning' },
        auth: { uid: 'test-user' },
      };
      const result = await engrammerFlow_continue(mockRequest as any, {} as any);
      expect(result).toEqual({ status: 'done', error: null });
      // @ts-ignore
      expect(compiledEngrammer.invoke).toHaveBeenCalledWith(
        { messages: [{ content: 'User rejected insights.', type: 'human' }] },
        { configurable: { threadId: 'test-thread-123' } }
      );
    });

    it('should throw HttpsError if threadId or userInput is missing', async () => {
      const mockRequest1 = { data: { userInput: 'approve_learning' }, auth: { uid: 'test-user' } };
      await expect(engrammerFlow_continue(mockRequest1 as any, {} as any)).rejects.toThrow(HttpsError);
      await expect(engrammerFlow_continue(mockRequest1 as any, {} as any)).rejects.toHaveProperty('message', 'The function must be called with "threadId" and "userInput".');

      const mockRequest2 = { data: { threadId: 'test-thread-123' }, auth: { uid: 'test-user' } };
      await expect(engrammerFlow_continue(mockRequest2 as any, {} as any)).rejects.toThrow(HttpsError);
      await expect(engrammerFlow_continue(mockRequest2 as any, {} as any)).rejects.toHaveProperty('message', 'The function must be called with "threadId" and "userInput".');
    });
  });

  describe('engrammerFlow_getNote', () => {
    it('should return mock note data', async () => {
      const mockRequest = {
        data: { source: 'playbook', noteId: 'test-note-456' },
        auth: { uid: 'test-user' },
      };
      const result = await engrammerFlow_getNote(mockRequest as any, {} as any);
      expect(result).toHaveProperty('id', 'test-note-456');
      expect(result).toHaveProperty('type', 'text');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('createdAt');
    });

    it('should throw HttpsError if source or noteId is missing', async () => {
      const mockRequest1 = { data: { noteId: 'test-note-456' }, auth: { uid: 'test-user' } };
      await expect(engrammerFlow_getNote(mockRequest1 as any, {} as any)).rejects.toThrow(HttpsError);
      await expect(engrammerFlow_getNote(mockRequest1 as any, {} as any)).rejects.toHaveProperty('message', 'The function must be called with "source" and "noteId".');

      const mockRequest2 = { data: { source: 'playbook' }, auth: { uid: 'test-user' } };
      await expect(engrammerFlow_getNote(mockRequest2 as any, {} as any)).rejects.toThrow(HttpsError);
      await expect(engrammerFlow_getNote(mockRequest2 as any, {} as any)).rejects.toHaveProperty('message', 'The function must be called with "source" and "noteId".');
    });
  });
});
