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
exports.engrammerFlow_getNote = exports.engrammerFlow_continue = exports.getEngrammerState = exports.engrammerFlow_start = exports.embedNote = exports.findConnectionsCloud = exports.compiledEngrammer = void 0;
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const zod_1 = require("zod"); // Import Zod
admin.initializeApp();
const db = admin.firestore(); // Initialize Firestore
const generative_ai_1 = require("@google/generative-ai");
const params_1 = require("firebase-functions/params");
// LangGraph Imports
const langgraph_1 = require("@langchain/langgraph");
const langgraphjs_checkpoint_firestore_1 = require("@cassina/langgraphjs-checkpoint-firestore");
const messages_1 = require("@langchain/core/messages");
// Define Gemini API Key from environment
const geminiApiKey = (0, params_1.defineString)("GEMINI_API_KEY");
// Initialize the Gemini client
let genAI;
// --- 1. Common Data Structures (Zod Schemas) ---
// LLMに厳密なJSON出力を強制するためのスキーマ
/**
 * 1.1. 自動接続 (`findConnectionsCloud`) の出力スキーマ
 * @description オンデバイスAIと共通化された、自動接続の単一の提案。
 * 改善案#5 に基づき、LangChain 1.0 の構造化出力機能で利用する。
 */
const ConnectionSuggestionSchema = zod_1.z.object({
    targetNoteId: zod_1.z.string().uuid()
        .describe("接続先の既存ノートの一意なID (UUIDv4)。"),
    reasoning: zod_1.z.string()
        .describe("表面的でない、洞察に満ちた接続理由。"),
});
/**
 * 1.2. `findConnectionsCloud` の最終出力スキーマ
 */
const FindConnectionsOutputSchema = zod_1.z.array(ConnectionSuggestionSchema).max(3)
    .describe("自動接続の提案（0〜3件）の配列。");
/**
 * 1.3. Engrammer の洞察 (Reflector の出力) スキーマ
 * @description Engrammer (Reflectorノード) が自己改善のために生成する構造化された洞察。
 * LangGraph の withStructuredOutput で使用する。
 */
const ReflectorInsightSchema = zod_1.z.object({
    type: zod_1.z.enum(["new_strategy", "refine_strategy", "error_pattern"])
        .describe("洞察の種別: 新規戦略、戦略の洗練、エラーパターン。"),
    description: zod_1.z.string()
        .describe("プレイブックに保存するための、一般化された具体的な指示や洞察。"),
    source_bullet_id: zod_1.z.string().uuid().optional()
        .describe("typeが 'refine_strategy' の場合、洗練対象の既存プレイブック弾丸ID。"),
});
/**
 * 1.4. Engrammer の参照ノート（Supervisor が使用）スキーマ
 * @description Engrammer がどの知識源を参照したかを示す。
 * クライアントの `handleFeedbackClick` で使用される。
 */
const EngrammerReferenceSchema = zod_1.z.object({
    source: zod_1.z.enum(["local_db", "playbook", "woodworking_db", "web_search", "3d_model_db"])
        .describe("Engrammer (Supervisor) が参照した知識源。"),
    noteId: zod_1.z.string()
        .describe("その知識源におけるノート/ドキュメントのID。"),
});
// --- 3. LangGraph 1.0 のセットアップ (概念) ---
const firestoreCheckpointer = new langgraphjs_checkpoint_firestore_1.FirestoreSaver({
    firestore: db,
    checkpointCollectionName: "engrammer_checkpoints",
});
// 3.2. 専門エージェント (Supervisorの子ノード) (改善案#4)
// const tools = [new TavilySearchResults({ maxResults: 3 })]; // (Web検索ツール例)
// const woodworkingDbTool = /* ... (複合機能#9 のためのカスタムツール) ... */;
// const summarizationAgent = createAgent({ llm: llm, tools: [tools], prompt: ... });
// const woodworkingAgent = createAgent({ llm: llm, tools: [woodworkingDbTool], prompt: ... });
// const generatorAgent = /* ... (従来の Generator ロジックを持つエージェント) ... */;
// 3.3. Reflector ノード (HITL対応) (改善案#1)
async function reflectorNode(state) {
    logger.info("Engrammer: Executing Reflector Node");
    // In a real scenario, this would analyze messages and generate insights
    // For now, we'll return a mock insight to trigger HITL
    return {
        pendingInsights: [{
                type: "new_strategy",
                description: "Mock insight: User is interested in connecting diverse topics."
            }]
    };
}
// 3.4. Curator ノード
async function curatorNode(state) {
    logger.info("Engrammer: Executing Curator Node");
    // In a real scenario, this would update the playbook based on approved insights
    // For now, it just clears pending insights
    return { playbook: [...(state.playbook || []), ...(state.pendingInsights || [])], pendingInsights: undefined };
}
// 3.5. Supervisor ルーティング関数 (改善案#4)
function supervisorRouter(state) {
    logger.info("Engrammer: Supervisor routing task...");
    // For this initial implementation, we'll simplify the routing
    // If there are pending insights, we go to Reflector, otherwise to Curator or END
    if (state.pendingInsights && state.pendingInsights.length > 0) {
        return "Reflector"; // Should not happen if HITL is working as expected
    }
    // After initial generation, we always go to Reflector
    return "Reflector";
}
// 3.6. HITL ルーティング関数 (改善案#1)
function hitlRouter(state) {
    // Reflector ノードの後に配置
    if (state.pendingInsights && state.pendingInsights.length > 0) {
        logger.info("Engrammer: Insights found. Interrupting for Human-in-the-Loop.");
        // 洞察がある場合、HITL のためにグラフを一時停止 (interrupt)
        return "Curator";
    }
    logger.info("Engrammer: No new insights. Ending graph.");
    // 洞察がなければ学習不要、そのまま終了
    return langgraph_1.END;
}
// 3.7. Engrammer グラフの構築 (StateGraph)
const engrammerGraphBuilder = new langgraph_1.StateGraph({
    channels: {
        query: {
            reducer: (x, y) => y,
            defaultValue: "",
        },
        messages: {
            reducer: (x, y) => (x || []).concat(y),
            defaultValue: [],
        },
        playbook: {
            reducer: (x, y) => (x || []).concat(y),
            defaultValue: [],
        },
        pendingInsights: {
            reducer: (x, y) => y,
            defaultValue: [],
        },
        references: {
            reducer: (x, y) => y,
            defaultValue: [],
        },
        currentTask: {
            reducer: (x, y) => y,
            defaultValue: "",
        },
        summarizationResult: {
            reducer: (x, y) => y,
            defaultValue: "",
        },
        woodworkingResult: {
            reducer: (x, y) => y,
            defaultValue: null,
        },
        generatorResult: {
            reducer: (x, y) => y,
            defaultValue: "",
        },
    }, // Explicitly cast to a compatible type
})
    .addNode("Reflector", reflectorNode)
    .addNode("Curator", curatorNode)
    .addConditionalEdges(langgraph_1.START, supervisorRouter, {
    "Reflector": "Reflector",
    "Curator": "Curator", // Fallback, should be handled by HITL
    [langgraph_1.END]: langgraph_1.END,
})
    .addConditionalEdges("Reflector", hitlRouter, {
    "Curator": "Curator",
    [langgraph_1.END]: langgraph_1.END,
})
    .addEdge("Curator", langgraph_1.END); // After curator, the flow ends for now
// 3.8. ミドルウェア (改善案#3) - Not implemented yet
// 3.9. グラフのコンパイル
// @ts-ignore
exports.compiledEngrammer = engrammerGraphBuilder.compile({ checkpointer: firestoreCheckpointer });
// Placeholder for findConnectionsCloud
exports.findConnectionsCloud = (0, https_1.onCall)({ cors: true }, async (request) => {
    logger.info("findConnectionsCloud called with data:", request.data);
    if (!genAI) {
        // Initialize Gemini AI with the API key from environment variables
        // For local development, set this in .env.local file (GEMINI_API_KEY=...)
        // For production, set this as a secret in Google Cloud Secret Manager
        genAI = new generative_ai_1.GoogleGenerativeAI(geminiApiKey.value());
    }
    if (!request.data.note) {
        throw new https_1.HttpsError("invalid-argument", "The function must be called with one argument \"note\".");
    }
    const { note: newNote, contextNotes } = request.data;
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const contextNotesContent = contextNotes
        .map((note) => `  - Note ID: ${note.id}, Content: ${JSON.stringify(note.content).substring(0, 100)}...`)
        .join("\n");
    const prompt = `
    You are an AI assistant designed to find insightful connections between notes.
    A new note has been created. Your task is to analyze it in the context of existing notes and identify any potential relationships, inspirations, or contradictions.

    New Note (ID: ${newNote.id}):
    Content: ${JSON.stringify(newNote.content)}

    Existing Notes for Context:
    ${contextNotesContent}

    Based on the new note, identify up to 3 existing notes that have a strong connection to it.
    For each connection, provide a brief reasoning for the relationship.

    Respond with a JSON array of objects in the following format. If no connections are found, return an empty array.
    [
      {
        "targetNoteId": "<ID of the connected existing note>",
        "reasoning": "<Your brief explanation for the connection>"
      }
    ]
  `;
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const jsonString = response.text().replace(/```json\n|```/g, '').trim();
        const suggestions = JSON.parse(jsonString);
        return { suggestions };
    }
    catch (error) {
        logger.error("Error calling Gemini API:", error);
        throw new https_1.HttpsError("internal", "Failed to get suggestions from Gemini API.");
    }
});
// Placeholder for embedNote
exports.embedNote = (0, https_1.onCall)({ cors: true }, async (request) => {
    logger.info("embedNote called with data:", request.data);
    if (!genAI) {
        genAI = new generative_ai_1.GoogleGenerativeAI(geminiApiKey.value());
    }
    const { content, mimeType } = request.data;
    if (!content) {
        throw new https_1.HttpsError("invalid-argument", "The function must be called with \"content\".");
    }
    try {
        if (mimeType && mimeType.startsWith("image/")) {
            // 1. Generate a caption for the image
            const generativeModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const imagePart = { inlineData: { data: content, mimeType } };
            const prompt = "Describe this image concisely for the purpose of finding related notes.";
            const captionResult = await generativeModel.generateContent([prompt, imagePart]);
            const caption = captionResult.response.text();
            if (!caption) {
                throw new Error("Failed to generate a caption for the image.");
            }
            logger.info(`Generated caption for image: "${caption}"`);
            // 2. Embed the generated caption
            const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
            const embeddingResult = await embeddingModel.embedContent(caption);
            return {
                embedding: embeddingResult.embedding.values,
                caption: caption
            };
        }
        else {
            // For text notes, directly embed the content
            const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
            const embeddingResult = await embeddingModel.embedContent(content);
            return {
                embedding: embeddingResult.embedding.values
            };
        }
    }
    catch (error) {
        logger.error("Error during embedding process:", error); // Log the full error object
        throw new https_1.HttpsError("internal", "Failed to get embedding from Gemini API.");
    }
});
// Placeholder for engrammerFlow_start
exports.engrammerFlow_start = (0, https_1.onCall)({ cors: true }, async (request) => {
    logger.info("engrammerFlow_start called with data:", request.data);
    if (!request.data.query) {
        throw new https_1.HttpsError("invalid-argument", "The function must be called with \"query\".");
    }
    const threadId = request.data.threadId || `thread_${Date.now()}`;
    logger.info(`Starting Engrammer flow with threadId: ${threadId}`);
    const { query } = request.data;
    const config = { configurable: { threadId } };
    // Invoke the LangGraph in a non-blocking way
    // In a real scenario, you might use a task queue (e.g., Cloud Tasks)
    // to truly run this in the background and handle retries.
    // For this implementation, we'll let it run to the first interrupt or END.
    exports.compiledEngrammer.invoke({ query, messages: [new messages_1.HumanMessage(query)] }, config)
        .catch(error => logger.error(`Error during background Engrammer invocation for thread ${threadId}:`, error));
    return { threadId };
});
// Placeholder for getEngrammerState
exports.getEngrammerState = (0, https_1.onCall)({ cors: true }, async (request) => {
    var _a;
    logger.info("getEngrammerState called with data:", request.data);
    if (!request.data.threadId) {
        throw new https_1.HttpsError("invalid-argument", "The function must be called with \"threadId\".");
    }
    const { threadId } = request.data;
    const config = { configurable: { threadId } };
    try {
        const currentState = await exports.compiledEngrammer.getState(config);
        const stateData = currentState.values;
        // 【資料6/8】の 4.4 に準拠したレスポンスを構築
        const response = {
            status: currentState.next.length === 0 ? "done" : (currentState.next.includes("interrupt") ? "interrupted" : "running"),
            latestResponse: stateData.generatorResult || ((_a = stateData.messages.filter(m => m instanceof messages_1.AIMessage).pop()) === null || _a === void 0 ? void 0 : _a.content) || null,
            pendingInsights: stateData.pendingInsights || null,
            references: stateData.references || null,
            error: null
        };
        return response;
    }
    catch (error) {
        logger.error(`getEngrammerState Error for thread ${threadId}:`, error);
        throw new https_1.HttpsError("not-found", "State not found for threadId or an internal error occurred.");
    }
});
// Placeholder for engrammerFlow_continue
exports.engrammerFlow_continue = (0, https_1.onCall)({ cors: true }, async (request) => {
    logger.info("engrammerFlow_continue called with data:", request.data);
    if (!request.data.threadId || !request.data.userInput) {
        throw new https_1.HttpsError("invalid-argument", "The function must be called with \"threadId\" and \"userInput\".");
    }
    const { threadId, userInput } = request.data;
    const config = { configurable: { threadId } };
    try {
        if (userInput === 'approve_learning') {
            // Resume the graph, which should execute the Curator node
            await exports.compiledEngrammer.invoke(null, config);
        }
        else {
            // If rejected, we might want to transition to END or a different path
            // For now, we'll just let it end without updating playbook
            await exports.compiledEngrammer.invoke({ messages: [new messages_1.HumanMessage("User rejected insights.")] }, config);
        }
        return { status: "done", error: null };
    }
    catch (error) {
        logger.error(`engrammerFlow_continue Error for thread ${threadId}:`, error);
        throw new https_1.HttpsError("internal", "Engrammer failed to continue.");
    }
});
// Placeholder for engrammerFlow_getNote
exports.engrammerFlow_getNote = (0, https_1.onCall)({ cors: true }, async (request) => {
    logger.info("engrammerFlow_getNote called with data:", request.data);
    if (!request.data.source || !request.data.noteId) {
        throw new https_1.HttpsError("invalid-argument", "The function must be called with \"source\" and \"noteId\".");
    }
    const { source, noteId } = request.data;
    try {
        // In a real scenario, you would fetch from the specified source (e.g., Firestore collection)
        // For now, this mock returns a dummy note object.
        return {
            id: noteId,
            type: "text",
            content: `(Mock Data) This is the content for note [${noteId}] fetched from the '${source}' knowledge base. It's about the characteristics of beech wood.`,
            createdAt: new Date().toISOString()
        };
    }
    catch (error) {
        logger.error(`engrammerFlow_getNote Error for source ${source}, noteId ${noteId}:`, error);
        throw new https_1.HttpsError("internal", "Failed to get note.");
    }
});
//# sourceMappingURL=index.js.map