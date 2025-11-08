import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod"; // Import Zod

admin.initializeApp();
const db = admin.firestore(); // Initialize Firestore

import { GoogleGenerativeAI } from "@google/generative-ai";
import { defineString } from "firebase-functions/params";

// LangGraph Imports
import { StateGraph, START, END } from "@langchain/langgraph";
// import { FirestoreCheckpointer } from "@langchain/langgraph-checkpoint/firestore"; // Removed
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";

// Define Gemini API Key from environment
const geminiApiKey = defineString("GEMINI_API_KEY");

// Initialize the Gemini client
let genAI: GoogleGenerativeAI;

// --- 1. Common Data Structures (Zod Schemas) ---
// LLMに厳密なJSON出力を強制するためのスキーマ

/**
 * 1.1. 自動接続 (`findConnectionsCloud`) の出力スキーマ
 * @description オンデバイスAIと共通化された、自動接続の単一の提案。
 * 改善案#5 に基づき、LangChain 1.0 の構造化出力機能で利用する。
 */
const ConnectionSuggestionSchema = z.object({
  targetNoteId: z.string().uuid()
    .describe("接続先の既存ノートの一意なID (UUIDv4)。"),
  reasoning: z.string()
    .describe("表面的でない、洞察に満ちた接続理由。"),
});

/**
 * 1.2. `findConnectionsCloud` の最終出力スキーマ
 */
const FindConnectionsOutputSchema = z.array(ConnectionSuggestionSchema).max(3)
  .describe("自動接続の提案（0〜3件）の配列。");

/**
 * 1.3. Engrammer の洞察 (Reflector の出力) スキーマ
 * @description Engrammer (Reflectorノード) が自己改善のために生成する構造化された洞察。
 * LangGraph の withStructuredOutput で使用する。
 */
const ReflectorInsightSchema = z.object({
  type: z.enum(["new_strategy", "refine_strategy", "error_pattern"])
    .describe("洞察の種別: 新規戦略、戦略の洗練、エラーパターン。"),
  description: z.string()
    .describe("プレイブックに保存するための、一般化された具体的な指示や洞察。"),
  source_bullet_id: z.string().uuid().optional()
    .describe("typeが 'refine_strategy' の場合、洗練対象の既存プレイブック弾丸ID。"),
});

/**
 * 1.4. Engrammer の参照ノート（Supervisor が使用）スキーマ
 * @description Engrammer がどの知識源を参照したかを示す。
 * クライアントの `handleFeedbackClick` で使用される。
 */
const EngrammerReferenceSchema = z.object({
  source: z.enum(["local_db", "playbook", "woodworking_db", "web_search", "3d_model_db"])
    .describe("Engrammer (Supervisor) が参照した知識源。"),
  noteId: z.string()
    .describe("その知識源におけるノート/ドキュメントのID。"),
});

// --- 2. Engrammer (LangGraph 1.0) の内部状態定義 ---

/**
 * 2.1. Engrammer の AgentState
 * @description LangGraph の StateGraph で管理される永続的な状態。
 * FirestoreCheckpointer により Firestore に保存される。
 */
interface EngrammerAgentState {
  // 必須フィールド
  query: string; // 最新のユーザー入力
  messages: BaseMessage[]; // 対話履歴
    
  // 長期記憶 (プレイブック)
  playbook: any[]; // (PlaybookBullet[]: プレイブックの現在の状態)
    
  // Supervisor (改善案#4) がタスクを振り分けるためのフィールド
  currentTask: string; // Supervisor が決定した現在のタスク
    
  // 専門エージェント (Subgraphs) の出力
  summarizationResult?: string;
  woodworkingResult?: any; // (複合機能#9 の結果)
  generatorResult?: string; // (GeneratorAgent の分析結果Markdown)
    
  // HITL (改善案#1) 用: Reflector が生成した承認待ちの洞察
  pendingInsights?: z.infer<typeof ReflectorInsightSchema>[];
    
  // 最終応答でクライアントに返す参照ノート
  references?: z.infer<typeof EngrammerReferenceSchema>[];
}

// --- 3. LangGraph 1.0 のセットアップ (概念) ---

interface CheckpointTuple {
  config: any;
  checkpoint: any;
  parent_config?: any;
}

// Mock FirestoreCheckpointer for now due to dependency conflicts
class MockFirestoreCheckpointer {
  private store: Map<string, any> = new Map();

  // Required by BaseCheckpointSaver
  public serde: any = {
    // Mock a simple serializer/deserializer
    // In a real implementation, this would handle serialization of Checkpoint objects
    dump: (obj: any) => JSON.stringify(obj),
    load: (s: string) => JSON.parse(s),
  };

  // Required by BaseCheckpointSaver
  public config_specs: any[] = [
    // Mock config specs, typically for thread_id and thread_ts
    { id: "thread_id", type: "string" },
    { id: "thread_ts", type: "string" },
  ];

  constructor(options: { db: any; collectionName: string }) {
    // Mock constructor, no actual Firestore interaction
  }

  async get(config: { configurable: { threadId: string } }): Promise<any> {
    const threadId = config.configurable.threadId;
    return this.store.get(threadId);
  }

  async put(config: { configurable: { threadId: string } }, value: any): Promise<any> {
    const threadId = config.configurable.threadId;
    this.store.set(threadId, value);
    return config; // Return the config as a dummy RunnableConfig
  }

  // Placeholder for other required methods
  async getTuple(config: { configurable: { threadId: string } }): Promise<CheckpointTuple | undefined> {
    return undefined;
  }

  async *list(config: { configurable: { threadId: string } }): AsyncGenerator<CheckpointTuple> {
    // Yield nothing for mock
  }

  async putWrites(config: { configurable: { threadId: string } }, writes: any): Promise<void> {
    // No-op for mock
  }

  async deleteThread(threadId: string): Promise<void> {
    this.store.delete(threadId);
  }

  getNextVersion(current: number | undefined): number {
    return (current || 0) + 1;
  }

  // Asynchronous counterparts (for simplicity, just call sync versions)
  async aget(config: { configurable: { threadId: string } }): Promise<any> {
    return this.get(config);
  }

  async agetTuple(config: { configurable: { threadId: string } }): Promise<CheckpointTuple | undefined> {
    return this.getTuple(config);
  }

  async *alist(config: { configurable: { threadId: string } }): AsyncGenerator<CheckpointTuple> {
    yield* this.list(config);
  }

  async aput(config: { configurable: { threadId: string } }, value: any): Promise<any> {
    return this.put(config, value);
  }

  async aputWrites(config: { configurable: { threadId: string } }, writes: any): Promise<void> {
    return this.putWrites(config, writes);
  }

  async adeleteThread(threadId: string): Promise<void> {
    return this.deleteThread(threadId);
  }
}
const firestoreCheckpointer = new MockFirestoreCheckpointer({
  db: db, // Still pass the mock db for consistency, though not used by MockFirestoreCheckpointer
  collectionName: "engrammer_checkpoints",
});

// 3.2. 専門エージェント (Supervisorの子ノード) (改善案#4)
// const tools = [new TavilySearchResults({ maxResults: 3 })]; // (Web検索ツール例)
// const woodworkingDbTool = /* ... (複合機能#9 のためのカスタムツール) ... */;

// const summarizationAgent = createAgent({ llm: llm, tools: [tools], prompt: ... });
// const woodworkingAgent = createAgent({ llm: llm, tools: [woodworkingDbTool], prompt: ... });
// const generatorAgent = /* ... (従来の Generator ロジックを持つエージェント) ... */;

// 3.3. Reflector ノード (HITL対応) (改善案#1)
async function reflectorNode(state: EngrammerAgentState): Promise<Partial<EngrammerAgentState>> {
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
async function curatorNode(state: EngrammerAgentState): Promise<Partial<EngrammerAgentState>> {
  logger.info("Engrammer: Executing Curator Node");
  // In a real scenario, this would update the playbook based on approved insights
  // For now, it just clears pending insights
  return { playbook: [...(state.playbook || []), ...(state.pendingInsights || [])], pendingInsights: undefined };
}

// 3.5. Supervisor ルーティング関数 (改善案#4)
function supervisorRouter(state: EngrammerAgentState): "Reflector" | "Curator" | typeof END {
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
function hitlRouter(state: EngrammerAgentState): "Curator" | typeof END {
  // Reflector ノードの後に配置
  if (state.pendingInsights && state.pendingInsights.length > 0) {
    logger.info("Engrammer: Insights found. Interrupting for Human-in-the-Loop.");
    // 洞察がある場合、HITL のためにグラフを一時停止 (interrupt)
    return "Curator";
  }
  logger.info("Engrammer: No new insights. Ending graph.");
  // 洞察がなければ学習不要、そのまま終了
  return END;
}

// 3.7. Engrammer グラフの構築 (StateGraph)
const engrammerGraphBuilder = new StateGraph<EngrammerAgentState>({
  channels: {
    query: {
      reducer: (x: string | undefined, y: string) => y,
      defaultValue: "",
    },
    messages: {
      reducer: (x: BaseMessage[] | undefined, y: BaseMessage[]) => (x || []).concat(y),
      defaultValue: [],
    },
    playbook: {
      reducer: (x: any[] | undefined, y: any[]) => (x || []).concat(y),
      defaultValue: [],
    },
    pendingInsights: {
      reducer: (x: z.infer<typeof ReflectorInsightSchema>[] | undefined, y: z.infer<typeof ReflectorInsightSchema>[]) => y,
      defaultValue: [],
    },
    references: {
      reducer: (x: z.infer<typeof EngrammerReferenceSchema>[] | undefined, y: z.infer<typeof EngrammerReferenceSchema>[]) => y,
      defaultValue: [],
    },
    currentTask: {
      reducer: (x: string | undefined, y: string) => y,
      defaultValue: "",
    },
    summarizationResult: {
      reducer: (x: string | undefined, y: string) => y,
      defaultValue: "",
    },
    woodworkingResult: {
      reducer: (x: any | undefined, y: any) => y,
      defaultValue: null,
    },
    generatorResult: {
      reducer: (x: string | undefined, y: string) => y,
      defaultValue: "",
    },
  } as Record<keyof EngrammerAgentState, any>, // Explicitly cast to a compatible type
})
  .addNode("Reflector", reflectorNode)
  .addNode("Curator", curatorNode)
  .addConditionalEdges(START, supervisorRouter, {
    "Reflector": "Reflector",
    "Curator": "Curator", // Fallback, should be handled by HITL
    [END]: END,
  })
  .addConditionalEdges("Reflector", hitlRouter, {
    "Curator": "Curator",
    [END]: END,
  })
  .addEdge("Curator", END); // After curator, the flow ends for now

// 3.8. ミドルウェア (改善案#3) - Not implemented yet

// 3.9. グラフのコンパイル
export const compiledEngrammer = engrammerGraphBuilder.compile({ checkpointer: firestoreCheckpointer });

// Placeholder for findConnectionsCloud
export const findConnectionsCloud = onCall({ cors: true }, async (request) => {
  logger.info("findConnectionsCloud called with data:", request.data);

  if (!genAI) {
    // Initialize Gemini AI with the API key from environment variables
    // For local development, set this in .env.local file (GEMINI_API_KEY=...)
    // For production, set this as a secret in Google Cloud Secret Manager
    genAI = new GoogleGenerativeAI(geminiApiKey.value());
  }

  if (!request.data.note) {
    throw new HttpsError("invalid-argument", "The function must be called with one argument \"note\".");
  }

  const { note: newNote, contextNotes } = request.data;

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash"});

  const contextNotesContent = contextNotes
    .map((note: any) => `  - Note ID: ${note.id}, Content: ${JSON.stringify(note.content).substring(0, 100)}...`)
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
  } catch (error) {
    logger.error("Error calling Gemini API:", error);
    throw new HttpsError("internal", "Failed to get suggestions from Gemini API.");
  }
});

// Placeholder for embedNote
export const embedNote = onCall({ cors: true }, async (request) => {
  logger.info("embedNote called with data:", request.data);

  if (!genAI) {
    genAI = new GoogleGenerativeAI(geminiApiKey.value());
  }

  const { content, mimeType } = request.data;

  if (!content) {
    throw new HttpsError("invalid-argument", "The function must be called with \"content\".");
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

    } else {
      // For text notes, directly embed the content
      const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
      const embeddingResult = await embeddingModel.embedContent(content as string);
      
      return { 
        embedding: embeddingResult.embedding.values 
      };
    }

  } catch (error) {
    logger.error("Error during embedding process:", error); // Log the full error object
    throw new HttpsError("internal", "Failed to get embedding from Gemini API.");
  }
});

// Placeholder for engrammerFlow_start
export const engrammerFlow_start = onCall({ cors: true }, async (request) => {
  logger.info("engrammerFlow_start called with data:", request.data);
  if (!request.data.query) {
    throw new HttpsError("invalid-argument", "The function must be called with \"query\".");
  }
  const threadId = request.data.threadId || `thread_${Date.now()}`;
  logger.info(`Starting Engrammer flow with threadId: ${threadId}`);

  const { query } = request.data;
  const config = { configurable: { threadId } };

  // Invoke the LangGraph in a non-blocking way
  // In a real scenario, you might use a task queue (e.g., Cloud Tasks)
  // to truly run this in the background and handle retries.
  // For this implementation, we'll let it run to the first interrupt or END.
  compiledEngrammer.invoke({ query, messages: [new HumanMessage(query)] } as Partial<EngrammerAgentState>, config)
    .catch(error => logger.error(`Error during background Engrammer invocation for thread ${threadId}:`, error));

  return { threadId };
});

// Placeholder for getEngrammerState
export const getEngrammerState = onCall({ cors: true }, async (request) => {
  logger.info("getEngrammerState called with data:", request.data);
  if (!request.data.threadId) {
    throw new HttpsError("invalid-argument", "The function must be called with \"threadId\".");
  }
  const { threadId } = request.data;
  const config = { configurable: { threadId } };
    
  try {
    const currentState = await compiledEngrammer.getState(config);
    const stateData = currentState.values as EngrammerAgentState;
      
    // 【資料6/8】の 4.4 に準拠したレスポンスを構築
    const response = {
      status: currentState.next.length === 0 ? "done" : (currentState.next.includes("interrupt") ? "interrupted" : "running"),
      latestResponse: stateData.generatorResult || stateData.messages.filter(m => m instanceof AIMessage).pop()?.content || null,
      pendingInsights: stateData.pendingInsights || null,
      references: stateData.references || null,
      error: null
    };
    return response;

  } catch (error) {
    logger.error(`getEngrammerState Error for thread ${threadId}:`, error);
    throw new HttpsError("not-found", "State not found for threadId or an internal error occurred.");
  }
});

// Placeholder for engrammerFlow_continue
export const engrammerFlow_continue = onCall({ cors: true }, async (request) => {
  logger.info("engrammerFlow_continue called with data:", request.data);
  if (!request.data.threadId || !request.data.userInput) {
    throw new HttpsError("invalid-argument", "The function must be called with \"threadId\" and \"userInput\".");
  }
    
  const { threadId, userInput } = request.data;
  const config = { configurable: { threadId } };

  try {
    if (userInput === 'approve_learning') {
      // Resume the graph, which should execute the Curator node
      await compiledEngrammer.invoke(null, config);
    } else {
      // If rejected, we might want to transition to END or a different path
      // For now, we'll just let it end without updating playbook
      await compiledEngrammer.invoke({ messages: [new HumanMessage("User rejected insights.")] } as Partial<EngrammerAgentState>, config);
    }
      
    return { status: "done", error: null };
  } catch (error) {
    logger.error(`engrammerFlow_continue Error for thread ${threadId}:`, error);
    throw new HttpsError("internal", "Engrammer failed to continue.");
  }
});

// Placeholder for engrammerFlow_getNote
export const engrammerFlow_getNote = onCall({ cors: true }, async (request) => {
  logger.info("engrammerFlow_getNote called with data:", request.data);
  if (!request.data.source || !request.data.noteId) {
    throw new HttpsError("invalid-argument", "The function must be called with \"source\" and \"noteId\".");
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
  } catch (error) {
    logger.error(`engrammerFlow_getNote Error for source ${source}, noteId ${noteId}:`, error);
    throw new HttpsError("internal", "Failed to get note.");
  }
});
