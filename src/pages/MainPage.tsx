import React, { useState } from 'react';
import NoteInput from '../components/NoteInput';
import InsightBloomAnimation from '../components/InsightBloomAnimation';
import { Note, NoteType } from '../db';

interface MainPageProps {
  onAddNote: (payload: { text: string; attachment: File | null }) => void;
  onCallEngrammerFlow: (query: string) => Promise<void>;
  onContinueEngrammerFlow: (userInput: string) => Promise<void>;
  engrammerState: any;
  isEngrammerWorking: boolean;
  isInsightWorking: boolean;
  engrammerError: string | null;
  onEngrammerResponseClick: (noteId: string) => void;
}

const MainPage: React.FC<MainPageProps> = ({ 
  onAddNote, 
  onCallEngrammerFlow, 
  onContinueEngrammerFlow,
  engrammerState,
  isEngrammerWorking, 
  isInsightWorking, 
  engrammerError,
  onEngrammerResponseClick 
}) => {
  const [engrammerQuery, setEngrammerQuery] = useState('');
  const [hitlInput, setHitlInput] = useState('');

  const handleEngrammerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (engrammerQuery.trim()) {
      onCallEngrammerFlow(engrammerQuery);
      setEngrammerQuery('');
    }
  };

  const handleContinueFlow = () => {
    if (hitlInput.trim()) {
      onContinueEngrammerFlow(hitlInput);
      setHitlInput('');
    }
  };

  const renderEngrammerResponse = () => {
    if (isEngrammerWorking && !engrammerState) {
      return <InsightBloomAnimation isAnimating={true} />;
    }
    if (engrammerError) {
      return <p className="error">{engrammerError}</p>;
    }
    if (!engrammerState) {
      return <p>Engrammer response will appear here.</p>;
    }

    return engrammerState.map((item: any, index: number) => {
      if (item.type === 'human') {
        return (
          <div key={index} className="hitl-section">
            <p>{item.content}</p>
            <textarea
              value={hitlInput}
              onChange={(e) => setHitlInput(e.target.value)}
              placeholder="Your response..."
              rows={3}
            />
            <button onClick={handleContinueFlow} disabled={isEngrammerWorking}>
              Continue
            </button>
          </div>
        );
      }
      const hasRef = item.content && item.content.includes('Ref:');
      const noteIdMatch = item.content && item.content.match(/Ref: ([a-zA-Z0-9-]+)/);
      const noteId = noteIdMatch ? noteIdMatch[1] : null;

      return (
        <div key={index} onClick={() => noteId && onEngrammerResponseClick(noteId)} className={hasRef ? 'clickable' : ''}>
          <p>{item.content}</p>
        </div>
      );
    });
  };

  return (
    <div className="main-page">
      <h2>Welcome to en:gram</h2>
      <p>Your intellectual creativity partner.</p>
      <NoteInput onAddNote={onAddNote} />

      {isInsightWorking && <InsightBloomAnimation isAnimating={true} />}

      <div className="engrammer-section glass-card">
        <h3>Engrammer</h3>
        <form onSubmit={handleEngrammerSubmit} className="note-input-card engrammer-input-form">
          <textarea
            value={engrammerQuery}
            onChange={(e) => setEngrammerQuery(e.target.value)}
            placeholder="Ask Engrammer a question..."
            rows={3}
            className="note-textarea"
            disabled={isEngrammerWorking}
          />
          <div className="note-input-actions">
            <div className="spacer"></div>
            <button type="submit" className="icon-button submit-icon" disabled={isEngrammerWorking}>
              <span className="material-symbols-outlined">send</span>
            </button>
          </div>
        </form>
        <div className="engrammer-response-area">
          {renderEngrammerResponse()}
        </div>
      </div>
    </div>
  );
};

export default MainPage;