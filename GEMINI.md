# **Main Project Context: en:gram (v1.1)**

This document defines the strategic context, technical specifications, and operational framework for the en:gram project, version 1.1. It is the canonical source of truth for development, reflecting the latest architectural decisions based on LangGraph 1.0.

## **1. Core Instructions & Guidelines**

All development must strictly adhere to the specifications outlined in the 8 design documents (v1.1) and the LLM Development Guidelines:

1.  **[【資料1/8】システム概要とアーキテクチャ設計書 (v1.1).md]**: Defines the Hybrid, Local-First, **asynchronous Engrammer** architecture.
2.  **[【資料2/8】データベース設計書 (v1.1).md]**: Defines the Dexie.js schema for `notes` and `relations`, including new fields for composite features.
3.  **[【資料3/8】フロントエンド基本設計書 (v1.1).md]**: Defines the component structure, "Frosted Glass" design, and the **asynchronous state management** for Engrammer sessions.
4.  **[【資料4/8】主要UIコンポーネント詳細設計書 (v1.1).md]**: Defines the implementation of React components, including the new `EngrammerFlow.tsx` and the `GraphView.tsx`.
5.  **[【資料5/8】クライアントサイドAIロジック設計書 (v1.1).md]**: Defines the client-side AI logic, including background workers and the `getInsightSuggestions` hybrid engine.
6.  **[【資料6/8】Engrammer（ACE）連携設計書 (v1.1).md]**: Defines the **asynchronous, polling-based, HITL-enabled** communication flow between the client and the Engrammer.
7.  **[【資料7/8】バックエンドAPI設計書 (v1.1).md]**: Defines all Firebase Cloud Functions, including the new asynchronous Engrammer endpoints (`engrammerFlow_start`, `getEngrammerState`, `engrammerFlow_continue`).
8.  **[【資料8/8】開発・実行環境設定ガイド (v1.1).md]**: Defines the development and execution environment, including the updated Firebase Emulator configuration.

## **2. Core Architecture (v1.1)**

The system is built on three foundational principles:

1.  **Local-First**: User data resides primarily on the client in IndexedDB, managed by Dexie.js. This ensures privacy and offline capability.
2.  **Hybrid AI**: A dual-pathway AI system. It prioritizes the on-device Gemini Nano for speed and privacy (`getInsightSuggestions`) and seamlessly falls back to cloud-based Gemini models (via Firebase Functions) for more complex tasks or when the on-device model is unavailable.
3.  **Self-Improving AI (Engrammer)**: The backend AI is not a simple request/response service. It is a stateful, self-improving agent named **Engrammer**, built on **LangGraph.js 1.0**.
    *   **Asynchronous & Durable**: Engrammer interactions are non-blocking. The client initiates a flow, receives a `threadId`, and polls for state updates. This is made possible by LangGraph's `Checkpointer` (using Firestore), which ensures the agent's state persists across function invocations.
    *   **Supervisor Architecture**: Engrammer acts as a supervisor, delegating tasks (e.g., summarization, specialized knowledge retrieval) to specialized sub-agents.
    *   **Human-in-the-Loop (HITL)**: The agent can `interrupt` its execution to request user approval for learning new insights, creating a collaborative, interactive learning cycle.

## **3. Development & Operational Framework**

*   **Technology Stack**: The definitive stack is React/Vite/TypeScript for the frontend, Firebase Functions (Node.js 20) for the backend, and Dexie.js for the client-side database.
*   **Environment**: Development requires Node.js v20+, Firebase CLI, and a modern version of Google Chrome with specific flags enabled for on-device AI testing.
*   **Local Execution**: The local workflow involves running the Vite dev server and the Firebase Emulators (`functions`, `firestore`, `auth`) concurrently. The separate `npm run ace` process is **deprecated** as of v1.1.

- Current Development Progress: UI/UX Redesign - Iconography and Button Styling, Layout and Responsiveness, ACE Section UI Refinement, Collapsible Sections and Pagination, Bug Fixes, and Documentation. Outstanding Issue: Collapsed Section Width for Connections.
- UI/UX Redesign: Implemented icon-based NoteInput, allowing simultaneous text and file attachment with preview. Adjusted CSS for layout and styling. Updated MainPage prop types.
- Image Embedding & Connection Generation: Resolved image embedding payload size limits via client-side resizing/JPEG compression. Implemented 2-stage image embedding (caption generation with `gemini-2.5-flash`, then embedding with `gemini-embedding-001`). Updated `embedNote` to return captions, saved to DB, and used for connection generation.
- Workshop Note Handling: Implemented `workshop` note type for combined text/image submissions, correctly saving JSON content. AI processing now handles `workshop` notes for embedding and insight generation. NoteCard and ConnectionsPage now correctly display `workshop` note content.
- Graph View Enhancements: Significantly improved Connections graph view UX. Hid React Flow attribution and default edge labels. Implemented interactive edge click (reasoning alert) and node click (highlight related elements) functionalities. Resolved multiple React Flow import and rendering errors (`MiniMap is not defined`, module resolution, default export issues, key duplication, node position errors) by updating to `@xyflow/react` and refining component logic.
- Current Status: All identified issues resolved. Awaiting final user confirmation on all implemented features.

- **UI/UX & Dark Mode Refinements (Today's Work):**
  - **Layout & Padding:**
    - Fixed padding on `NoteCard`, `RelationCard`, and `NoteInput` to prevent text overflow.
    - Re-architected `NoteCard` header to reposition pin and action buttons.
    - Re-styled `RelationCard` to display action buttons horizontally and add separators for clarity.
  - **Dark Mode:**
    - Implemented and corrected the theme-switching mechanism in `App.tsx`.
    - Ensured the theme toggle button in `AppHeader` is correctly wired.
    - Fixed visibility issues with React Flow controls in dark mode.
  - **Visual Polish:**
    - Adjusted the "frosted glass" effect by decreasing background opacity for better translucency.
  - **Bug Fixes:**
    - Corrected several syntax errors in JSX and CSS that were introduced during the refactoring process.
  - **Git:**
    - Committed all UI/UX and dark mode changes.
