# en:gram

**en:gram** is an AI-powered note-taking application designed to help you capture, connect, and explore your ideas. It leverages a local-first architecture with Dexie.js and integrates Gemini Nano (on-device AI) for privacy-centric insight generation, seamlessly falling back to cloud-based Gemini via Firebase Functions when needed.

## Features

- **Local-First Architecture**: Your data stays on your device, stored in IndexedDB using Dexie.js.
- **Hybrid AI Engine**:
  - **On-Device Intelligence**: Uses Chrome's built-in Gemini Nano for fast, private, and offline-capable suggestions.
  - **Cloud Fallback**: Automatically switches to Google Gemini (via Vertex AI/Firebase) for complex reasoning or when local models are unavailable.
- **Engrammer Agent**: An asynchronous background agent (built with LangGraph.js) that continuously analyzes your notes to find hidden connections and insights.
- **Visual Knowledge Graph**: Explore the relationships between your notes in an interactive graph view.
- **Modern UI**: A clean, "Frosted Glass" aesthetic built with React and Tailwind concepts (custom CSS).

## Technology Stack

- **Frontend**: React 19, Vite, TypeScript
- **Database**: Dexie.js (IndexedDB wrapper)
- **Backend / AI**: Firebase Functions (Node.js 20), LangGraph.js, Google Generative AI SDK
- **Testing**: Vitest, Playwright

## Prerequisites

- Node.js v20 or later
- Firebase CLI (`npm install -g firebase-tools`)
- Google Chrome (Canary or Dev channel recommended for Gemini Nano experiments)

## Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/youshinh/engram.git
    cd engram
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Setup Environment Variables**:
    Copy `.env.example` to `.env` and fill in your Firebase configuration values.
    ```bash
    cp .env.example .env
    ```

## Development

To start the local development server:

```bash
npm run dev
```

This command will start the Vite dev server.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
