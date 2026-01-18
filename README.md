# en:gram

[![English](https://img.shields.io/badge/lang-English-blue.svg)](README.md) [![Japanese](https://img.shields.io/badge/lang-Japanese-red.svg)](README_JP.md)

> **"Noise is where the universe resides."**

**en:gram** is not just a note-taking app; it is a **"Second Brain" designed for serendipity**. While biological brains evolve to filter out "noise" for efficiency, en:gram is built to capture that very noise—the raw, unfiltered chaos of your daily thoughts—and transform it into a symphony of insights using a hybrid AI architecture.

![Main Interface](assets/screenshot1.png)

## Philosophy: The "Gardening" of Thoughts

Classic note-taking apps are "Storage Bins" for static information. en:gram is a **"Digital Garden"**.

1.  **Recall the Noise**: We believe that the insights you seek are hidden in the details your brain subconsciously filters out. en:gram acts as the **"Noise DB"**, a ledger of high-fidelity memory that captures everything.
2.  **Serendipity over Search**: Instead of you searching for notes, the AI searches for *you*. It connects unrelated ideas, finding "resonances" between your current thoughts and forgotten memories.
3.  **The Engrammer**: An autonomous AI agent that sleeps when you sleep, but works tirelessly in the background. It is the "Gardener" that prunes, connects, and cultivates your knowledge graph, turning "Noise" into "Meaning".

## Core Features

### 1. Hybrid AI Matrix: Privacy & Power
en:gram utilizes a unique dual-engine architecture to balance privacy with performance.

-   **On-Device Intelligence (Gemini Nano)**:
    -   runs locally in your browser (Chrome).
    -   **Zero latency**, **Privacy-first**, **Offline-capable**.
    -   Handles real-time suggestions and private thought processing.
-   **Cloud Cognition (Gemini Pro/Flash via Vertex AI)**:
    -   Seamlessly takes over when deep reasoning or complex synthesis is required.
    -   The system automatically routes tasks to the best-suited model.

### 2. The Engrammer Flow (Agentic Workflow)
Powered by **LangGraph.js**, the Engrammer is a stateful, asynchronous agent.

-   **Persistence**: It maintains a long-running "thread" of your thought processes.
-   **Self-Correction**: It doesn't just answer; it asks. The agent employs a "Human-in-the-Loop" design to verify its insights, learning from your feedback to refine its internal models.
-   **The 3 Loops**:
    -   **Discovery Loop**: Finds hidden connections in the messy "Noise DB".
    -   **Generation Loop**: Crystalizes these connections into structured "Schema" notes.
    -   **Learning Loop**: Identifies its own "Blind Spots" (Anomaly DB) and evolves its understanding of your unique context.

### 3. Visual Knowledge Graph
A "Frosted Glass" aesthetics UI that renders your thoughts as a living constellation.

-   **Force-Directed Graph**: See how your notes gravitates towards each other based on semantic similarity.
-   **Interactive Exploration**: Navigate your mind map intuitively.

![Graph View](assets/screenshot2.png)
*The Visual Knowledge Graph: A constellation of your thoughts.*

![Engrammer Interface](assets/screenshot3.png)
*The Engrammer Interface: Conversing with your Second Brain.*

## Technology Stack

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind | The "Frosted Glass" UI |
| **Database** | **Dexie.js** (IndexedDB) | **Local-First** data ownership |
| **AI Orchestration** | **LangGraph.js** | Stateful Agentic Workflows |
| **Local AI** | Chrome Built-in AI (Gemini Nano) | Privacy & Speed |
| **Cloud AI** | Firebase Functions + Vertex AI | Deep Reasoning |
| **Testing** | Vitest, Playwright | Reliability |

## Getting Started

### Prerequisites
-   Node.js v20+
-   Firebase CLI
-   Chrome Canary (for Gemini Nano features)

### Installation
1.  **Clone the repository**:
    ```bash
    git clone https://github.com/youshinh/engram.git
    cd engram
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Setup Environment**:
    Copy `.env.example` to `.env` and configure your Firebase credentials.
    ```bash
    cp .env.example .env
    ```

### Development
Start the local development server:
```bash
npm run dev
```

![Settings Panel](assets/screenshot4.png)
*Settings Panel: Configuring your Hybrid AI preferences.*

## License
MIT License - see the [LICENSE](LICENSE) file for details.
