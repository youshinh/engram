import { initializeApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Note } from "./db";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

// ==================================================================
// Callable Functions
// ==================================================================

// Note: The 'data' property is automatically unwrapped by the SDK.
// The return type of httpsCallable<RequestData, ResponseData> is Promise<HttpsCallableResult<ResponseData>>
// and result.data gives you ResponseData.

export const findConnectionsCloud = httpsCallable<{ note: Note, contextNotes: Note[] }, { suggestions: any[] }>(functions, 'findConnectionsCloud');

export const embedNote = httpsCallable<{ content: string | Blob, mimeType?: string }, { embedding: number[], caption?: string }>(functions, 'embedNote');

// --- Engrammer v1.1 Functions ---

export const engrammerFlow_start = httpsCallable<{ query: string, threadId?: string }, { threadId: string }>(functions, 'engrammerFlow_start');

export const getEngrammerState = httpsCallable<{ threadId: string }, any>(functions, 'getEngrammerState');

export const engrammerFlow_continue = httpsCallable<{ threadId: string, userInput: string }, any>(functions, 'engrammerFlow_continue');

export const engrammerFlow_getNote = httpsCallable<{ source: string, noteId: string }, Note | null>(functions, 'engrammerFlow_getNote');