import React, { useState, useRef, useMemo } from 'react';
import { NoteType } from '../db';
import '../index.css';

interface NoteInputProps {
  onAddNote: (payload: { text: string; attachment: File | null }) => void;
}

const NoteInput: React.FC<NoteInputProps> = ({ onAddNote }) => {
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const attachmentPreview = useMemo(() => {
    if (!attachment) return null;
    if (attachment.type.startsWith('image/')) {
      return URL.createObjectURL(attachment);
    }
    return null;
  }, [attachment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !attachment) return;

    onAddNote({ text, attachment });

    setText('');
    setAttachment(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachment(file);
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
  };

  const isSubmitDisabled = !text.trim() && !attachment;

  return (
    <form onSubmit={handleSubmit} className="note-input-card glass-card">
      {attachment && (
        <div className="attachment-preview">
          {attachment.type.startsWith('image/') && attachmentPreview && (
            <img src={attachmentPreview} alt="Preview" />
          )}
          {!attachment.type.startsWith('image/') && (
            <div className="file-info">
              <span className="material-symbols-outlined">description</span>
              <span>{attachment.name}</span>
            </div>
          )}
          <button type="button" className="icon-button small remove-attachment" onClick={removeAttachment}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your thoughts, or attach a file..."
        rows={3}
        className="note-textarea"
      />
      <div className="note-input-actions">
        <button type="button" className="icon-button" onClick={() => imageInputRef.current?.click()}>
          <span className="material-symbols-outlined">image</span>
        </button>
        <button type="button" className="icon-button" onClick={() => audioInputRef.current?.click()}>
          <span className="material-symbols-outlined">mic</span>
        </button>
        <button type="button" className="icon-button" onClick={() => fileInputRef.current?.click()}>
          <span className="material-symbols-outlined">attach_file</span>
        </button>
        <div className="spacer"></div>
        <button type="submit" className="icon-button submit-icon" disabled={isSubmitDisabled} aria-label="Add Note">
          <span className="material-symbols-outlined">send</span>
        </button>
      </div>

      {/* Hidden file inputs */}
      <input type="file" ref={imageInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />
      <input type="file" ref={audioInputRef} style={{ display: 'none' }} accept="audio/*" onChange={handleFileChange} />
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
    </form>
  );
};

export default NoteInput;
