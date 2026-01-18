import React, { useEffect, useState, useCallback } from 'react';
import { db, Note } from '../db';
import NoteCard from '../components/NoteCard';
import '../index.css';

const NOTES_PER_PAGE = 10;

const ArchivePage: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadArchivedNotes = useCallback(async (currentOffset: number) => {
    setLoading(true);
    try {
      const newNotes = await db.getPaginatedNotes(currentOffset, NOTES_PER_PAGE, 'archived');
      setNotes((prevNotes) => {
        const existingIds = new Set(prevNotes.map(note => note.id));
        const filteredNewNotes = newNotes.filter(note => !existingIds.has(note.id));
        return [...prevNotes, ...filteredNewNotes];
      });
      setOffset(currentOffset + newNotes.length);
      setHasMore(newNotes.length === NOTES_PER_PAGE);
    } catch (error) {
      console.error("Failed to load archived notes:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArchivedNotes(0); // Initial load
  }, [loadArchivedNotes]);

  const handleDeleteNote = useCallback(async (id: string) => {
    if (window.confirm('Are you sure you want to permanently delete this note?')) {
      try {
        await db.notes.delete(id);
        setNotes((prevNotes) => prevNotes.filter((note) => note.id !== id));
      } catch (error) {
        console.error("Failed to delete note:", error);
      }
    }
  }, []);

  const handleArchiveToggle = useCallback(async (id: string, status: 'active' | 'archived') => {
    try {
      // This function will un-archive a note, so we set status to 'active'
      await db.notes.update(id, { status: 'active' });
      setNotes((prevNotes) => prevNotes.filter((note) => note.id !== id)); // Remove from archive list
    } catch (error) {
      console.error("Failed to un-archive note:", error);
    }
  }, []);

  const handlePinToggle = useCallback(async (id: string, isPinned: boolean) => {
    try {
      await db.notes.update(id, { isPinned });
      setNotes((prevNotes) =>
        prevNotes.map((note) => (note.id === id ? { ...note, isPinned } : note))
      );
    } catch (error) {
      console.error("Failed to toggle pin status:", error);
    }
  }, []);

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      loadArchivedNotes(offset);
    }
  };

  return (
    <div className="archive-page">
      <h2>Archived Notes</h2>
      <div className="notes-list">
        {notes.length === 0 && !loading && <p>No archived notes.</p>}
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
      {loading && <p>Loading more notes...</p>}
      {hasMore && !loading && (
        <button onClick={handleLoadMore} className="load-more-button glass-card">
          Load More
        </button>
      )}
    </div>
  );
};

export default ArchivePage;