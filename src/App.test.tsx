import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import App from './App';
import { db, Note } from './db';
import * as firebase from './firebase';

// Dexie.jsのモック
vi.mock('./db', async () => {
  const actual = await vi.importActual('./db');
  const mockNotes: { [id: string]: Note } = {
    'mock-note-local': {
      id: 'mock-note-local',
      type: 'text',
      content: 'Content from local DB',
      createdAt: new Date(),
      embeddingStatus: 'completed',
      insightStatus: 'completed',
      status: 'active',
      isPinned: false,
      tags: [],
    },
    'new-mock-note': {
        id: 'new-mock-note',
        type: 'text',
        content: 'A new note content',
        createdAt: new Date(),
        embeddingStatus: 'pending',
        insightStatus: 'pending',
        status: 'active',
        isPinned: false,
        tags: [],
    }
  };

  const mockDb = {
    notes: {
      add: vi.fn((note: Note) => {
        const newId = 'new-mock-note';
        mockNotes[newId] = { ...note, id: newId };
        return Promise.resolve(newId);
      }),
      get: vi.fn((id: string) => {
        return Promise.resolve(mockNotes[id]);
      }),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({ limit: vi.fn(() => ({ toArray: vi.fn(() => Promise.resolve([])) })) })),
        notEqual: vi.fn(() => ({ toArray: vi.fn(() => Promise.resolve(Object.values(mockNotes))) })),
        and: vi.fn(() => ({ limit: vi.fn(() => ({ toArray: vi.fn(() => Promise.resolve([])) })) })),
      })),
      update: vi.fn((id, changes) => {
        if (mockNotes[id]) {
            mockNotes[id] = { ...mockNotes[id], ...changes };
        }
        return Promise.resolve(1);
      }),
    },
    relations: {
      bulkAdd: vi.fn(() => Promise.resolve()),
      update: vi.fn(() => Promise.resolve(1)),
    },
    open: vi.fn(() => Promise.resolve()),
    delete: vi.fn(() => Promise.resolve()),
  };
  return { ...actual, db: mockDb };
});

// firebase.tsのモック
vi.mock('./firebase', () => ({
  findConnectionsCloud: vi.fn(() => Promise.resolve([])),
  embedNote: vi.fn(() => Promise.resolve(Array.from({ length: 768 }, () => Math.random()))),
  engrammerFlow_start: vi.fn(() => Promise.resolve({ thread_id: 'mock-thread-id', state: [ { type: 'start' } ] })),
  getEngrammerState: vi.fn()
    .mockResolvedValueOnce({ state: [ { type: 'running' } ] })
    .mockResolvedValueOnce({ state: [ { type: 'end' } ] }),
  engrammerFlow_continue: vi.fn(() => Promise.resolve({ thread_id: 'mock-thread-id', state: [ { type: 'end' } ] })),
  engrammerFlow_getNote: vi.fn(() => Promise.resolve(null)),
}));

// window.aiのモック
const mockPrompt = vi.fn(() => Promise.resolve('[]'));
const mockCreateTextSession = vi.fn(() => Promise.resolve({ prompt: mockPrompt }));

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'ai', { value: undefined, writable: true });
});

afterEach(() => {
  cleanup();
});

describe('App Component', () => {
  it('should render AppHeader and SideNav', async () => {
    render(<App />);
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('heading', { name: /en:gram/i, level: 1 })).toBeInTheDocument());
    expect(screen.getByText(/Notes/i)).toBeInTheDocument();
  });

  it('should add a note and trigger insight generation', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByPlaceholderText(/Write your thoughts here.../i)).toBeInTheDocument());

    const noteInput = screen.getByPlaceholderText(/Write your thoughts here.../i);
    const addButton = screen.getByText(/Add Note/i);

    fireEvent.change(noteInput, { target: { value: 'My new test note' } });
    fireEvent.click(addButton);

    await waitFor(() => expect(db.notes.add).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'My new test note', type: 'text' })
    ));
  });

  it('should use cloud fallback when on-device AI is unavailable', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByPlaceholderText(/Write your thoughts here.../i)).toBeInTheDocument());

    const noteInput = screen.getByPlaceholderText(/Write your thoughts here.../i);
    const addButton = screen.getByText(/Add Note/i);

    fireEvent.change(noteInput, { target: { value: 'Note for cloud fallback' } });
    fireEvent.click(addButton);

    await waitFor(() => expect(firebase.findConnectionsCloud).toHaveBeenCalled());
    expect(mockCreateTextSession).not.toHaveBeenCalled();
  });

  it('should use on-device AI when available', async () => {
    Object.defineProperty(window, 'ai', {
      value: { createTextSession: mockCreateTextSession, LanguageModel: {} },
      writable: true,
    });

    render(<App />);
    await waitFor(() => expect(screen.getByPlaceholderText(/Write your thoughts here.../i)).toBeInTheDocument());

    const noteInput = screen.getByPlaceholderText(/Write your thoughts here.../i);
    const addButton = screen.getByText(/Add Note/i);

    fireEvent.change(noteInput, { target: { value: 'Note for on-device AI' } });
    fireEvent.click(addButton);

    await waitFor(() => expect(mockCreateTextSession).toHaveBeenCalled());
    await waitFor(() => expect(mockPrompt).toHaveBeenCalled());
    expect(firebase.findConnectionsCloud).not.toHaveBeenCalled();
  });

  it('should start engrammer flow and poll for state', async () => {
    const { getByPlaceholderText, getByText } = render(<App />);
    await waitFor(() => expect(getByPlaceholderText(/Ask Engrammer a question.../i)).toBeInTheDocument());

    const engrammerInput = getByPlaceholderText(/Ask Engrammer a question.../i);
    const engrammerButton = getByText(/Ask Engrammer/i);

    fireEvent.change(engrammerInput, { target: { value: 'Test query' } });
    await fireEvent.click(engrammerButton);

    await waitFor(() => expect(firebase.engrammerFlow_start).toHaveBeenCalledWith('Test query'));
    
    await waitFor(() => expect(firebase.getEngrammerState).toHaveBeenCalledWith('mock-thread-id'), { timeout: 30000 });
  }, 30000);

  it('should display a note in modal when Engrammer response is clicked', async () => {
    const { getByRole, getByText, findByText } = render(<App />);
    await waitFor(() => expect(getByRole('heading', { name: /en:gram/i, level: 1 })).toBeInTheDocument());

    const engrammerInput = screen.getByPlaceholderText(/Ask Engrammer a question.../i);
    const engrammerButton = screen.getByText(/Ask Engrammer/i);

    (firebase.engrammerFlow_start as any).mockResolvedValueOnce({
      thread_id: 'mock-thread-id',
      state: [ { type: 'end', content: 'Here is some insight. Ref: mock-note-local' } ]
    });

    fireEvent.change(engrammerInput, { target: { value: 'Test query for local note' } });
    await fireEvent.click(engrammerButton);

    const responseArea = await findByText(/Here is some insight. Ref: mock-note-local/i);
    fireEvent.click(responseArea);

    await waitFor(() => {
      expect(getByText(/Note Detail/i)).toBeInTheDocument();
      expect(getByText(/Content from local DB/i)).toBeInTheDocument();
    }, { timeout: 30000 });
  }, 30000);
});
