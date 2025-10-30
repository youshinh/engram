import React, { useState } from 'react';
import '../index.css'; // glass-card スタイルのためにインポート

interface NoteInputProps {
  onAddNote: (content: string) => void;
}

const NoteInput: React.FC<NoteInputProps> = ({ onAddNote }) => {
  const [noteContent, setNoteContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (noteContent.trim()) {
      onAddNote(noteContent);
      setNoteContent('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="note-input-card glass-card">
      <textarea
        value={noteContent}
        onChange={(e) => setNoteContent(e.target.value)}
        placeholder="Write your thoughts here..."
        rows={4}
        className="note-textarea"
      />
      <div className="note-input-actions">
        {/* 将来的にツールボタンをここに追加 */}
        <button type="submit" className="submit-button">
          <span className="material-symbols-outlined">send</span>
          Add Note
        </button>
      </div>
    </form>
  );
};

export default NoteInput;
