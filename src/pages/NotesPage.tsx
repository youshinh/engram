import React, { useEffect, useState, useCallback } from 'react';
import { db, Note } from '../db';
import NoteCard from '../components/NoteCard';
import '../index.css'; // glass-card スタイルのためにインポート

const NOTES_PER_PAGE = 10;

const NotesPage: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadNotes = useCallback(async (currentOffset: number) => {
    setLoading(true);
    try {
      const newNotes = await db.getPaginatedNotes(currentOffset, NOTES_PER_PAGE, 'active');
      setNotes((prevNotes) => {
        // 重複を避けるために、新しいノートが既存のノートと重複しないようにフィルタリング
        const existingIds = new Set(prevNotes.map(note => note.id));
        const filteredNewNotes = newNotes.filter(note => !existingIds.has(note.id));
        return [...prevNotes, ...filteredNewNotes];
      });
      setOffset(currentOffset + newNotes.length);
      setHasMore(newNotes.length === NOTES_PER_PAGE);
    } catch (error) {
      console.error("Failed to load notes:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes(0); // 初期ロード
  }, [loadNotes]);

  const handleDeleteNote = useCallback(async (id: string) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
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
      await db.notes.update(id, { status });
      setNotes((prevNotes) => prevNotes.filter((note) => note.id !== id)); // 現在のリストから削除
      // 必要であれば、アーカイブページで更新をトリガーする
    } catch (error) {
      console.error("Failed to toggle archive status:", error);
    }
  }, []);

  const handlePinToggle = useCallback(async (id: string, isPinned: boolean) => {
    try {
      await db.notes.update(id, { isPinned });
      setNotes((prevNotes) =>
        prevNotes.map((note) => (note.id === id ? { ...note, isPinned } : note))
      );
      // ピン留めされたノートをリストの先頭に移動するなど、表示順序の調整が必要な場合がある
    } catch (error) {
      console.error("Failed to toggle pin status:", error);
    }
  }, []);

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      loadNotes(offset);
    }
  };

  return (
    <div className="notes-page">
      <h2>Your Notes</h2>
      <div className="notes-list">
        {notes.length === 0 && !loading && <p>No notes yet. Start writing!</p>}
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

export default NotesPage;
