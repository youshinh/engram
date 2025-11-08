# **【資料7/8】バックエンドAPI設計書の説明 (v1.1)**

このドキュメントでは、en:gram のバックエンドである Firebase Functions の API 仕様と、「Engrammer」（LangGraph 1.0 ベースの自己改善エージェント）の内部構造を定義しています。

v1.1 での主な変更点は以下の通りです。

1. ACEエージェントを「Engrammer」に名称変更しました。  
2. LangGraph 1.0 のアーキテクチャ（Supervisor, Checkpointer, Middleware, HITL）を全面的に採用しました。  
3. Engrammer の呼び出しフローを非同期・ポーリング方式に変更しました。  
4. 複合機能（マルチモーダルEmbedding, ツール連携, URL要約）に対応しました。

「**Engrammer**」への名称変更、`LangGraph 1.0`\[cite: LangChain/LangGraph 1.0 詳細調査計画\]の先進的機能（`Supervisor`\[cite: LangChain/LangGraph 1.0 詳細調査計画\]、非同期`Checkpointer`\[cite: LangChain/LangGraph 1.0 詳細調査計画\]、`Middleware`\[cite: LangChain/LangGraph 1.0 詳細調査計画\]、HITL\[cite: LangChain/LangGraph 1.0 詳細調査計画\]）、`create_agent`\[cite: LangChain/LangGraph 1.0 詳細調査計画\]、および複合機能（マルチモーダルEmbedding\[cite: engram\_database\_design\_v1.1.md\]、ツール連携\[cite: 複合機能提案\]）のすべてを反映させた、Firebase Functions の詳細な設計仕様となります。

import \* as functions from "firebase-functions";  
import \* as admin from "firebase-admin";  
import { HttpsError } from "firebase-functions/v2/https";  
import { z } from "zod";  
import { StateGraph, START, END, GraphState } from "@langchain/langgraph";  
import { FirestoreCheckpointer } from "@langchain/langgraph/checkpoint/firestore"; // (仮: 適切な永続化ストア)  
import { ModelCallLimitMiddleware } from "langgraph\_middleware\_module"; // (仮: 改善案\#3 のミドルウェア)  
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";  
import { ChatOpenAI } from "@langchain/openai"; // (または ChatVertexAI)  
import { createAgent, ToolStrategy } from "langchain/agents"; // (改善案\#5 create\_agent)  
import { TavilySearchResults } from "@langchain/community/tools/tavily\_search"; // (複合機能\#2 ツール例)

// \--- Firebase Admin SDK の初期化 \---  
// (※ 実際の index.ts のトップレベルで実行)  
// admin.initializeApp();  
// const db \= admin.firestore();

// \--- 1\. 共通データ構造（Zodスキーマ）---  
// LLMに厳密なJSON出力を強制するためのスキーマ

/\*\*  
 \* 1.1. 自動接続 (\`findConnectionsCloud\`) の出力スキーマ  
 \* @description オンデバイスAIと共通化された、自動接続の単一の提案。  
 \* 改善案\#5 に基づき、LangChain 1.0 の構造化出力機能で利用する。  
 \*/  
const ConnectionSuggestionSchema \= z.object({  
  targetNoteId: z.string().uuid()  
    .describe("接続先の既存ノートの一意なID (UUIDv4)。"),  
  reasoning: z.string()  
    .describe("表面的でない、洞察に満ちた接続理由。"),  
});

/\*\*  
 \* 1.2. \`findConnectionsCloud\` の最終出力スキーマ  
 \*/  
const FindConnectionsOutputSchema \= z.array(ConnectionSuggestionSchema).max(3)  
  .describe("自動接続の提案（0〜3件）の配列。");

/\*\*  
 \* 1.3. Engrammer の洞察 (Reflector の出力) スキーマ  
 \* @description Engrammer (Reflectorノード) が自己改善のために生成する構造化された洞察。  
 \* LangGraph の withStructuredOutput で使用する。  
 \*/  
const ReflectorInsightSchema \= z.object({  
  type: z.enum(\["new\_strategy", "refine\_strategy", "error\_pattern"\])  
    .describe("洞察の種別: 新規戦略、戦略の洗練、エラーパターン。"),  
  description: z.string()  
    .describe("プレイブックに保存するための、一般化された具体的な指示や洞察。"),  
  source\_bullet\_id: z.string().uuid().optional()  
    .describe("typeが 'refine\_strategy' の場合、洗練対象の既存プレイブック弾丸ID。"),  
});

/\*\*  
 \* 1.4. Engrammer の参照ノート（Supervisor が使用）スキーマ  
 \* @description Engrammer がどの知識源を参照したかを示す。  
 \* クライアントの \`handleFeedbackClick\`\[cite:App.tsx\] で使用される。  
 \*/  
const EngrammerReferenceSchema \= z.object({  
  source: z.enum(\["local\_db", "playbook", "woodworking\_db", "web\_search", "3d\_model\_db"\])  
    .describe("Engrammer (Supervisor) が参照した知識源。"),  
  noteId: z.string()  
    .describe("その知識源におけるノート/ドキュメントのID。"),  
});

// \--- 2\. Engrammer (LangGraph 1.0) の内部状態定義 \---

/\*\*  
 \* 2.1. Engrammer の AgentState  
 \* @description LangGraph の StateGraph で管理される永続的な状態。  
 \* FirestoreCheckpointer\[cite:LangChain/LangGraph 1.0 詳細調査計画\] により Firestore に保存される。  
 \*/  
interface EngrammerAgentState extends GraphState {  
  // 必須フィールド  
  query: string; // 最新のユーザー入力  
  messages: BaseMessage\[\]; // 対話履歴  
    
  // 長期記憶 (プレイブック)  
  playbook: any\[\]; // (PlaybookBullet\[\]: プレイブックの現在の状態)  
    
  // Supervisor\[cite:LangChain/LangGraph 1.0 詳細調査計画\] (改善案\#4) がタスクを振り分けるためのフィールド  
  currentTask: string; // Supervisor が決定した現在のタスク  
    
  // 専門エージェント (Subgraphs\[cite:LangChain/LangGraph 1.0 詳細調査計画\]) の出力  
  summarizationResult?: string;  
  woodworkingResult?: any; // (複合機能\#9 の結果)  
  generatorResult?: string; // (GeneratorAgent の分析結果Markdown)  
    
  // HITL\[cite:LangChain/LangGraph 1.0 詳細調査計画\] (改善案\#1) 用: Reflector\[cite:ACEアルゴリズムJavaScript実装ガイド.md\] が生成した承認待ちの洞察  
  pendingInsights?: z.infer\<typeof ReflectorInsightSchema\>\[\];  
    
  // 最終応答でクライアントに返す参照ノート  
  references?: z.infer\<typeof EngrammerReferenceSchema\>\[\];  
}

// \--- 3\. LangGraph 1.0 のセットアップ (概念) \---  
// (※ 実際の index.ts または別ファイル (e.g., engrammer.ts) で定義)

// 3.1. 永続化ストア (改善案\#2)  
// const firestoreCheckpointer \= new FirestoreCheckpointer({  
//   db: admin.firestore(),  
//   collectionName: "engrammer\_checkpoints",  
// });

// 3.2. 専門エージェント (Supervisor\[cite:LangChain/LangGraph 1.0 詳細調査計画\]の子ノード) (改善案\#4)  
// const tools \= \[new TavilySearchResults({ maxResults: 3 })\]; // (Web検索ツール例)  
// const woodworkingDbTool \= /\* ... (複合機能\#9 のためのカスタムツール) ... \*/;

// const summarizationAgent \= createAgent({ llm: llm, tools: \[tools\], prompt: ... });  
// const woodworkingAgent \= createAgent({ llm: llm, tools: \[woodworkingDbTool\], prompt: ... });  
// const generatorAgent \= /\* ... (従来の Generator\[cite:ACEアルゴリズムJavaScript実装ガイド.md\] ロジックを持つエージェント) ... \*/;

// 3.3. Reflector ノード (HITL\[cite:LangChain/LangGraph 1.0 詳細調査計画\]対応) (改善案\#1)  
async function reflectorNode(state: EngrammerAgentState): Promise\<Partial\<EngrammerAgentState\>\> {  
  console.log("Engrammer: Executing Reflector Node");  
  // const llm \= new ChatOpenAI({ model: "gpt-4o" });  
  // const structuredReflector \= llm.withStructuredOutput(ReflectorInsightSchema);  
  // const insights \= await structuredReflector.invoke("Analyze this history: " \+ JSON.stringify(state.messages));  
  // return { pendingInsights: insights };  
  return {}; // 仮  
}

// 3.4. Curator ノード  
async function curatorNode(state: EngrammerAgentState): Promise\<Partial\<EngrammerAgentState\>\> {  
  console.log("Engrammer: Executing Curator Node");  
  // const updatedPlaybook \= ... (state.playbook と state.pendingInsights をマージ\[cite:ACEアルゴリズムJavaScript実装ガイド.md\]) ...  
  // return { playbook: updatedPlaybook, pendingInsights: undefined };  
  return {}; // 仮  
}

// 3.5. Supervisor ルーティング関数 (改善案\#4)  
function supervisorRouter(state: EngrammerAgentState): "SummarizationAgent" | "WoodworkingAgent" | "GeneratorAgent" | "Reflector" {  
  console.log("Engrammer: Supervisor routing task...");  
  // ... state.query と state.currentTask に基づいて次に実行するノードを決定 ...  
  // if (state.generatorResult) return "Reflector"; // GeneratorAgent が終わったら Reflector へ  
  // if (state.query.includes("summarize")) return "SummarizationAgent";  
  // if (state.query.includes("wood") || state.query.includes("木材")) return "WoodworkingAgent";  
  // return "GeneratorAgent";  
  return "GeneratorAgent"; // 仮  
}

// 3.6. HITL\[cite:LangChain/LangGraph 1.0 詳細調査計画\] ルーティング関数 (改善案\#1)  
function hitlRouter(state: EngrammerAgentState): "Curator" | typeof END {  
  // Reflector\[cite:ACEアルゴリズムJavaScript実装ガイド.md\] ノードの後に配置  
  if (state.pendingInsights && state.pendingInsights.length \> 0\) {  
    console.log("Engrammer: Insights found. Interrupting for Human-in-the-Loop.");  
    // 洞察がある場合、HITL\[cite:LangChain/LangGraph 1.0 詳細調査計画\] のためにグラフを一時停止 (interrupt)  
    return "interrupt";  
  }  
  console.log("Engrammer: No new insights. Ending graph.");  
  // 洞察がなければ学習不要、そのまま終了  
  return END;  
}

// 3.7. Engrammer グラフの構築 (StateGraph\[cite:LangChain/Graph 1.0 詳細調査計画\])  
// const engrammerGraphBuilder \= new StateGraph\<EngrammerAgentState\>({ ... })  
//   .addNode("Supervisor", supervisorNode) // (supervisorNode は create\_agent\[cite:LangChain/Graph 1.0 詳細調査計画\] または llm.invoke で実装)  
//   .addNode("SummarizationAgent", summarizationAgent)  
//   .addNode("WoodworkingAgent", woodworkingAgent)  
//   .addNode("GeneratorAgent", generatorAgent)  
//   .addNode("Reflector", reflectorNode)  
//   .addNode("Curator", curatorNode)  
//   .addConditionalEntryPoint(supervisorRouter, { ... }) // (START \-\> Supervisor\[cite:LangChain/Graph 1.0 詳細調査計画\] \-\> 各エージェントへ)  
//   .addEdge("SummarizationAgent", END) // (実際は Supervisor\[cite:LangChain/Graph 1.0 詳細調査計画\] に戻るのが一般的)  
//   .addEdge("WoodworkingAgent", END)  
//   .addEdge("GeneratorAgent", "Reflector")  
//   .addConditionalEdges("Reflector", hitlRouter, { "Curator": "Curator", \[END\]: END })  
//   .addEdge("Curator", END);

// 3.8. ミドルウェア (改善案\#3)  
// engrammerGraphBuilder.addMiddleware(new ModelCallLimitMiddleware(10));

// 3.9. グラフのコンパイル  
// const compiledEngrammer \= engrammerGraphBuilder.compile({ checkpointer: firestoreCheckpointer });

// \--- 4\. Firebase Functions v2 API 定義 \---

/\*\*  
 \* 4.1. embedNote (HTTP v2 Request)  
 \* @description ノートのコンテンツを受け取り、Embeddingベクトルと自動キャプションを生成する。  
 \* 【資料5/8】\[cite:engram\_client\_ai\_logic\_v1.1.md\] 4.1.2 のバックエンド。  
 \*/  
export const embedNote \= functions.https.onRequest(  
  // { secrets: \["VERTEX\_API\_KEY"\] }, // (本番環境で必要)  
  async (req, res) \=\> {  
    // ... CORS ハンドリング ...  
    if (req.method \!== "POST") return res.status(405).send("Method Not Allowed");

    // 1\. ペイロード検証 (Zod)  
    const payloadSchema \= z.object({  
      noteId: z.string().uuid(),  
      type: z.nativeEnum(NoteType), // (engram\_database\_design\_v1.1.md で定義された NoteType)  
      content: z.string(), // (text, url) or Base64 string  
    });  
    const parseResult \= payloadSchema.safeParse(req.body);  
    if (\!parseResult.success) return res.status(400).json(parseResult.error);  
      
    const { noteId, type, content } \= parseResult.data;  
    let embedding: number\[\] | null \= null;  
    let autoCaption: string | null \= null;

    // 2\. モデル呼び出し (Vertex AI / OpenAI)  
    try {  
      if (type \=== "text" || type \=== "url" || type \=== "project\_summary") {  
        // embedding \= await vertexEmbedText(content);  
      } else if (type \=== "image" || type \===img\_sketch") {  
        // 複合機能\[cite:複合機能提案\]: マルチモーダルモデルでEmbeddingとキャプションを同時に生成  
        // const \[imgEmbedding, caption\] \= await vertexEmbedImageAndCaption(content);  
        // embedding \= imgEmbedding;  
        // autoCaption \= caption;  
      } else if (type \=== "model\_3d" || type \=== "audio" || type \=== "project") {  
        // v1.1 では Embedding 対象外とする (または content が Base64 でないため別処理)  
        embedding \= null;   
      }

      // 3\. 正常な応答  
      res.status(200).json({  
        noteId: noteId,  
        embedding: embedding,  
        autoCaption: autoCaption, // (UIがノートのcontent\[cite:db.ts\]に設定するため)  
      });

    } catch (error) {  
      console.error(\`Embedding Error for noteId ${noteId}:\`, error);  
      res.status(500).send("Embedding generation failed.");  
    }  
});

/\*\*  
 \* 4.2. findConnectionsCloud (HTTP v2 Callable)  
 \* @description 自動接続のクラウドフォールバック。LangChain 1.0 \`create\_agent\`\[cite:LangChain/LangGraph 1.0 詳細調査計画\]（改善案\#5）で実装。  
 \* 【資料5/8】\[cite:engram\_client\_ai\_logic\_v1.1.md\] 3.2.2 のバックエンド。  
 \*/  
export const findConnectionsCloud \= functions.https.onCall(async (request) \=\> {  
  // 1\. ペイロード検証 (Zod)  
  const payloadSchema \= z.object({  
    newNote: z.any(), // (Note オブジェクト)  
    contextNotes: z.array(z.any()), // (Note オブジェクトの配列)  
  });  
  const parseResult \= payloadSchema.safeParse(request.data);  
  if (\!parseResult.success) {  
    throw new HttpsError("invalid-argument", "Invalid payload: " \+ parseResult.error.message);  
  }  
  const { newNote, contextNotes } \= parseResult.data;

  // 2\. LangChain 1.0 \`create\_agent\`\[cite:LangChain/Graph 1.0 詳細調査計画\] のセットアップ (改善案\#5)  
  // const llm \= new ChatOpenAI({ model: "gpt-4o-mini" });  
  // ToolStrategy\[cite:LangChain/Graph 1.0 詳細調査計画\] を使い、FindConnectionsOutputSchema を強制  
  // const structuredLLM \= llm.withStructuredOutput(FindConnectionsOutputSchema, { name: "findConnections" });  
  // const prompt \= ChatPromptTemplate.fromMessages(\[  
  //   \["system", "あなたは en:gram のAIです。... FindConnectionsOutputSchema の形式で回答してください。"\],  
  //   \["human", "New Note: {newNote}\\n\\nContext Notes: {contextNotes}"\]  
  // \]);  
    
  try {  
    // 3\. 構造化LLMの直接呼び出し（Agentが不要な場合）  
    // const result \= await structuredLLM.invoke(prompt.format({ ... }));  
      
    const suggestions: z.infer\<typeof FindConnectionsOutputSchema\> \= \[\]; // 仮データ  
    return suggestions; // (クライアントの App.tsx\[cite:App.tsx\] は \`result.data\`\[cite:App.tsx\] でこれを受け取る)

  } catch (error) {  
    console.error("findConnectionsCloud Error:", error);  
    throw new HttpsError("internal", "Failed to find connections.");  
  }  
});

/\*\*  
 \* 4.3. summarizeUrl (HTTP v2 Callable)  
 \* @description 複合機能\[cite:複合機能提案\] (WebClipper, Project) のため。URLを受け取り要約を返す。  
 \*/  
export const summarizeUrl \= functions.https.onCall(async (request) \=\> {  
  const payloadSchema \= z.object({ url: z.string().url() });  
  const parseResult \= payloadSchema.safeParse(request.data);  
  if (\!parseResult.success) {  
    throw new HttpsError("invalid-argument", "Invalid URL payload.");  
  }  
    
  try {  
    // ... (e.g., Cheerio でWebスクレイピング \+ LLM で要約) ...  
    // const summary \= await llm.invoke("Summarize this: " \+ scrapedContent);  
    // return { summary: summary.content };  
    return { summary: "This is a summary." }; // 仮データ  
  } catch (error) {  
    throw new HttpsError("internal", "Failed to summarize URL.");  
  }  
});

// \--- 5\. Engrammer (LangGraph 1.0) 非同期・HITL\[cite:LangChain/Graph 1.0 詳細調査計画\] API群 \---  
// 【資料6/8】\[cite:engram\_ace\_integration\_design\_v1.1.md\] で定義されたインターフェース

/\*\*  
 \* 5.1. engrammerFlow\_start (改善案\#2)  
 \* @description Engrammer の実行を開始し、即座に threadId\[cite:LangChain/LangGraph 1.0 詳細調査計画\] を返す。  
 \*/  
export const engrammerFlow\_start \= functions.https.onCall(async (request) \=\> {  
  const payloadSchema \= z.object({  
    query: z.string(),  
    threadId: z.string().min(1), // クライアントで生成された \`engrammer-thread-uuid\`  
  });  
  const parseResult \= payloadSchema.safeParse(request.data);  
  if (\!parseResult.success) {  
    throw new HttpsError("invalid-argument", "Invalid payload.");  
  }

  const { query, threadId } \= parseResult.data;  
  const config \= { configurable: { threadId } };  
    
  try {  
    // compiledEngrammer.invoke({ ... }) を "await せずに" 実行（バックグラウンドで開始）  
    // ※ Firebase Functions v2 (2nd gen) の方がバックグラウンド実行に適している  
    // v1.1 の簡易実装: 即座に invoke し、最初の interrupt\[cite:LangChain/Graph 1.0 詳細調査計画\] または END\[cite:ACEアルゴリズムJavaScript実装ガイド.md\] まで同期的に待つ  
      
    // await compiledEngrammer.invoke({ query, messages: \[new HumanMessage(query)\] }, config);  
      
    // クライアントはこの後 getEngrammerState で状態を取得しに来る  
    return { threadId: threadId };   
  } catch (error) {  
    console.error("engrammerFlow\_start Error:", error);  
    throw new HttpsError("internal", "Engrammer failed to start.");  
  }  
});

/\*\*  
 \* 5.2. getEngrammerState (改善案\#2)  
 \* @description LangGraph\[cite:LangChain/Graph 1.0 詳細調査計画\] の Checkpointer\[cite:LangChain/Graph 1.0 詳細調査計画\] から現在の状態を取得する。  
 \*/  
export const getEngrammerState \= functions.https.onCall(async (request) \=\> {  
  const payloadSchema \= z.object({ threadId: z.string() });  
  const parseResult \= payloadSchema.safeParse(request.data);  
  if (\!parseResult.success) {  
    throw new HttpsError("invalid-argument", "Invalid payload.");  
  }  
  const { threadId } \= request.data;  
  const config \= { configurable: { threadId } };  
    
  try {  
    // const currentState \= await compiledEngrammer.getState(config);  
    // const stateData \= currentState.values;  
      
    // 【資料6/8】\[cite:engram\_ace\_integration\_design\_v1.1.md\] の 4.4 に準拠したレスポンスを構築  
    // const response \= {  
    //   status: currentState.next.length \=== 0 ? "done" : (currentState.next\[0\] \=== "Reflector" ? "running" : "interrupted"), // 'interrupt'\[cite:LangChain/Graph 1.0 詳細調査計画\]ノードを定義するか、next\[0\] で判断  
    //   latestResponse: stateData.messages.filter(m \=\> m instanceof AIMessage).pop()?.content || null,  
    //   pendingInsights: stateData.pendingInsights || null,  
    //   references: stateData.references || null,  
    //   error: null  
    // };  
    // return response;

    // 仮データ (HITL\[cite:LangChain/Graph 1.0 詳細調査計画\] のデモ用)  
    return {   
      status: "interrupted", // 'running', 'interrupted', 'done', 'error'  
      latestResponse: "Supervisor\[cite:LangChain/Graph 1.0 詳細調査計画\]がタスクを分析しました。\`GeneratorAgent\`が『木工\[cite:user\_provided\_info\]ノート』と『AIエージェント\[cite:user\_provided\_info\]ノート』の間に新しいテーマを発見しました。\`Reflector\`\[cite:ACEアルゴリズムJavaScript実装ガイド.md\]が以下の洞察を生成しました。",  
      pendingInsights: \[{ type: "new\_strategy", description: "ユーザーの『木工』\[cite:user\_provided\_info\]と『AIエージェント』\[cite:user\_provided\_info\]の興味は、『自律的なプロセス設計』という点で共通している。" }\],  
      references: \[{ source: "local\_db", noteId: "uuid-note-1" }, { source: "local\_db", noteId: "uuid-note-2" }\],  
      error: null   
    };

  } catch (error) {  
    console.error("getEngrammerState Error:", error);  
    throw new HttpsError("not-found", "State not found for threadId.");  
  }  
});

/\*\*  
 \* 5.3. engrammerFlow\_continue (改善案\#1 \- HITL\[cite:LangChain/Graph 1.0 詳細調査計画\])  
 \* @description ユーザーの承認を受け、一時停止中のグラフを再開（Curator\[cite:ACEアルゴリズムJavaScript実装ガイド.md\]を実行）する。  
 \*/  
export const engrammerFlow\_continue \= functions.https.onCall(async (request) \=\> {  
  const payloadSchema \= z.object({  
    threadId: z.string(),  
    userInput: z.enum(\['approve\_learning', 'reject\_learning'\]), // ユーザーのHITL応答  
  });  
  const parseResult \= payloadSchema.safeParse(request.data);  
  if (\!parseResult.success) {  
    throw new HttpsError("invalid-argument", "Invalid payload.");  
  }  
    
  const { threadId, userInput } \= parseResult.data;  
  const config \= { configurable: { threadId } };

  try {  
    // if (userInput \=== 'approve\_learning') {  
    //   // グラフを再開（Curator\[cite:ACEアルゴリズムJavaScript実装ガイド.md\]ノードが実行される）  
    //   // compiledEngrammer.invoke(null, config) は、次の interrupt\[cite:LangChain/Graph 1.0 詳細調査計画\] または END\[cite:ACEアルゴリズムJavaScript実装ガイド.md\] まで実行される  
    //   await compiledEngrammer.invoke(null, config);   
    // } else {  
    //   // グラフを「拒否」状態で再開する  
    //   // (HITLRouter\[cite:engram\_backend\_api\_design\_v1.1.ts\] が 'reject\_learning' を見て END\[cite:ACEアルゴリズムJavaScript実装ガイド.md\] に遷移するよう設計する)  
    //   await compiledEngrammer.invoke({ messages: \[new HumanMessage("User rejected insights.")\] }, config);  
    // }  
      
    return { status: "done", error: null }; // 仮データ  
  } catch (error) {  
    console.error("engrammerFlow\_continue Error:", error);  
    throw new HttpsError("internal", "Engrammer failed to continue.");  
  }  
});

/\*\*  
 \* 5.4. engrammerFlow\_getNote (複合機能\#9, \#15)  
 \* @description Supervisor\[cite:LangChain/Graph 1.0 詳細調査計画\] が参照した専門DB（例: 木工DB\[cite:user\_provided\_info\]）のノートを取得する。  
 \*/  
export const engrammerFlow\_getNote \= functions.https.onCall(async (request) \=\> {  
  const payloadSchema \= z.object({  
    source: z.enum(\["playbook", "woodworking\_db", "3d\_model\_db"\]), // local\_db はクライアントが持つ  
    noteId: z.string(),  
  });  
  const parseResult \= payloadSchema.safeParse(request.data);  
  if (\!parseResult.success) {  
    throw new HttpsError("invalid-argument", "Invalid payload.");  
  }

  const { source, noteId } \= request.data;  
    
  try {  
    let noteContent: any \= null;  
    // if (source \=== 'playbook') {  
    //   // Firestore の Playbook コレクションから取得  
    // } else if (source \=== 'woodworking\_db') {  
    //   // 専門DB（Firestore コレクション or 外部API）から取得  
    // } else {  
    //   throw new HttpsError("invalid-argument", "Invalid source type.");  
    // }  
    // return noteContent; // (Note\[cite:db.ts\] オブジェクト形式で返す)

    return { id: noteId, type: "text", content: \`(Mock Data) ${source}から取得したノート\[${noteId}\]です。内容は「${source \=== 'woodworking\_db' ? 'ブナ材の特徴について...' : 'プレイブックの戦略...'}\`」, createdAt: new Date().toISOString() }; // 仮データ  
  } catch (error) {  
    console.error("engrammerFlow\_getNote Error:", error);  
    throw new HttpsError("internal", "Failed to get note.");  
  }  
});

