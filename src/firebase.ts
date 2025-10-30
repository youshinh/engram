import { Note } from './db';

// Placeholder for Firebase Cloud Functions
// In a real scenario, this would use Firebase SDK to call a callable function.

interface InsightSuggestion {
  targetNoteId: string;
  reasoning: string;
}

export async function findConnectionsCloud(
  newNote: { id: string; type: Note['type']; content: string },
  contextNotes: { id: string; type: Note['type']; content: string }[]
): Promise<InsightSuggestion[]> {
  console.log('Calling findConnectionsCloud (mocked)...');
  console.log('New Note:', newNote);
  console.log('Context Notes:', contextNotes);

  // Simulate a network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Return a mock response
  return [
    {
      targetNoteId: contextNotes[0]?.id || 'mock-id-1',
      reasoning: 'This is a mock connection reasoning from cloud.',
    },
  ];
}

export async function embedNote(
  type: Note['type'],
  content: string
): Promise<number[]> {
  console.log('Calling embedNote (mocked)...');
  console.log('Type:', type);
  console.log('Content:', content.substring(0, 50) + '...'); // Log first 50 chars

  // Simulate a network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Return a mock embedding (e.g., a fixed-size array of random numbers)
  const mockEmbedding = Array.from({ length: 768 }, () => Math.random()); // Common embedding size
  return mockEmbedding;
}

interface AceFlowResponse {
  response: string;
  playbookSize: number;
}

export async function callAceFlow(
  thread_id: string,
  query: string
): Promise<AceFlowResponse> {
  console.log('Calling aceFlow (mocked)...');
  console.log('Thread ID:', thread_id);
  console.log('Query:', query);

  // Simulate a network delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Return a mock response
  return {
    response: `This is a mock response from ACE for query: "${query}". Playbook size: 10.`,
    playbookSize: 10,
  };
}

export async function getPlaybookNote(noteId: string): Promise<Note | null> {
  console.log('Calling getPlaybookNote (mocked)...');
  console.log('Note ID:', noteId);

  // Simulate a network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Return a mock Note
  if (noteId === 'mock-playbook-note-id') { // Example for a specific mock ID
    return {
      id: 'mock-playbook-note-id',
      type: 'text',
      content: 'This is a mock playbook note content from the cloud.',
      createdAt: new Date(),
      embeddingStatus: 'completed',
      insightStatus: 'completed',
      status: 'active',
    };
  }
  return null;
}