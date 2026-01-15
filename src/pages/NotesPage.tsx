import React, { useCallback, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Note, NoteStatus } from '../db';
import NoteCard from '../components/NoteCard';
import '../index.css';

const NOTES_PER_PAGE = 10;

const NotesPage: React.FC = () => {
  const [offset, setOffset] = useState(0);
  const [visibleCount, setVisibleCount] = useState(NOTES_PER_PAGE);

  // Use useLiveQuery to automatically update when notes are added/modified
  const notes = useLiveQuery(
    () => db.getPaginatedNotes(0, visibleCount, 'active'),
    [visibleCount]
  );

  const totalNotesCount = useLiveQuery(() => db.countNotes('active'), []);

  const handleDeleteNote = useCallback(async (id: string) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await db.notes.delete(id);
      } catch (error) {
        console.error("Failed to delete note:", error);
      }
    }
  }, []);

  const handleArchiveToggle = useCallback(async (id: string, status: NoteStatus) => {
    try {
      await db.notes.update(id, { status });
    } catch (error) {
      console.error("Failed to toggle archive status:", error);
    }
  }, []);

  const handlePinToggle = useCallback(async (id: string, isPinned: boolean) => {
    try {
      await db.notes.update(id, { isPinned });
    } catch (error) {
      console.error("Failed to toggle pin status:", error);
    }
  }, []);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + NOTES_PER_PAGE);
  };

  const hasMore = (totalNotesCount || 0) > (notes?.length || 0);

  if (!notes) return <p>Loading notes...</p>;

  return (
    <div className="notes-page">
      <h2>Your Notes</h2>
      <div className="notes-list">
        {notes.length === 0 && <p>No notes yet. Start writing!</p>}
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            onDelete={handleDeleteNote}
            onArchiveToggle={handleArchiveToggle}
            onPinToggle={handlePinToggle}
          />
        ))}
      </div>
      {hasMore && (
        <button onClick={handleLoadMore} className="load-more-button glass-card">
          Load More
        </button>
      )}
    </div>
  );
};

export default NotesPage;
