import React from 'react';
import { Relation } from '../db';
import '../index.css'; // glass-card スタイルのためにインポート

interface RelationCardProps {
  relation: Relation;
  onFeedback?: (id: string, feedback: 'useful' | 'harmful') => void;
  onUserCorrectedReasoning?: (id: string, reasoning: string) => void;
  // 将来的にsourceNoteとtargetNoteのコンテンツを表示するために、Noteオブジェクトを渡すことも検討
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
        {relation.userCorrectedReasoning && (
          <p><strong>User Correction:</strong> {relation.userCorrectedReasoning}</p>
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
          {/* onUserCorrectedReasoning の実装は後で */}
        </div>
      </div>
    </div>
  );
};

export default RelationCard;
