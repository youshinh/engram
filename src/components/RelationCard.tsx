import React, { useState } from 'react'; // Import useState
import { Relation } from '../db';
import '../index.css'; // glass-card スタイルのためにインポート

interface RelationCardProps {
  relation: Relation;
  onFeedback?: (id: string, feedback: 'useful' | 'harmful') => void;
  onUserCorrectedReasoning?: (id: string, reasoning: string) => void;
  sourceNoteContent?: string;
  targetNoteContent?: string;
}

const RelationCard: React.FC<RelationCardProps> = ({
  relation,
  onFeedback,
  onUserCorrectedReasoning,
  sourceNoteContent,
  targetNoteContent,
}) => {
  const formattedDate = relation.createdAt.toLocaleString();
  const [isEditingReasoning, setIsEditingReasoning] = useState(false);
  const [editedReasoning, setEditedReasoning] = useState(relation.userCorrectedReasoning || relation.reasoning || '');

  const handleSaveReasoning = () => {
    if (onUserCorrectedReasoning && editedReasoning.trim()) {
      onUserCorrectedReasoning(relation.id, editedReasoning.trim());
      setIsEditingReasoning(false);
    }
  };

  return (
    <div className="relation-card glass-card">
      <div className="relation-card-header">
        <span className="material-symbols-outlined">link</span>
        <h3>Connection Insight</h3>
      </div>
      <div className="relation-card-content">
        <p><strong>From:</strong> {sourceNoteContent || relation.sourceNoteId}</p>
        <p><strong>To:</strong> {targetNoteContent || relation.targetNoteId}</p>
        <p><strong>Reasoning:</strong> {relation.reasoning}</p>
        {relation.userCorrectedReasoning && !isEditingReasoning && (
          <p><strong>User Correction:</strong> {relation.userCorrectedReasoning}</p>
        )}
        {isEditingReasoning ? (
          <div className="edit-reasoning-area">
            <textarea
              value={editedReasoning}
              onChange={(e) => setEditedReasoning(e.target.value)}
              rows={3}
              placeholder="Enter your corrected reasoning..."
              className="ace-textarea" // Reusing style
            />
            <button onClick={handleSaveReasoning} className="submit-button small">Save</button>
            <button onClick={() => setIsEditingReasoning(false)} className="icon-button small">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setIsEditingReasoning(true)} className="icon-button small">
            <span className="material-symbols-outlined">edit</span>
            Correct Reasoning
          </button>
        )}
      </div>
      <div className="relation-card-footer">
        <span className="relation-date">{formattedDate}</span>
        <div className="relation-feedback">
          {onFeedback && (
            <>
              <button
                className={`icon-button small ${relation.feedback === 'useful' ? 'active' : ''}`}
                onClick={() => onFeedback(relation.id, 'useful')}
              >
                <span className="material-symbols-outlined">thumb_up</span>
              </button>
              <button
                className={`icon-button small ${relation.feedback === 'harmful' ? 'active' : ''}`}
                onClick={() => onFeedback(relation.id, 'harmful')}
              >
                <span className="material-symbols-outlined">thumb_down</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RelationCard;
