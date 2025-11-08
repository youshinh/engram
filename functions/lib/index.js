"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.engrammerFlow_getNote = exports.engrammerFlow_continue = exports.getEngrammerState = exports.engrammerFlow_start = exports.embedNote = exports.findConnectionsCloud = void 0;
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const https_1 = require("firebase-functions/v2/https");
admin.initializeApp();
const generative_ai_1 = require("@google/generative-ai");
const params_1 = require("firebase-functions/params");
// Define Gemini API Key from environment
const geminiApiKey = (0, params_1.defineString)("GEMINI_API_KEY");
// Initialize the Gemini client
let genAI;
// Placeholder for findConnectionsCloud
exports.findConnectionsCloud = (0, https_1.onCall)(async (request) => {
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
exports.embedNote = (0, https_1.onCall)(async (request) => {
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
exports.engrammerFlow_start = (0, https_1.onCall)(async (request) => {
    logger.info("engrammerFlow_start called with data:", request.data);
    // TODO: Implement actual logic
    if (!request.data.query) {
        throw new https_1.HttpsError("invalid-argument", "The function must be called with \"query\".");
    }
    const thread_id = `thread_${Date.now()}`;
    return { thread_id, state: [{ type: "start", query: request.data.query }] };
});
// Placeholder for getEngrammerState
exports.getEngrammerState = (0, https_1.onCall)(async (request) => {
    logger.info("getEngrammerState called with data:", request.data);
    // TODO: Implement actual logic
    if (!request.data.thread_id) {
        throw new https_1.HttpsError("invalid-argument", "The function must be called with \"thread_id\".");
    }
    return { state: [{ type: "end", result: "This is a dummy response." }] };
});
// Placeholder for engrammerFlow_continue
exports.engrammerFlow_continue = (0, https_1.onCall)(async (request) => {
    logger.info("engrammerFlow_continue called with data:", request.data);
    // TODO: Implement actual logic
    if (!request.data.thread_id || !request.data.userInput) {
        throw new https_1.HttpsError("invalid-argument", "The function must be called with \"thread_id\" and \"userInput\".");
    }
    return { state: [{ type: "end", result: "User input processed." }] };
});
// Placeholder for engrammerFlow_getNote
exports.engrammerFlow_getNote = (0, https_1.onCall)(async (request) => {
    logger.info("engrammerFlow_getNote called with data:", request.data);
    // TODO: Implement actual logic
    if (!request.data.noteId) {
        throw new https_1.HttpsError("invalid-argument", "The function must be called with \"noteId\".");
    }
    return null; // Return null as we don't have a real note
});
//# sourceMappingURL=index.js.map