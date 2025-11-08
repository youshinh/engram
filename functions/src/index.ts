import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";

admin.initializeApp();

import { GoogleGenerativeAI } from "@google/generative-ai";
import { defineString } from "firebase-functions/params";

// Define Gemini API Key from environment
const geminiApiKey = defineString("GEMINI_API_KEY");

// Initialize the Gemini client
let genAI: GoogleGenerativeAI;

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
  // In a real scenario, we would start the LangGraph execution here (non-blocking)
  return { threadId };
});

// Placeholder for getEngrammerState
export const getEngrammerState = onCall({ cors: true }, async (request) => {
  logger.info("getEngrammerState called with data:", request.data);
  if (!request.data.threadId) {
    throw new HttpsError("invalid-argument", "The function must be called with \"thread_id\".");
  }
  // This mock simulates a state where the AI has processed the query
  // and is now waiting for user feedback (Human-in-the-Loop).
  return {   
    status: "interrupted", // 'running', 'interrupted', 'done', 'error'  
    latestResponse: "Supervisor analyzed the task and found a new theme between 'Woodworking Notes' and 'AI Agent Notes'. Reflector generated the following insight.",  
    pendingInsights: [{ type: "new_strategy", description: "The user's interest in 'woodworking' and 'AI agents' shares a common theme of 'autonomous process design'." }],  
    references: [{ source: "local_db", noteId: "uuid-note-1" }, { source: "local_db", noteId: "uuid-note-2" }],  
    error: null   
  };
});

// Placeholder for engrammerFlow_continue
export const engrammerFlow_continue = onCall({ cors: true }, async (request) => {
  logger.info("engrammerFlow_continue called with data:", request.data);
  if (!request.data.threadId || !request.data.userInput) {
    throw new HttpsError("invalid-argument", "The function must be called with \"thread_id\" and \"userInput\".");
  }
  // This mock simulates the end of the flow after user input.
  return { status: "done", error: null };
});

// Placeholder for engrammerFlow_getNote
export const engrammerFlow_getNote = onCall({ cors: true }, async (request) => {
  logger.info("engrammerFlow_getNote called with data:", request.data);
  if (!request.data.source || !request.data.noteId) {
    throw new HttpsError("invalid-argument", "The function must be called with \"source\" and \"noteId\".");
  }
  const { source, noteId } = request.data;
  // This mock returns a dummy note object.
  return { 
    id: noteId, 
    type: "text", 
    content: `(Mock Data) This is the content for note [${noteId}] fetched from the '${source}' knowledge base. It's about the characteristics of beech wood.`, 
    createdAt: new Date().toISOString() 
  };
});
