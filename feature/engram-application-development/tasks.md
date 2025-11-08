# Development Tasks: en:gram Application Development (v1.1)

**Version**: 1.1
**Author**: Gemini
**Date**: 2025-11-03
**Plan**: /c/Users/yoush/Desktop/app/feature/engram-application-development/plan.md

---

## Phase 1: Core Frontend & Local DB Setup (No Change)

*   **Objective**: Establish the basic application UI and local database CRUD operations.

*   **Task 1.1**: Project File Structure Setup
*   **Task 1.2**: Global Styles & Theme Definition
*   **Task 1.3**: Dexie.js Database Schema & API Implementation (v1.1 Schema)
*   **Task 1.4**: Root Component (`App.tsx`) Implementation
*   **Task 1.5**: Header (`AppHeader.tsx`) & SideNav (`SideNav.tsx`) Implementation
*   **Task 1.6**: Note Input Area (`NoteInput.tsx`) Implementation
*   **Task 1.7**: Note Card (`NoteCard.tsx`) Implementation
*   **Task 1.8**: Notes Page (`NotesPage.tsx`) Implementation
*   **Task 1.9**: Basic CRUD Operations Implementation

---

## Phase 2: Hybrid AI Integration (Insight Generation) (No Change)

*   **Objective**: Implement the hybrid AI engine for discovering and displaying connections between notes.

*   **Task 2.1**: Cosine Similarity Logic Implementation (`similarity.ts`)
*   **Task 2.2**: `getInsightSuggestions` Function Implementation (`App.tsx`)
*   **Task 2.3**: `saveSuggestions` Function Implementation (`App.tsx`)
*   **Task 2.4**: Background Embedding Worker Implementation (`App.tsx`)
*   **Task 2.5**: Background Insight Worker Implementation (`App.tsx`)
*   **Task 2.6**: `embedNote` Cloud Function Implementation (`functions/src/index.ts`)
*   **Task 2.7**: `findConnectionsCloud` Cloud Function Implementation (`functions/src/index.ts`)
*   **Task 2.8**: Initial `ConnectionsPage.tsx` and `RelationCard.tsx` Implementation

---

## Phase 3: Engrammer Integration (v1.1 Rework)

*   **Objective**: Implement the asynchronous, interactive Engrammer agent flow.

#### Task 3.1: Engrammer State Management in `App.tsx`
- **Description**: Implement the `engrammerSessions` state (`Map<string, EngrammerSessionState>`) and associated setter functions in `App.tsx` to manage asynchronous AI conversations.
- **Effort**: Medium
- **Dependencies**: Task 1.4
- **Files**: `src/App.tsx`

#### Task 3.2: `EngrammerFlow.tsx` UI Component Implementation
- **Description**: Create the new `EngrammerFlow.tsx` component. Implement the UI logic to dynamically render content based on the `sessionState.status` prop, including the idle view, generating view (with animation), response view, and the new HITL approval/denial prompt.
- **Effort**: High
- **Dependencies**: Task 1.2, Task 3.1
- **Files**: `src/components/EngrammerFlow.tsx`, `src/pages/MainPage.tsx`

#### Task 3.3: Implement `engrammerFlow_start` Cloud Function
- **Description**: In `functions/src/index.ts`, create the `engrammerFlow_start` function. It should validate the input, initiate a LangGraph execution in the background (non-blocking), and immediately return the `threadId`.
- **Effort**: Medium
- **Dependencies**: LangGraph setup in backend.
- **Files**: `functions/src/index.ts`

#### Task 3.4: Implement `getEngrammerState` Cloud Function
- **Description**: In `functions/src/index.ts`, create the `getEngrammerState` function. It should use the Firestore Checkpointer to retrieve the latest state for a given `threadId` and return it in the format specified in the design document.
- **Effort**: Medium
- **Dependencies**: LangGraph setup, Firestore Checkpointer.
- **Files**: `functions/src/index.ts`

#### Task 3.5: Implement `engrammerFlow_continue` Cloud Function
- **Description**: In `functions/src/index.ts`, create the `engrammerFlow_continue` function. It should receive a `threadId` and user input, resume the correct LangGraph instance from the checkpoint, and let it run to the next interruption or completion.
- **Effort**: Medium
- **Dependencies**: LangGraph setup, HITL logic in the graph.
- **Files**: `functions/src/index.ts`

#### Task 3.6: Implement Client-Side Engrammer Invocation & Polling
- **Description**: In `App.tsx`, implement `callEngrammerFlow` to call the `engrammerFlow_start` function. Implement the `useEffect` based polling mechanism (`startEngrammerPolling`) that calls `getEngrammerState` and updates the `engrammerSessions` state accordingly.
- **Effort**: High
- **Dependencies**: Task 3.1, Task 3.3, Task 3.4
- **Files**: `src/App.tsx`

#### Task 3.7: Implement `engrammerFlow_getNote` Cloud Function
- **Description**: In `functions/src/index.ts`, create the `engrammerFlow_getNote` function to retrieve note data from specialized backend sources as specified in the design.
- **Effort**: Medium
- **Dependencies**: Backend data structure.
- **Files**: `functions/src/index.ts`

#### Task 3.8: Update `handleFeedbackClick` for Structured References
- **Description**: Modify the `handleFeedbackClick` function in `App.tsx` to handle the new structured reference object (`{ source, noteId }`) and call `engrammerFlow_getNote` for non-local data sources.
- **Effort**: Medium
- **Dependencies**: Task 1.4, Task 3.7
- **Files**: `src/App.tsx`

---

## Phase 4: Advanced Features & UI Refinements (v1.1 Update)

*   **Objective**: Implement composite features and refine the UI based on the v1.1 architecture.

#### Task 4.1: `summarizeUrl` Cloud Function Implementation
- **Description**: Implement the `summarizeUrl` function in `functions/src/index.ts`.
- **Effort**: Medium
- **Dependencies**: None
- **Files**: `functions/src/index.ts`

#### Task 4.2: Graph View Implementation (`ConnectionsPage.tsx`)
- **Description**: Re-implement `ConnectionsPage.tsx` using `reactflow`. Convert `notes` and `relations` from the DB into `nodes` and `edges`. Implement the animated edge for new insights.
- **Effort**: High
- **Dependencies**: Task 2.8
- **Files**: `src/pages/ConnectionsPage.tsx`

#### Task 4.3: Composite Note Types UI
- **Description**: Enhance `NoteInput.tsx` with UI triggers for `sketch`, `url`, `3d_model`, etc. Implement the `WorkshopInputModal.tsx` with `react-canvas-draw` and a 3D model previewer.
- **Effort**: High
- **Dependencies**: Task 1.6, Task 1.7
- **Files**: `src/components/NoteInput.tsx`, `src/components/NoteCard.tsx`, `src/components/WorkshopInputModal.tsx`

#### Task 4.4: Project Page UI (`ProjectPage.tsx`)
- **Description**: Create the new `ProjectPage.tsx` component. It should filter notes by `projectId` and include a project-scoped `EngrammerFlow` component.
- **Effort**: Medium
- **Dependencies**: Task 1.8, Task 3.2
- **Files**: `src/pages/ProjectPage.tsx`

#### Task 4.5: Contextual Actions on `NoteCard`
- **Description**: Add the "Related: (X)" badge and the "Deepen" button to the `NoteCard.tsx` component, and implement the corresponding handler functions in `App.tsx`.
- **Effort**: Medium
- **Dependencies**: Task 1.7, Task 3.6
- **Files**: `src/components/NoteCard.tsx`, `src/App.tsx`

#### Task 4.6: Final UI Polish
- **Description**: Implement the remaining UI components (`ArchivePage.tsx`, `OnboardingModal.tsx`, etc.) and perform a final pass on the entire application for responsive design and UX consistency.
- **Effort**: High
- **Dependencies**: All previous UI tasks
- **Files**: All `src/components/` and `src/pages/` files.