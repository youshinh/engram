import React, { useEffect, useState, useCallback } from 'react';
import { db, Relation, Note } from '../db';
import RelationCard from '../components/RelationCard';
import GraphView from '../components/GraphView';
import '../index.css';

type ViewMode = 'list' | 'graph';

const ConnectionsPage: React.FC = () => {
  const [relations, setRelations] = useState<Relation[]>([]);
  const [notesMap, setNotesMap] = useState<Map<string, Note>>(new Map());
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const loadRelationsAndNotes = useCallback(async () => {
    setLoading(true);
    try {
      const allRelations = await db.relations.orderBy('createdAt').reverse().toArray();
      setRelations(allRelations);

      const noteIds = new Set<string>();
      allRelations.forEach(rel => {
        noteIds.add(rel.sourceId);
        noteIds.add(rel.targetId);
      });

      const notes = await db.notes.bulkGet(Array.from(noteIds));
      const newNotesMap = new Map<string, Note>();
      notes.forEach(note => {
        if (note) newNotesMap.set(note.id, note);
      });
      setNotesMap(newNotesMap);

    } catch (error) {
      console.error("Failed to load relations or notes:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRelationsAndNotes();
  }, [loadRelationsAndNotes]);

  const handleFeedback = useCallback(async (id: string, feedback: 'useful' | 'harmful') => {
    try {
      await db.relations.update(id, { feedback });
      setRelations(prevRelations =>
        prevRelations.map(rel => (rel.id === id ? { ...rel, feedback } : rel))
      );
        } catch (error) {    }
  }, []);

  const handleUserCorrectedReasoning = useCallback(async (id: string, reasoning: string) => {
    try {
      await db.relations.update(id, { userCorrectedReasoning: reasoning });
      setRelations(prevRelations =>
        prevRelations.map(rel => (rel.id === id ? { ...rel, userCorrectedReasoning: reasoning } : rel))
      );
    } catch (error) {
      console.error("Failed to update user corrected reasoning:", error);
    }
  }, []);

  if (loading) {
    return <div className="connections-page">Loading connections...</div>;
  }

  return (
    <div className="connections-page">
      <div className="view-mode-toggle">
        <h2>Your Connections</h2>
        <button onClick={() => setViewMode('list')} className={`button ${viewMode === 'list' ? 'active' : ''}`}>List</button>
        <button onClick={() => setViewMode('graph')} className={`button ${viewMode === 'graph' ? 'active' : ''}`}>Graph</button>
      </div>

      {viewMode === 'list' ? (
        <div className="relations-list">
          {relations.length === 0 ? (
            <p>No connections found yet. Add more notes to discover them!</p>
          ) : (
            relations.map((relation) => {
              const sourceNote = notesMap.get(relation.sourceId);
              const targetNote = notesMap.get(relation.targetId);

              const getContentSummary = (note: Note | undefined): string => {
                if (!note) return 'Note not found';
                if (note.generatedCaption) return note.generatedCaption;
                if (note.type === 'workshop' && typeof note.content === 'string') {
                  try {
                    const workshopContent = JSON.parse(note.content);
                    return workshopContent.text || '[Workshop Note]';
                  } catch (e) {
                    return '[Invalid Workshop Note]';
                  }
                }
                if (typeof note.content === 'string') return note.content;
                return `[${note.type} Note]`;
              };

              const sourceContent = getContentSummary(sourceNote);
              const targetContent = getContentSummary(targetNote);

              return (
                <RelationCard
                  key={relation.id}
                  relation={relation}
                  onFeedback={handleFeedback}
                  onUserCorrectedReasoning={handleUserCorrectedReasoning}
                  sourceNoteContent={sourceContent}
                  targetNoteContent={targetContent}
                />
              );
            })
          )}
        </div>
      ) : (
        <div style={{ height: '85vh' }}>
          <GraphView
            notes={Array.from(notesMap.values())}
            relations={relations}
          />
        </div>
      )}
    </div>
  );
};

export default ConnectionsPage;