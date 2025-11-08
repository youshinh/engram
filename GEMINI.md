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

## **4. Development Workflow (v1.2)**

To ensure code quality and prevent regressions, all future development will adhere to the following workflow. Each step must be completed before proceeding to the next.

1.  **Plan:** Define the scope and implementation strategy for the task.
2.  **Implement:** Write or modify the code to fulfill the task requirements.
3.  **Unit Test:**
    *   Create or update unit tests for the implemented functionality using `vitest`.
    *   Run `npm run test` to ensure all tests pass and there are no regressions.
4.  **Code Review (Self-Review):**
    *   Run `npx tsc` to confirm there are no TypeScript errors.
    *   Report the results of the tests and type-check to the user.
5.  **User Approval:**
    *   Present the changes and obtain user approval before committing.
6.  **Commit:**
    *   Stage and commit the approved changes with a descriptive message.
    *   Update the internal progress tracker (`GEMINI.md` or memory).
7.  **Proceed:** Move to the next task.

---

## Current Development Progress:

- Firestore Checkpointer integration for Engrammer's asynchronous & durable execution is complete.
- **E2E Test Status:** All E2E tests are currently failing. Notes registration and other core functionalities are not operating as expected.
- **Next Steps:** Investigate and resolve the E2E test failures and underlying functional issues.

---

## Test Execution Guidelines:

To prevent interruptions during test execution, especially for E2E tests, please adhere to the following:

- **Background Processes:** When running development servers or other long-running processes required for tests, ensure they are started in a truly detached background process. For PowerShell, use `Start-Job -ScriptBlock { <command> }`.
- **Monitoring:** After starting a background process, confirm its status (e.g., `Get-Job` in PowerShell) before proceeding with tests.
- **Cancellation:** If a test run is interrupted or cancelled, always verify the state of any background processes and terminate them if necessary (e.g., `Stop-Job -Id <JobId>` and `Remove-Job -Id <JobId>`) before attempting a new test run or starting new background processes.
- **Error Logs:** In case of test failures, prioritize reviewing detailed error logs and traces (e.g., Playwright's trace viewer) to understand the root cause.
- **Environment Setup:** Ensure all necessary environment variables and configurations are correctly set up before initiating test runs.