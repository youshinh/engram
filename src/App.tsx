import React, { useCallback, useEffect, useState } from 'react';
import { db, NoteType, Note, Relation } from './db';
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

declare global {
  interface Window {
    ai?: {
      createTextSession: () => Promise<any>;
      LanguageModel?: any;
    };
  }
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
        console.log(`[DEBUG] Original blob size: ${blob.size} bytes`);
        console.log(`[DEBUG] Resized (JPEG quality 0.6) base64 size: ${base64String.length} bytes`);
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

  // Engrammer state
  const [isEngrammerWorking, setIsEngrammerWorking] = useState(false);
  const [engrammerThreadId, setEngrammerThreadId] = useState<string | null>(null);
  const [engrammerState, setEngrammerState] = useState<any>(null);
  const [engrammerError, setEngrammerError] = useState<string | null>(null);

  // Background Embedding Worker
  useEffect(() => {
    const processPendingEmbeddings = async () => {
      const pendingNotes = await db.notes.where('embeddingStatus').equals('pending').limit(5).toArray();
      for (const note of pendingNotes) {
        try {
          let result: { embedding: number[]; caption?: string; } | null = null;

          if (note.type === 'workshop' && typeof note.content === 'string') {
            const workshopContent = JSON.parse(note.content);
            if (workshopContent.attachment) {
              const embedResult = await embedNote({ 
                content: workshopContent.attachment.data, 
                mimeType: workshopContent.attachment.mimeType 
              });
              result = embedResult.data;
            }
          } else if (note.content instanceof Blob && note.content.type.startsWith('image/')) {
            const { base64, mimeType } = await resizeAndEncodeImage(note.content);
            const embedResult = await embedNote({ content: base64, mimeType });
            result = embedResult.data;
          } else if (typeof note.content === 'string') {
            const embedResult = await embedNote({ content: note.content });
            result = embedResult.data;
          }

          if (result) {
            await db.notes.update(note.id, { 
              embedding: result.embedding, 
              embeddingStatus: 'completed', 
              insightStatus: 'pending',
              generatedCaption: result.caption, // Save the caption if it exists
            });
            console.log(`Embedding generated for note: ${note.id}`);
          } else {
            await db.notes.update(note.id, { embeddingStatus: 'failed' });
          }
        } catch (error) {
          console.error(`Failed to generate embedding for note ${note.id}:`, error);
          await db.notes.update(note.id, { embeddingStatus: 'failed' });
        }
      }
    };
    const intervalId = setInterval(processPendingEmbeddings, 10000);
    return () => clearInterval(intervalId);
  }, []);

  // Background Insight Worker
  useEffect(() => {
    const processPendingInsights = async () => {
      if (isEngrammerWorking || isInsightWorking) return;
      const pendingNotes = await db.notes.where('insightStatus').equals('pending').limit(5).toArray();
      for (const note of pendingNotes) {
        try {
          const allOtherNotes = await db.notes.where('id').notEqual(note.id).toArray();
          const suggestions = await getInsightSuggestions(note, allOtherNotes);
          if (suggestions.length > 0) {
            const relationsToAdd: Omit<Relation, 'id'>[] = suggestions.map(s => ({
              sourceId: note.id,
              targetId: s.targetNoteId,
              reasoning: s.reasoning,
              source: 'ai_suggestion',
              feedback: 'pending',
              createdAt: new Date(),
            }));
            await db.relations.bulkAdd(relationsToAdd as Relation[]);
            console.log(`${relationsToAdd.length} relations added for note: ${note.id}`);
          }
          await db.notes.update(note.id, { insightStatus: 'completed' });
        } catch (error) {
          console.error(`Failed to generate insights for note ${note.id}:`, error);
          await db.notes.update(note.id, { insightStatus: 'failed' });
        }
      }
    };
    const intervalId = setInterval(processPendingInsights, 15000);
    return () => clearInterval(intervalId);
  }, [isEngrammerWorking, isInsightWorking]);

  // Theme management
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
    setIsInsightWorking(true);

    // Prepare a version of the new note with the caption as content if it exists
    const noteForAI = {
      ...newNote,
      content: newNote.generatedCaption || (typeof newNote.content === 'string' ? newNote.content : ''),
    };

    // Prepare context notes with captions as content
    const contextNotesForAI = contextNotes.map(note => ({
      ...note,
      content: note.generatedCaption || (typeof note.content === 'string' ? note.content : ''),
    }));

    try {
      // The on-device AI part is removed for simplicity as it doesn't support the new architecture yet
      const suggestions = await findConnectionsCloud(noteForAI, contextNotesForAI);
      return suggestions;
    } catch (error) {
      console.error('Error getting insight suggestions:', error);
      return [];
    } finally {
      setIsInsightWorking(false);
    }
  };

  const handleAddNote = useCallback(async (payload: { text: string; attachment: File | null }) => {
    const { text, attachment } = payload;
    try {
      let noteData: Omit<Note, 'id'>;

      if (attachment) {
        if (attachment.type.startsWith('image/')) {
          const { base64, mimeType } = await resizeAndEncodeImage(attachment);
          const workshopContent = {
            text: text,
            attachment: {
              data: base64,
              mimeType: mimeType,
            },
          };
          noteData = {
            type: 'workshop',
            content: JSON.stringify(workshopContent),
            createdAt: new Date(),
            embeddingStatus: 'pending',
            insightStatus: 'pending',
            status: 'active',
            isPinned: false,
            tags: [],
          };
        } else {
          // Handle non-image files as simple notes for now
          noteData = {
            type: attachment.type.startsWith('audio/') ? 'audio' : 'text',
            content: attachment,
            createdAt: new Date(),
            embeddingStatus: 'pending',
            insightStatus: 'pending',
            status: 'active',
            isPinned: false,
            tags: [],
          };
        }
      } else {
        // Text-only note
        noteData = {
          type: 'text',
          content: text,
          createdAt: new Date(),
          embeddingStatus: 'pending',
          insightStatus: 'pending',
          status: 'active',
          isPinned: false,
          tags: [],
        };
      }

      await db.notes.add({ id: uuidv4(), ...noteData });
      console.log(`Note of type '${noteData.type}' added successfully!`);

    } catch (error) {
      console.error('Failed to add note:', error);
    }
  }, []);

  // Engrammer Handlers
  const pollEngrammerState = useCallback(async (threadId: string) => {
    const interval = setInterval(async () => {
      try {
        const { state } = await getEngrammerState(threadId);
        setEngrammerState(state);
        // Check for HITL or completion
        if (state.some((s: any) => s.type === 'human') || state.some((s: any) => s.type === 'end')) {
          setIsEngrammerWorking(false);
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Polling Engrammer state failed:', error);
        setEngrammerError('Failed to get Engrammer state.');
        setIsEngrammerWorking(false);
        clearInterval(interval);
      }
    }, 2000);
    return interval;
  }, []);

  const handleStartEngrammerFlow = useCallback(async (query: string) => {
    setIsEngrammerWorking(true);
    setEngrammerError(null);
    setEngrammerState(null);
    try {
      const { thread_id, state } = await engrammerFlow_start(query);
      setEngrammerThreadId(thread_id);
      setEngrammerState(state);
      pollEngrammerState(thread_id);
    } catch (error) {
      console.error('Failed to start Engrammer flow:', error);
      setEngrammerError('Failed to start Engrammer flow.');
      setIsEngrammerWorking(false);
    }
  }, [pollEngrammerState]);

  const handleContinueEngrammerFlow = useCallback(async (userInput: string) => {
    if (!engrammerThreadId) return;
    setIsEngrammerWorking(true);
    setEngrammerError(null);
    try {
      const { state } = await engrammerFlow_continue(engrammerThreadId, userInput);
      setEngrammerState(state);
      pollEngrammerState(engrammerThreadId);
    } catch (error) {
      console.error('Failed to continue Engrammer flow:', error);
      setEngrammerError('Failed to continue Engrammer flow.');
      setIsEngrammerWorking(false);
    }
  }, [engrammerThreadId, pollEngrammerState]);

  const handleEngrammerResponseClick = useCallback(async (noteId: string) => {
    const note = await db.notes.get(noteId);
    if (note) {
      setSelectedNote(note);
      setShowNoteModal(true);
    } else {
      const cloudNote = await engrammerFlow_getNote(noteId);
      if (cloudNote) {
        setSelectedNote(cloudNote);
        setShowNoteModal(true);
      } else {
        console.warn(`Note with ID ${noteId} not found.`);
      }
    }
  }, []);

  const renderMainContent = () => {
    switch (view) {
      case 'notes': return <NotesPage />;
      case 'connections': return <ConnectionsPage />;
      case 'archive': return <ArchivePage />;
      case 'main':
      default:
        return (
          <MainPage
            onAddNote={handleAddNote}
            onCallEngrammerFlow={handleStartEngrammerFlow}
            onContinueEngrammerFlow={handleContinueEngrammerFlow}
            engrammerState={engrammerState}
            isEngrammerWorking={isEngrammerWorking}
            isInsightWorking={isInsightWorking}
            engrammerError={engrammerError}
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