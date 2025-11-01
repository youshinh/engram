import React, { useEffect, useState, useCallback } from 'react';
import { db, Relation, Note } from '../db';
import RelationCard from '../components/RelationCard';
import '../index.css'; // glass-card スタイルのためにインポート

const ConnectionsPage: React.FC = () => {
  const [relations, setRelations] = useState<Relation[]>([]);
  const [notesMap, setNotesMap] = useState<Map<string, Note>>(new Map());
  const [loading, setLoading] = useState(true);

  const loadRelationsAndNotes = useCallback(async () => {
    setLoading(true);
    try {
      const allRelations = await db.relations.orderBy('createdAt').reverse().toArray();
      setRelations(allRelations);

      // 関連するノートのIDをすべて収集
      const noteIds = new Set<string>();
      allRelations.forEach(rel => {
        noteIds.add(rel.sourceNoteId);
        noteIds.add(rel.targetNoteId);
      });

      // 収集したIDに基づいてノートを一括取得
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
    } catch (error) {
      console.error("Failed to update feedback:", error);
    }
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
      <h2>Your Connections</h2>
      <div className="relations-list">
        {relations.length === 0 && <p>No connections found yet. Add more notes to discover them!</p>}
        {relations.map((relation) => (
          <RelationCard
            key={relation.id}
            relation={relation}
            onFeedback={handleFeedback}
            onUserCorrectedReasoning={handleUserCorrectedReasoning}
            sourceNoteContent={notesMap.get(relation.sourceNoteId)?.content || '[Note not found]'}
            targetNoteContent={notesMap.get(relation.targetNoteId)?.content || '[Note not found]'}
          />
        ))}
      </div>
    </div>
  );
};

export default ConnectionsPage;
