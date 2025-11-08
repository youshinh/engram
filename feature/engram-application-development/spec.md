# Technical Specification: en:gram Application (v1.1)

**Version**: 1.1
**Author**: Gemini
**Date**: 2025-11-03

## 1. Overview & Technical Approach

en:gram is an intelligent creative partner that discovers and suggests unexpected connections between a user's thoughts (notes). It is built on the core principles of **Local-First** architecture, a **Hybrid AI** model, and a **Self-Improving AI Agent (Engrammer)**.

Version 1.1 introduces a significant architectural evolution by fully embracing **LangGraph.js 1.0**. The Engrammer agent is now an **asynchronous, durable, and interactive system** featuring a Supervisor architecture and a Human-in-the-Loop (HITL) learning flow. This improves UX by eliminating long waits for AI responses and enhances the agent's capabilities.

## 2. Technology Stack

| Category | Technology | Justification |
|---|---|---|
| Language | TypeScript (v5+) | Strict typing, scalability, as specified in design documents. |
| Frontend | React (v18+), Vite | Modern, component-based UI development with a fast dev experience. |
| Client DB | Dexie.js (v4+) | High-performance IndexedDB wrapper for Local-First storage and reactive queries. |
| Backend | Firebase Cloud Functions (Node.js 20) | Scalable, serverless environment for hosting API and Engrammer logic. |
| AI (Client) | `window.ai` (Gemini Nano) | Fulfills hackathon requirement; ensures maximum privacy and low latency for initial insights. |
| AI (Backend) | Google AI SDK (Gemini Pro/Flash), Vertex AI | Powers cloud fallback, advanced analysis, and multimodal embedding. |
| AI Orchestration | **LangGraph.js 1.0** | **Core of the Engrammer**. Enables stateful, durable, and complex agentic workflows (Supervisor, HITL). |
| UI Libraries | reactflow, react-canvas-draw, @react-three/fiber | For graph visualization, sketch input, and 3D model rendering, respectively. |
| Testing | Vitest, React Testing Library | Fast and efficient unit/integration testing for the chosen stack. |
| Styling | CSS (Global variables, modules) | Implementation of the "Glassmorphism" design principle and theming. |

## 3. Architecture (v1.1)

### 3.1. Architectural Diagram (v1.1)

```mermaid
graph TD;
    subgraph Client (Browser)
        A[User] --> B(React SPA);
        B --> C{Local DB (Dexie.js)};
        B --> D{On-Device AI (Gemini Nano)};
    end

    subgraph Backend (Firebase)
        E(Cloud Functions);
        G(Firestore);
        H(Authentication);
    end

    subgraph Google Cloud
        F(Google AI Services);
    end

    B -- REST/RPC --> E;
    D -- Fallback --> E;
    E -- LangGraph.js --> G[Firestore as Checkpointer];
    E -- Google AI SDK --> F[Gemini & Vertex AI];

    style B fill:#cde,stroke:#333,stroke-width:2px;
    style E fill:#f9f,stroke:#333,stroke-width:2px;
    style G fill:#f96,stroke:#333,stroke-width:2px;
```

### 3.2. Component & Data Flow Breakdown (v1.1)

1.  **Client (React SPA)**:
    *   **UI/UX**: Implements the "Glassmorphism" design. Key components include `NoteInput`, `NoteCard`, `EngrammerFlow` (for async interaction), and `GraphView` (for connection visualization).
    *   **State Management**: `App.tsx` serves as the orchestrator, managing global UI state and `engrammerSessions`. It uses `useLiveQuery` for reactive data fetching from Dexie.js.
    *   **Local-First AI**: `getInsightSuggestions` function first attempts to generate connections using the on-device Gemini Nano.
    *   **Background Workers**: `useEffect` hooks in `App.tsx` monitor the local DB for notes needing embedding or insight generation.
    *   **Engrammer Client**: Initiates Engrammer flows via `engrammerFlow_start`, then polls for state updates using `getEngrammerState`.

2.  **Backend (Firebase Services)**:
    *   **Cloud Functions**: Hosts all server-side logic.
        *   `embedNote`, `findConnectionsCloud`, `summarizeUrl`: Standard callable functions for specific tasks.
        *   **`engrammerFlow_start`**: Asynchronously starts a LangGraph execution and immediately returns a `threadId`.
        *   **`getEngrammerState`**: Retrieves the current state of a running Engrammer graph from Firestore.
        *   **`engrammerFlow_continue`**: Resumes an interrupted graph execution based on user input (HITL).
    *   **Firestore**: Acts as the persistent storage layer for the **LangGraph Checkpointer**, saving the entire state of the Engrammer agent at each step.
    *   **Authentication**: Secures all backend APIs.

3.  **AI Services (Google Cloud)**:
    *   **Gemini Pro/Flash**: Used by the Engrammer's Supervisor and sub-agents for reasoning and generation.
    *   **Vertex AI (Multimodal Embedding)**: Generates vector embeddings for text and images via the `embedNote` function.

## 4. Data Model (v1.1)

*Refer to 【資料2/8】データベース設計書 (v1.1).md for the full specification.*

### Entity: Note (v1.1 Summary)

-   **Key Fields**: `id`, `createdAt`, `updatedAt`, `type`, `content`, `autoCaption`.
-   **Hierarchy & Management**: `projectId`, `status` ('active'/'archived'), `isPinned`.
-   **Context**: `location`, `isCompleted`.
-   **AI Pipeline**: `embedding`, `embeddingStatus`, `insightStatus`.

### Entity: Relation (v1.1 Summary)

-   **Key Fields**: `id`, `createdAt`, `sourceId`, `targetId`, `projectId`.
-   **Source & Feedback**: `source` ('ai_suggestion'/'user_manual'), `reasoning`, `userReasoning`, `feedback` ('pending'/'useful'/'harmful'/'edited').
-   **Engrammer Link**: `engrammerThreadId` (Links the relation to the specific AI thought process that generated it).

## 5. Risks and Constraints (v1.1 Update)

-   **Technical Risks**: The complexity of the asynchronous, stateful Engrammer requires robust error handling and state management on both client and server. The reliability of the Firestore Checkpointer is critical for agent durability.
-   **Dependencies**: Now heavily dependent on LangGraph 1.0 and its specific patterns (StateGraph, Checkpointers, Middleware).
-   **Assumptions**: The Firebase Functions v2 environment is suitable for long-running or background-triggered graph executions initiated by `engrammerFlow_start`.