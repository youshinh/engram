import { initializeApp } from 'firebase/app';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { Note } from './db';

// Firebaseプロジェクトの設定
// TODO: 実際のFirebaseプロジェクト設定に置き換える
const firebaseConfig = {
  apiKey: "dummy-api-key",
  authDomain: "engram-2025.firebaseapp.com",
  projectId: "engram-2025",
  storageBucket: "engram-2025.appspot.com",
  messagingSenderId: "dummy-sender-id",
  appId: "dummy-app-id"
};

// Firebaseアプリを初期化
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

// ローカルエミュレータを使用する場合
if (import.meta.env.DEV) {
  connectFunctionsEmulator(functions, 'localhost', 5001); // Cloud Functionsエミュレータのポート
}

interface InsightSuggestion {
  targetNoteId: string;
  reasoning: string;
}

// findConnectionsCloud Cloud Functionを呼び出す
export async function findConnectionsCloud(
  newNote: { id: string; type: Note['type']; content: string | Blob },
  contextNotes: { id: string; type: Note['type']; content: string | Blob }[]
): Promise<InsightSuggestion[]> {
  const callable = httpsCallable<any, { suggestions: InsightSuggestion[] }>(functions, 'findConnectionsCloud');
  const result = await callable({ note: newNote, contextNotes });
  return result.data.suggestions;
}

// embedNote Cloud Functionを呼び出す
export const embedNote = httpsCallable<{
  content: string;
  mimeType?: string;
}, {
  embedding: number[];
  caption?: string;
}>(functions, 'embedNote');

interface EngrammerFlowResponse {
  thread_id: string;
  state: any; // LangGraphの状態は動的であるためany
}

// Engrammerフローを開始する Cloud Functionを呼び出す
export async function engrammerFlow_start(
  query: string
): Promise<EngrammerFlowResponse> {
  const callable = httpsCallable<any, EngrammerFlowResponse>(functions, 'engrammerFlow_start');
  const result = await callable({ query });
  return result.data;
}

// Engrammerの状態を取得する Cloud Functionを呼び出す
export async function getEngrammerState(
  thread_id: string
): Promise<EngrammerFlowResponse> {
  const callable = httpsCallable<any, EngrammerFlowResponse>(functions, 'getEngrammerState');
  const result = await callable({ thread_id });
  return result.data;
}

// Engrammerフローを続行する Cloud Functionを呼び出す
export async function engrammerFlow_continue(
  thread_id: string,
  userInput: string
): Promise<EngrammerFlowResponse> {
  const callable = httpsCallable<any, EngrammerFlowResponse>(functions, 'engrammerFlow_continue');
  const result = await callable({ thread_id, userInput });
  return result.data;
}

// getPlaybookNote Cloud Functionを呼び出す
export async function engrammerFlow_getNote(noteId: string): Promise<Note | null> {
  const callable = httpsCallable<any, Note | null>(functions, 'engrammerFlow_getNote');
  const result = await callable({ noteId });
  return result.data;
}
