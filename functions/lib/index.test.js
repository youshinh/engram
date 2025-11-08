"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https"); // Keep HttpsError import for type checking
// Mock firebase-functions/v2/https
vitest_1.vi.mock('firebase-functions/v2/https', () => {
    class MockHttpsError extends Error {
        constructor(code, message, details) {
            super(message);
            this.code = code;
            this.details = details;
            Object.setPrototypeOf(this, MockHttpsError.prototype);
        }
    }
    return {
        onCall: vitest_1.vi.fn((options, handler) => handler), // Mock onCall to return the handler directly
        HttpsError: MockHttpsError, // Use the mock HttpsError
    };
});
const index_1 = require("./index");
// Mock firebase-admin
vitest_1.vi.mock('firebase-admin', () => {
    const mockFirestoreInstance = {
        collection: vitest_1.vi.fn(() => mockFirestoreInstance),
        doc: vitest_1.vi.fn(() => mockFirestoreInstance),
        set: vitest_1.vi.fn(),
        get: vitest_1.vi.fn(),
        update: vitest_1.vi.fn(),
        where: vitest_1.vi.fn(() => mockFirestoreInstance),
        orderBy: vitest_1.vi.fn(() => mockFirestoreInstance),
        limit: vitest_1.vi.fn(() => mockFirestoreInstance),
        onSnapshot: vitest_1.vi.fn(),
        add: vitest_1.vi.fn(),
        delete: vitest_1.vi.fn(),
        // Mock for Checkpointer's get and set
        getDoc: vitest_1.vi.fn(() => ({
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
        setDoc: vitest_1.vi.fn(),
    };
    return {
        initializeApp: vitest_1.vi.fn(),
        firestore: vitest_1.vi.fn(() => mockFirestoreInstance),
    };
});
// Mock LangGraph and FirestoreCheckpointer
vitest_1.vi.mock('@langchain/langgraph', function () {
    const mockCompile = vitest_1.vi.fn(() => ({
        invoke: vitest_1.vi.fn(async (input, config) => {
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
            }
            else if (config.configurable.threadId === 'test-thread-done') {
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
        getState: vitest_1.vi.fn(async (config) => {
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
            }
            else if (config.configurable.threadId === 'test-thread-done') {
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
        }),
    }));
    // Mock the StateGraph constructor
    const MockStateGraphInstance = {
        addNode: vitest_1.vi.fn().mockReturnThis(), // Mock addNode to return this for chaining
        addConditionalEdges: vitest_1.vi.fn().mockReturnThis(), // Mock addConditionalEdges to return this for chaining
        addEdge: vitest_1.vi.fn().mockReturnThis(), // Mock addEdge to return this for chaining
        compile: mockCompile, // Attach the mocked compile method
    };
    const MockStateGraph = vitest_1.vi.fn().mockImplementation(function (config) {
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
vitest_1.vi.mock('@langchain/core/messages', () => ({
    BaseMessage: vitest_1.vi.fn(),
    HumanMessage: class MockHumanMessage {
        constructor(content) {
            this.content = content;
            this.type = 'human';
        }
    },
    AIMessage: class MockAIMessage {
        constructor(content) {
            this.content = content;
            this.type = 'ai';
        }
    },
}));
(0, vitest_1.describe)('Firebase Functions Integration with LangGraph', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        // Get the mocked Firestore instance
        const firestore = admin.firestore();
        // Reset mock Firestore behavior for each test
        (firestore.getDoc).mockResolvedValue({
            exists: false,
            data: () => ({}),
        });
        (firestore.setDoc).mockResolvedValue(undefined);
    });
    (0, vitest_1.describe)('engrammerFlow_start', () => {
        (0, vitest_1.it)('should start an Engrammer flow and return a threadId', async () => {
            const mockRequest = {
                data: { query: 'test query', threadId: 'test-thread-123' },
                auth: { uid: 'test-user' },
            };
            const result = await (0, index_1.engrammerFlow_start)(mockRequest, {});
            (0, vitest_1.expect)(result).toEqual({ threadId: 'test-thread-123' });
            // Expect compiledEngrammer.invoke to be called
            // @ts-ignore
            (0, vitest_1.expect)(index_1.compiledEngrammer.invoke).toHaveBeenCalledWith({ query: 'test query', messages: [{ content: 'test query', type: 'human' }] }, { configurable: { threadId: 'test-thread-123' } });
        });
        (0, vitest_1.it)('should throw HttpsError if query is missing', async () => {
            const mockRequest = { data: {}, auth: { uid: 'test-user' } };
            await (0, vitest_1.expect)((0, index_1.engrammerFlow_start)(mockRequest, {})).rejects.toThrow(https_1.HttpsError);
            await (0, vitest_1.expect)((0, index_1.engrammerFlow_start)(mockRequest, {})).rejects.toHaveProperty('message', 'The function must be called with "query".');
        });
    });
    (0, vitest_1.describe)('getEngrammerState', () => {
        (0, vitest_1.it)('should return the current state of an Engrammer flow (interrupted)', async () => {
            const mockRequest = {
                data: { threadId: 'test-thread-interrupt' },
                auth: { uid: 'test-user' },
            };
            const result = await (0, index_1.getEngrammerState)(mockRequest, {});
            (0, vitest_1.expect)(result).toEqual({
                status: 'interrupted',
                latestResponse: null, // Changed from 'Mock latest response' to null
                pendingInsights: [{ type: 'new_strategy', description: 'Mock Insight' }],
                references: [], // Changed from null to []
                error: null,
            });
            // @ts-ignore
            (0, vitest_1.expect)(index_1.compiledEngrammer.getState).toHaveBeenCalledWith({ configurable: { threadId: 'test-thread-interrupt' } });
        });
        (0, vitest_1.it)('should return the current state of an Engrammer flow (done)', async () => {
            const mockRequest = {
                data: { threadId: 'test-thread-done' },
                auth: { uid: 'test-user' },
            };
            const result = await (0, index_1.getEngrammerState)(mockRequest, {});
            (0, vitest_1.expect)(result).toEqual({
                status: 'done',
                latestResponse: null, // Changed from 'Mock final response' to null
                pendingInsights: [], // Changed from null to []
                references: [], // Changed from null to []
                error: null,
            });
        });
        (0, vitest_1.it)('should throw HttpsError if threadId is missing', async () => {
            const mockRequest = { data: {}, auth: { uid: 'test-user' } };
            await (0, vitest_1.expect)((0, index_1.getEngrammerState)(mockRequest, {})).rejects.toThrow(https_1.HttpsError);
            await (0, vitest_1.expect)((0, index_1.getEngrammerState)(mockRequest, {})).rejects.toHaveProperty('message', 'The function must be called with "threadId".');
        });
    });
    (0, vitest_1.describe)('engrammerFlow_continue', () => {
        (0, vitest_1.it)('should continue an Engrammer flow with approved learning', async () => {
            const mockRequest = {
                data: { threadId: 'test-thread-123', userInput: 'approve_learning' },
                auth: { uid: 'test-user' },
            };
            const result = await (0, index_1.engrammerFlow_continue)(mockRequest, {});
            (0, vitest_1.expect)(result).toEqual({ status: 'done', error: null });
            // @ts-ignore
            (0, vitest_1.expect)(index_1.compiledEngrammer.invoke).toHaveBeenCalledWith(null, // Add null as the first argument
            { configurable: { threadId: 'test-thread-123' } });
        });
        (0, vitest_1.it)('should continue an Engrammer flow with rejected learning', async () => {
            const mockRequest = {
                data: { threadId: 'test-thread-123', userInput: 'reject_learning' },
                auth: { uid: 'test-user' },
            };
            const result = await (0, index_1.engrammerFlow_continue)(mockRequest, {});
            (0, vitest_1.expect)(result).toEqual({ status: 'done', error: null });
            // @ts-ignore
            (0, vitest_1.expect)(index_1.compiledEngrammer.invoke).toHaveBeenCalledWith({ messages: [{ content: 'User rejected insights.', type: 'human' }] }, { configurable: { threadId: 'test-thread-123' } });
        });
        (0, vitest_1.it)('should throw HttpsError if threadId or userInput is missing', async () => {
            const mockRequest1 = { data: { userInput: 'approve_learning' }, auth: { uid: 'test-user' } };
            await (0, vitest_1.expect)((0, index_1.engrammerFlow_continue)(mockRequest1, {})).rejects.toThrow(https_1.HttpsError);
            await (0, vitest_1.expect)((0, index_1.engrammerFlow_continue)(mockRequest1, {})).rejects.toHaveProperty('message', 'The function must be called with "threadId" and "userInput".');
            const mockRequest2 = { data: { threadId: 'test-thread-123' }, auth: { uid: 'test-user' } };
            await (0, vitest_1.expect)((0, index_1.engrammerFlow_continue)(mockRequest2, {})).rejects.toThrow(https_1.HttpsError);
            await (0, vitest_1.expect)((0, index_1.engrammerFlow_continue)(mockRequest2, {})).rejects.toHaveProperty('message', 'The function must be called with "threadId" and "userInput".');
        });
    });
    (0, vitest_1.describe)('engrammerFlow_getNote', () => {
        (0, vitest_1.it)('should return mock note data', async () => {
            const mockRequest = {
                data: { source: 'playbook', noteId: 'test-note-456' },
                auth: { uid: 'test-user' },
            };
            const result = await (0, index_1.engrammerFlow_getNote)(mockRequest, {});
            (0, vitest_1.expect)(result).toHaveProperty('id', 'test-note-456');
            (0, vitest_1.expect)(result).toHaveProperty('type', 'text');
            (0, vitest_1.expect)(result).toHaveProperty('content');
            (0, vitest_1.expect)(result).toHaveProperty('createdAt');
        });
        (0, vitest_1.it)('should throw HttpsError if source or noteId is missing', async () => {
            const mockRequest1 = { data: { noteId: 'test-note-456' }, auth: { uid: 'test-user' } };
            await (0, vitest_1.expect)((0, index_1.engrammerFlow_getNote)(mockRequest1, {})).rejects.toThrow(https_1.HttpsError);
            await (0, vitest_1.expect)((0, index_1.engrammerFlow_getNote)(mockRequest1, {})).rejects.toHaveProperty('message', 'The function must be called with "source" and "noteId".');
            const mockRequest2 = { data: { source: 'playbook' }, auth: { uid: 'test-user' } };
            await (0, vitest_1.expect)((0, index_1.engrammerFlow_getNote)(mockRequest2, {})).rejects.toThrow(https_1.HttpsError);
            await (0, vitest_1.expect)((0, index_1.engrammerFlow_getNote)(mockRequest2, {})).rejects.toHaveProperty('message', 'The function must be called with "source" and "noteId".');
        });
    });
});
//# sourceMappingURL=index.test.js.map