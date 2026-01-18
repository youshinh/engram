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
        <p className="relation-section"><strong>From:</strong> {sourceNoteContent || relation.sourceId}</p>
        <p className="relation-section"><strong>To:</strong> {targetNoteContent || relation.targetId}</p>
        <p className="relation-section"><strong>Reasoning:</strong> {relation.reasoning}</p>
        {relation.userCorrectedReasoning && !isEditingReasoning && (
          <p className="user-correction relation-section"><strong>Your Correction:</strong> {relation.userCorrectedReasoning}</p>
        )}
        {isEditingReasoning && (
          <div className="edit-reasoning-area">
            <textarea
              value={editedReasoning}
              onChange={(e) => setEditedReasoning(e.target.value)}
              rows={3}
              placeholder="Enter your corrected reasoning..."
              className="ace-textarea"
            />
            <div className="edit-actions">
              <button onClick={() => setIsEditingReasoning(false)} className="icon-button small">Cancel</button>
              <button onClick={handleSaveReasoning} className="button primary small">Save</button>
            </div>
          </div>
        )}
      </div>
      <div className="relation-card-footer">
        <span className="relation-date">{formattedDate}</span>
        <div className="relation-actions">
          {!isEditingReasoning && (
            <button onClick={() => setIsEditingReasoning(true)} className="icon-button small edit-reasoning-button">
              <span className="material-symbols-outlined">edit</span>
            </button>
          )}
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
