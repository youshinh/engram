import React, { useEffect, useState, useCallback } from 'react';
import { db, Note, NoteType } from '../db';
import NoteCard from '../components/NoteCard';
import TaskItem from '../components/TaskItem';
import '../index.css';

const NOTES_PER_PAGE = 10;

interface ProjectPageProps {
  projectId: string;
  onDelete: (id: string) => void;
  onArchiveToggle: (id: string, status: 'active' | 'archived') => void;
  onPinToggle: (id: string, isPinned: boolean) => void;
  onToggleTaskCompletion: (id: string, isCompleted: boolean) => void;
}

const ProjectPage: React.FC<ProjectPageProps> = ({
  projectId,
  onDelete,
  onArchiveToggle,
  onPinToggle,
  onToggleTaskCompletion,
}) => {
  const [projectNotes, setProjectNotes] = useState<Note[]>([]);
  const [projectTitle, setProjectTitle] = useState<string>('Loading Project...');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadProjectDetails = useCallback(async () => {
    const projectNote = await db.notes.get(projectId);
    if (projectNote && projectNote.type === 'project') {
      setProjectTitle(projectNote.content as string);
    }
  }, [projectId]);

  const loadProjectNotes = useCallback(async (currentOffset: number) => {
    setLoading(true);
    try {
      const newNotes = await db.getPaginatedNotes(currentOffset, NOTES_PER_PAGE, 'active', projectId);
      setProjectNotes((prevNotes) => {
        const existingIds = new Set(prevNotes.map(note => note.id));
        const filteredNewNotes = newNotes.filter(note => !existingIds.has(note.id));
        return [...prevNotes, ...filteredNewNotes];
      });
      setOffset(currentOffset + newNotes.length);
      setHasMore(newNotes.length === NOTES_PER_PAGE);
    } catch (error) {
      console.error("Failed to load project notes:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProjectDetails();
    setProjectNotes([]); // Reset notes when projectId changes
    setOffset(0);
    setHasMore(true);
    loadProjectNotes(0); // Initial load for project notes
  }, [projectId, loadProjectDetails, loadProjectNotes]);

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      loadProjectNotes(offset);
    }
  };

  return (
    <div className="project-page">
      <h2>Project: {projectTitle}</h2>
      <div className="project-notes-list">
        {projectNotes.length === 0 && !loading && <p>No notes in this project yet.</p>}
        {projectNotes.map((note) => (
          note.type === 'task' ? (
            <TaskItem
              key={note.id}
              task={note}
              onToggleCompletion={onToggleTaskCompletion}
              onDelete={onDelete}
            />
          ) : (
            <NoteCard
              key={note.id}
              note={note}
              onDelete={onDelete}
              onArchiveToggle={onArchiveToggle}
              onPinToggle={onPinToggle}
            />
          )
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

export default ProjectPage;
