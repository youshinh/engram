import React, { useMemo } from 'react';
import { Note, NoteStatus } from '../db';
import '../index.css';

interface NoteCardProps {
  note: Note;
  onDelete: (id: string) => void;
  onArchiveToggle: (id: string, status: NoteStatus) => void;
  onPinToggle: (id: string, isPinned: boolean) => void;
  onUpdateTaskCompletion?: (id: string, isCompleted: boolean) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ 
  note, 
  onDelete, 
  onArchiveToggle, 
  onPinToggle,
  onUpdateTaskCompletion
}) => {
  const formattedDate = note.createdAt.toLocaleString();

  const objectURL = useMemo(() => {
    if (note.type === 'image' && note.content instanceof Blob) {
      return URL.createObjectURL(note.content);
    }
    return null;
  }, [note.content, note.type]);

  const renderContent = () => {
    switch (note.type) {
      case 'text':
        return <p>{note.content as string}</p>;
      case 'image':
        if (objectURL) {
          return <img src={objectURL} alt="Note Image" style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }} />;
        }
        return <p>Invalid image content</p>;
      case 'url':
        return <a href={note.content as string} target="_blank" rel="noopener noreferrer">{note.content as string}</a>;
      case 'task':
        return (
          <div className="task-item">
            <input 
              type="checkbox" 
              checked={note.isCompleted || false} 
              onChange={() => onUpdateTaskCompletion && onUpdateTaskCompletion(note.id, !note.isCompleted)}
            />
            <p style={{ textDecoration: note.isCompleted ? 'line-through' : 'none' }}>
              {note.content as string}
            </p>
          </div>
        );
      case 'workshop':
        try {
          if (typeof note.content !== 'string') return <p>Invalid workshop content</p>;
          const workshopContent = JSON.parse(note.content);
          return (
            <div>
              {workshopContent.attachment && workshopContent.attachment.mimeType.startsWith('image/') && (
                <img 
                  src={`data:${workshopContent.attachment.mimeType};base64,${workshopContent.attachment.data}`}
                  alt="Attachment"
                  style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px', marginBottom: '8px' }}
                />
              )}
              <p>{workshopContent.text}</p>
            </div>
          );
        } catch (e) {
          console.error("Failed to parse workshop content", e);
          return <p>Error displaying workshop note.</p>;
        }
      default:
        return <p>{note.content as string}</p>;
    }
  };

  return (
    <div className={`note-card glass-card ${note.isPinned ? 'pinned' : ''}`}>
      <div className="note-card-header">
        <div className="note-header-left">
          <span className="note-type">{note.type.toUpperCase()}</span>
          <div className="note-actions-secondary">
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
      </div>
      <div className="note-actions-main-pin"> {/* New container for pin button */}
        <button onClick={() => onPinToggle(note.id, !note.isPinned)} className="icon-button small">
          <span className="material-symbols-outlined">
            {note.isPinned ? 'keep' : 'keep_off'}
          </span>
        </button>
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