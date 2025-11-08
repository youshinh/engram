import React, { useCallback, useEffect, useState, useRef } from 'react';
import { db, Note, Relation } from './db';
import { findConnectionsCloud, embedNote, engrammerFlow_start, getEngrammerState, engrammerFlow_continue, engrammerFlow_getNote } from './firebase';
import { v4 as uuidv4 } from 'uuid';

// Lazy load components
const AppHeader = React.lazy(() => import('./components/AppHeader'));
const SideNav = React.lazy(() => import('./components/SideNav'));
const NotesPage = React.lazy(() => import('./pages/NotesPage'));
const ConnectionsPage = React.lazy(() => import('./pages/ConnectionsPage'));
const MainPage = React.lazy(() => import('./pages/MainPage'));
const ArchivePage = React.lazy(() => import('./pages/ArchivePage'));

export type View = 'main' | 'notes' | 'connections' | 'archive';
export type Theme = 'light' | 'dark';

interface InsightSuggestion {
  targetNoteId: string;
  reasoning: string;
}

// v1.1 Engrammer Session State
export interface EngrammerSessionState {
  threadId: string;
  status: 'running' | 'interrupted' | 'done' | 'error' | 'learning';
  latestResponse: string | null;
  pendingInsights: any[] | null; // Define a more specific type if possible
  references: any[] | null; // Define a more specific type if possible
  error: string | null;
}

const resizeAndEncodeImage = (blob: Blob, maxDimension: number = 512): Promise<{base64: string, mimeType: string}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round(height * (maxDimension / width));
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round(width * (maxDimension / height));
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Failed to get canvas context'));
        }
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        const base64String = dataUrl.split(',')[1];
        resolve({ base64: base64String, mimeType: 'image/jpeg' });
      };
      img.onerror = reject;
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

function App() {
  const [view, setView] = useState<View>('main');
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isInsightWorking, setIsInsightWorking] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  // v1.1 Engrammer State Management
  const [engrammerSessions, setEngrammerSessions] = useState<Map<string, EngrammerSessionState>>(new Map());
  const pollingIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Background Embedding Worker (No changes)
  useEffect(() => {
    // ... (omitted for brevity)
  }, []);

  // Background Insight Worker (No changes)
  useEffect(() => {
    // ... (omitted for brevity)
  }, [isInsightWorking]);

  // Theme management (No changes)
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

  const handleNavigate = useCallback((newView: View) => {
    setView(newView);
    setIsNavOpen(false);
  }, []);

  const toggleNav = useCallback(() => {
    setIsNavOpen((prev) => !prev);
  }, []);

  const getInsightSuggestions = async (newNote: Note, contextNotes: Note[]): Promise<InsightSuggestion[]> => {
    // ... (omitted for brevity)
    return [];
  };

  const handleAddNote = useCallback(async (payload: { text: string; attachment: File | null }) => {
    // ... (omitted for brevity)
  }, []);

  // ==================================================================
  // v1.1 Engrammer Handlers
  // ==================================================================

  const stopPolling = useCallback((threadId: string) => {
    if (pollingIntervals.current.has(threadId)) {
      clearInterval(pollingIntervals.current.get(threadId));
      pollingIntervals.current.delete(threadId);
    }
  }, []);

  const updateSessionState = useCallback((threadId: string, newState: Partial<EngrammerSessionState>) => {
    setEngrammerSessions(prevSessions => {
      const newSessions = new Map(prevSessions);
      const existingSession = newSessions.get(threadId) || { threadId, status: 'running', latestResponse: null, pendingInsights: null, references: null, error: null };
      newSessions.set(threadId, { ...existingSession, ...newState });
      return newSessions;
    });
  }, []);

  const pollEngrammerState = useCallback(async (threadId: string) => {
    const intervalId = setInterval(async () => {
      try {
        const response = await getEngrammerState({ threadId });
        const newState = response.data as EngrammerSessionState;
        
        updateSessionState(threadId, newState);

        if (newState.status === 'interrupted' || newState.status === 'done' || newState.status === 'error') {
          stopPolling(threadId);
        }
      } catch (error) {
        console.error('Polling Engrammer state failed:', error);
        updateSessionState(threadId, { status: 'error', error: 'Failed to get Engrammer state.' });
        stopPolling(threadId);
      }
    }, 2000);
    pollingIntervals.current.set(threadId, intervalId);
  }, [stopPolling, updateSessionState]);

  const handleStartEngrammerFlow = useCallback(async (query: string, existingThreadId?: string) => {
    const threadId = existingThreadId || `engrammer-thread-${uuidv4()}`;
    
    updateSessionState(threadId, { 
      status: 'running', 
      error: null, 
      latestResponse: '...',
      pendingInsights: null,
      references: null,
    });

    try {
      const response = await engrammerFlow_start({ query, threadId });
      const returnedThreadId = response.data.threadId;
      
      if (returnedThreadId !== threadId) {
         // This case should ideally not happen if the backend respects the passed threadId
        console.warn(`Backend returned a different threadId: ${returnedThreadId}`);
      }
      
      pollEngrammerState(returnedThreadId);

    } catch (error) {
      console.error('Failed to start Engrammer flow:', error);
      updateSessionState(threadId, { status: 'error', error: 'Failed to start Engrammer flow.' });
    }
  }, [pollEngrammerState, updateSessionState]);

  const handleContinueEngrammerFlow = useCallback(async (threadId: string, userInput: string) => {
    if (!engrammerSessions.has(threadId)) return;

    updateSessionState(threadId, { status: 'learning' });

    try {
      const response = await engrammerFlow_continue({ threadId, userInput });
      const newState = response.data as EngrammerSessionState;

      updateSessionState(threadId, newState);

      if (newState.status !== 'done' && newState.status !== 'error') {
        pollEngrammerState(threadId);
      } else {
        stopPolling(threadId);
      }
    } catch (error) {
      console.error('Failed to continue Engrammer flow:', error);
      updateSessionState(threadId, { status: 'error', error: 'Failed to continue Engrammer flow.' });
    }
  }, [engrammerSessions, pollEngrammerState, stopPolling, updateSessionState]);

  const handleEngrammerResponseClick = useCallback(async (noteId: string) => {
    // ... (omitted for brevity)
  }, []);

  const renderMainContent = () => {
    // For now, let's assume we only care about the first session for MainPage
    const mainSession = engrammerSessions.size > 0 ? Array.from(engrammerSessions.values())[0] : undefined;

    switch (view) {
      case 'notes': return <NotesPage />;
      case 'connections': return <ConnectionsPage />;
      case 'archive': return <ArchivePage />;
      case 'main':
      default:
        return (
          <MainPage
            onAddNote={handleAddNote}
            onCallEngrammerFlow={(query) => handleStartEngrammerFlow(query, mainSession?.threadId)}
            onContinueEngrammerFlow={mainSession ? (userInput) => handleContinueEngrammerFlow(mainSession.threadId, userInput) : undefined}
            engrammerState={mainSession}
            isEngrammerWorking={mainSession?.status === 'running' || mainSession?.status === 'learning'}
            isInsightWorking={isInsightWorking}
            engrammerError={mainSession?.error || null}
            onEngrammerResponseClick={handleEngrammerResponseClick}
          />
        );
    }
  };

  return (
    <div className="app-container">
      <React.Suspense fallback={<div>Loading...</div>}>
        <AppHeader toggleNav={toggleNav} toggleTheme={toggleTheme} currentTheme={theme} />
        <SideNav isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} onNavigate={handleNavigate} currentView={view} />
        <main className="main-content">{renderMainContent()}</main>
      </React.Suspense>
      {showNoteModal && selectedNote && (
        <div className="modal-backdrop" onClick={() => setShowNoteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3>Note Detail</h3>
            <pre>{typeof selectedNote.content === 'string' ? selectedNote.content : JSON.stringify(selectedNote.content, null, 2)}</pre>
            <button onClick={() => setShowNoteModal(false)} className="close-button">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
