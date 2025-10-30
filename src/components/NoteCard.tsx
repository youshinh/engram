import React from 'react';
import { Note } from '../db';
import '../index.css'; // glass-card スタイルのためにインポート

interface NoteCardProps {
  note: Note;
  onDelete: (id: string) => void;
  onArchiveToggle: (id: string, status: 'active' | 'archived') => void;
  onPinToggle: (id: string, isPinned: boolean) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onDelete, onArchiveToggle, onPinToggle }) => {
  const formattedDate = note.createdAt.toLocaleString();

  const renderContent = () => {
    switch (note.type) {
      case 'text':
        return <p>{note.content as string}</p>;
      case 'image':
        return <img src={note.content as string} alt="Note Image" style={{ maxWidth: '100%', height: 'auto' }} />;
      case 'url':
        return <a href={note.content as string} target="_blank" rel="noopener noreferrer">{note.content as string}</a>;
      case 'workshop':
        // Workshop content can be complex, display a summary or specific parts
        return <p>Workshop Note: {JSON.stringify(note.content).substring(0, 100)}...</p>;
      default:
        return <p>{note.content as string}</p>;
    }
  };

  return (
    <div className="note-card glass-card">
      <div className="note-card-header">
        <span className="note-type">{note.type.toUpperCase()}</span>
        <div className="note-actions">
          <button onClick={() => onPinToggle(note.id, !note.isPinned)} className="icon-button small">
            <span className="material-symbols-outlined">
              {note.isPinned ? 'push_pin' : 'push_pin'}
            </span>
          </button>
          <button onClick={() => onArchiveToggle(note.id, note.status === 'active' ? 'archived' : 'active')} className="icon-button small">
            <span className="material-symbols-outlined">
              {note.status === 'active' ? 'archive' : 'unarchive'}
            </span>
          </button>
          <button onClick={() => onDelete(note.id)} className="icon-button small">
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
      <div className="note-card-content">
        {renderContent()}
      </div>
      <div className="note-card-footer">
        <span className="note-date">{formattedDate}</span>
        {note.tags && note.tags.length > 0 && (
          <div className="note-tags">
            {note.tags.map((tag, index) => (
              <span key={index} className="note-tag">#{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NoteCard;
