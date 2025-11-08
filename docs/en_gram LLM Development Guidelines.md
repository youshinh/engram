# **en:gram LLM Development Guidelines (AI Development Agent Guidelines)**

Version: 1.1  
Date: 2025-11-03  
**Purpose:**

* This document defines the **absolute** rules, conventions, and quality standards for the AI Development Agent (LLM) when generating and implementing code for the en:gram application.  
* It ensures that the generated code fully adheres to all provided design documents (Documents 1/8 to 8/8) and the core philosophy of en:gram (Local-First, Hybrid AI, Engrammer, specified UI/UX), resulting in high-quality, maintainable software.

**Core Principles:**

* **Strict Adherence to Design Documents:** The content of the 8 provided design documents is **absolute**. When generating code for each file, always refer to the relevant design document (System Overview, DB Design, UI Basic/Detailed, AI Logic, Engrammer Integration, API Design, Environment Setup) and follow its instructions **strictly**.  
* **Maintain Consistency:** Ensure consistency in code style, naming conventions, and design patterns throughout the project.  
* **Ensure Quality:** Generate code that is readable, maintainable, and testable. Generating test code is also a critical responsibility.  
* **Reflect Design Intent:** Understand the design principles defined in `Agents.md` and the concepts of Engrammer (EngrammerアルゴリズムJavaScript実装ガイド.md) and clearly express this intent in the code and comments.

## **1\. Development Language and Core Technology Stack**

Use the following technology stack. Versions should follow package.json and the design documents.

* **Language:** TypeScript (Strict mode required)  
* **Frontend:** React (Vite), Functional Components, Hooks  
* **State Management:** Standard React Hooks (useState, useEffect, etc.). App.tsx serves as the central manager.  
* **Client DB:** Dexie.js (IndexedDB wrapper)  
* **Backend:** Firebase Cloud Functions (Node.js runtime)  
* **API/Schema Definition (Backend):** Zod  
* **AI (Client):** window.ai (LanguageModel API / Gemini Nano)  
* **AI (Backend):** Google AI SDK (Gemini Flash/Pro), Multimodal Embedding API  
* **AI Orchestration (Backend):** LangGraph.js (for Engrammer implementation, including asynchronous polling and Human-in-the-Loop), Genkit (usable for some flows)  
* **Testing:** Vitest  
* **Styling:** CSS Modules or Tailwind CSS (follow instructions in Design Document 4/8), utilize the glass-card class.

## **2\. Code Style and Formatting**

* **Formatter/Linter:** Strictly adhere to the Prettier and ESLint rules configured in the project. Apply automatic formatting when generating code.  
* **Naming Conventions:**  
  * Variables, functions: camelCase  
  * React components, TypeScript types/interfaces: PascalCase  
  * Constants: UPPER\_SNAKE\_CASE  
  * File names:  
    * React components: ComponentName.tsx  
    * Stylesheets (CSS Modules): ComponentName.module.css  
    * Other TypeScript files: descriptive-name.ts  
    * Test files: \*.test.ts, \*.test.tsx  
* **Imports:**  
  * Use ES Modules (import/export).  
  * Follow linter rules for import order (e.g., external libraries \-\> internal modules).  
  * Prefer relative paths over absolute paths (alias paths based on tsconfig.json baseUrl are acceptable).

## **3\. TypeScript Coding Conventions**

* **Strict Mode:** Assume "strict": true in tsconfig.json. Generate code that compiles without errors.  
* **No any Type:** The use of any is prohibited in principle. Use unknown if the type is uncertain and safely narrow the type using type guards (typeof, instanceof) or assertions (as). If any is absolutely necessary, clearly state the reason in a comment.  
* **Type Definitions:**  
  * Accurately use the types defined in Database Design Document 2/8 (Note, Relation, etc.).  
  * Use TypeScript types corresponding to the Zod schemas defined in Backend API Design Document 7/8 for API inputs/outputs.  
  * Define interfaces (interface) or type aliases (type) for complex objects and function signatures.  
* **Asynchronous Operations:** Use async/await as the standard. Be mindful of type safety when handling Promises directly.

## **4\. React Coding Conventions**

* **Functional Components & Hooks:** Do not use class components. Use only functional components and Hooks (useState, useEffect, useContext, useReducer, useCallback, useMemo, useRef).  
* **Component Design:**  
  * **Single Responsibility Principle:** Components should focus on a single concern.  
  * **Reusability:** Extract common UI patterns or logic into custom hooks or shared components.  
  * **Props:** Clearly define prop types using interface or type. Pass props appropriately and reconsider the design if excessive prop drilling occurs (though limited in the current central management by App.tsx).  
* **useEffect Dependency Array:** Accurately specify the dependency array (\[\]) for useEffect, useCallback, and useMemo. Follow the ESLint rule (react-hooks/exhaustive-deps).  
* **Performance:** Use React.memo, useCallback, and useMemo appropriately to avoid unnecessary re-renders. However, avoid premature optimization; apply only when bottlenecks are evident.  
* **Accessibility (a11y):**  
  * Use semantic HTML (\<nav\>, \<main\>, \<button\>, etc.) correctly.  
  * Provide appropriate ARIA attributes (aria-label, aria-hidden, etc.) for interactive elements.  
  * Consider keyboard navigation.  
* **Styling:**  
  * Follow the instructions in Key UI Components Detailed Design Document 4/8, using either CSS Modules or Tailwind CSS.  
  * Implement the frosted glass effect (glass-card class) and Light/Dark mode support.

## **5\. Backend (Firebase Functions) Coding Conventions**

* **Triggers:** Use the triggers specified in Backend API Design Document 7/8 (onCall, onRequest).  
* **Schema Validation:** Always validate input data for onCall functions and request bodies for onRequest functions using the Zod schema (inputSchema). Return appropriate errors (invalid-argument) for invalid input.  
* **Authentication:** For functions requiring authentication (authentication: true), check the context.auth object and return an unauthenticated error if the user is not authenticated.  
* **Secret Management:** Securely load API keys (GEMINI\_API\_KEY\_SECRET) from Secret Manager using defineSecret (Genkit) or runWith({ secrets: \[...\] }) (standard Functions). **Do not hardcode secrets in the code.**  
* **Error Handling:** Use try...catch to handle external API call failures and unexpected errors. Return functions.https.HttpsError (internal, unavailable, etc.) to the client. Ensure no sensitive information is included in error messages.  
* **Logging:** Use Cloud Functions logging (functions.logger) to record key processing steps and error information.

## **6\. Dexie.js (Client DB) Coding Conventions**

* **Singleton Instance:** Perform all database operations exclusively through the singleton instance (db) exported from src/db.ts.  
* **Type Safety:** Utilize the type definitions (Table\<Note\>, Table\<Relation\>) to create type-safe queries.  
* **Predefined Methods:** If custom methods are defined in Database Design Document 2/8 (getPaginatedNotes, updateRelationFeedback, etc.), prioritize using them.  
* **Indexes:** When creating queries (where, orderBy), ensure they efficiently utilize the indexes defined in Database Design Document 2/8.  
* **Respect Hooks:** Assume that id and createdAt are automatically generated by the creating hook. Do not include these fields when calling add().

## **7\. LangGraph.js (Engrammer) Coding Conventions**

* **Adhere to Design:** **Strictly** implement the roles and logic of Generator, Reflector, and Curator as defined in Key UI Components Detailed Design Document 4/8 and EngrammerアルゴリズムJavaScript実装ガイド.md.  
* **State Management:** Follow the AgentState schema definition. Each node should only update and return the state fields it is responsible for.  
* **Structured Output:** The Reflector node must use withStructuredOutput and Zod schemas (InsightSchema, ReflectionSchema) to reliably output structured insights.  
* **Curator Determinism:** Implement the Curator node's playbook update logic (counter updates, deduplication) using deterministic algorithms (e.g., vector similarity calculation), not LLM calls.  
* **Checkpointer:** Follow the Development & Runtime Setup Guide 8/8. Use MemorySaver (development) or a Firestore Checkpointer (production) to ensure state persistence per thread\_id. Implement robust error handling and retry mechanisms for checkpointer operations to ensure durability of Engrammer's state, especially during asynchronous and Human-in-the-Loop (HITL) interactions.
* **Asynchronous & Human-in-the-Loop (HITL):** Design Engrammer flows to explicitly support asynchronous execution and HITL. This involves using LangGraph's interrupt mechanisms for user interaction points and ensuring that the state can be reliably saved and restored across these interruptions. The client-side polling mechanism should be considered when designing the flow to avoid race conditions and ensure data consistency.

## **8\. Commenting Conventions**

* **Language:** Write comments primarily in **English**. (UI display strings, etc., can be Japanese).  
* **Purpose:** Explain not just "what" the code does, but "**why**" it does it that way. Describe complex logic, workarounds, and the reasoning behind design decisions.  
* **JSDoc:** Add JSDoc comments (@param, @returns, @throws, @description, etc.) to all public functions, classes, major type definitions, and complex internal functions.  
* **Design Intent Comments:**  
  * Add comments indicating implementations related to `Agents.md` design principles.  
    // Random sampling of past notes to induce serendipity (Principle 4\)  
    const randomSamples \= getRandomNotes(pastNotes, 5);

  * Add comments explaining the roles of implementations related to Engrammer components or concepts.  
    // \--- Engrammer Reflector Node \---  
    // Analyzes the generator's trajectory to extract insights.  
    export async function reflectorNode(state: AgentStateType): Promise\<Partial\<AgentStateType\>\> { ... }

    // Store user feedback for the future Engrammer agent  
    await db.relations.update(id, { feedback });

* **Inline Comments:** Add short inline comments for complex code blocks or potentially confusing parts.  
* **TODO / FIXME:** Use // TODO: or // FIXME: comments for unimplemented features or areas needing correction, providing specific details.

## **9\. Error Handling Conventions**

* **Comprehensiveness:** Implement try...catch error handling for all potentially failing operations (API calls, DB operations, file I/O, data parsing).  
* **Specific Errors:** Catch specific error types where possible and handle them accordingly.  
* **User Feedback:** In the frontend, implement UI feedback (e.g., aceError state, toast notifications) to inform the user when errors occur. Do not display technical details (stack traces, etc.).  
* **Recovery:** Implement recovery logic where possible (e.g., retries, fallbacks). The hybrid AI fallback (getInsightSuggestions) is an example.  
* **Logging:** In the backend, log detailed error information (including stack traces) to Cloud Logging.

## **10\. Testing Conventions (Vitest)**

* **Test Targets:**  
  * **Unit Tests:** Individual functions, class methods, React components (rendering and basic interactions), utility functions (similarity.ts, etc.).  
  * **Integration Tests:** Features involving multiple units working together (e.g., the flow from adding a note to initiating AI processing).  
* **Mocking:** Appropriately mock external dependencies (window.ai, Firebase Functions, Date.now(), etc.) using vi.mock or vi.spyOn (see App.test.tsx for reference).  
* **Descriptiveness:** Use describe blocks for the test target and it blocks for specific test cases, describing them clearly.  
* **Coverage:** Create test cases for both normal operation (happy path) and error handling (sad path).  
* **Design Document Basis:** Base test cases on the requirements and specifications defined in the design documents to verify that the implementation meets the specs.  
* **Generation:** When generating code for new features, generate corresponding test code (\*.test.ts/\*.test.tsx) simultaneously.

## **11\. Design Document Consistency**

* **Top Priority:** The code must **perfectly match** the content of the 8 provided design documents.  
* **Ambiguities:** If any part of the design documents seems unclear or contradictory, **do not proceed with implementation based on assumptions**. Request clarification.  
* **Change Management:** If deviation from the design documents becomes necessary, consider updating the design documents first.

## **12\. Code Generation Process**

* **File Unit:** Generate code on a file-by-file basis in principle.  
* **Dependencies:** Include all necessary import statements.  
* **Completeness:** Generate complete, runnable files (or classes, functions), not partial code snippets.  
* **Adherence to Guidelines:** Generate code following all the conventions outlined above (formatting, types, comments, tests, etc.).
