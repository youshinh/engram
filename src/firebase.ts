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