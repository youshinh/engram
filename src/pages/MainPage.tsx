import React, { useState } from 'react';
import NoteInput from '../components/NoteInput';
import InsightBloomAnimation from '../components/InsightBloomAnimation';
import { EngrammerSessionState } from '../App'; // Import the new type

interface MainPageProps {
  onAddNote: (payload: { text: string; attachment: File | null }) => void;
  onCallEngrammerFlow: (query: string) => void;
  onContinueEngrammerFlow?: (userInput: string) => void; // Can be undefined
  engrammerState?: EngrammerSessionState; // Can be undefined
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

  const handleEngrammerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (engrammerQuery.trim() && !isEngrammerWorking) {
      onCallEngrammerFlow(engrammerQuery);
      setEngrammerQuery('');
    }
  };

  const handleContinueFlow = (userResponse: 'approve' | 'deny') => {
    if (onContinueEngrammerFlow) {
      onContinueEngrammerFlow(userResponse);
    }
  };

  const parseResponse = (text: string) => {
    const parts = text.split(/(Ref: [a-zA-Z0-9-]+)/g);
    return parts.map((part, index) => {
      const match = part.match(/Ref: ([a-zA-Z0-9-]+)/);
      if (match) {
        const noteId = match[1];
        return (
          <span 
            key={index} 
            className="clickable-ref" 
            onClick={() => onEngrammerResponseClick(noteId)}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const renderEngrammerResponse = () => {
    if (isEngrammerWorking && (!engrammerState || engrammerState.status === 'running' || engrammerState.status === 'learning')) {
      return <InsightBloomAnimation isAnimating={true} />;
    }
    if (engrammerError) {
      return <p className="error-message">{engrammerError}</p>;
    }
    if (!engrammerState) {
      return <p className="placeholder-text">Engrammer response will appear here.</p>;
    }

    switch (engrammerState.status) {
      case 'interrupted':
        return (
          <div className="hitl-section">
            {engrammerState.latestResponse && <p>{parseResponse(engrammerState.latestResponse)}</p>}
            {engrammerState.pendingInsights && engrammerState.pendingInsights.map((insight, index) => (
              <div key={index} className="insight-card">
                <strong>New Insight Proposed:</strong>
                <p>{insight.description}</p>
              </div>
            ))}
            <div className="hitl-actions">
              <p>Do you want to approve this learning?</p>
              <button onClick={() => handleContinueFlow('approve')} disabled={isEngrammerWorking}>Approve & Continue</button>
              <button onClick={() => handleContinueFlow('deny')} disabled={isEngrammerWorking} className="secondary">Deny</button>
            </div>
          </div>
        );
      case 'done':
        return (
          <div>
            {engrammerState.latestResponse && <p>{parseResponse(engrammerState.latestResponse)}</p>}
          </div>
        );
      case 'error':
        return <p className="error-message">{engrammerState.error || 'An unknown error occurred.'}</p>;
      default:
        return <p className="placeholder-text">Waiting for Engrammer...</p>;
    }
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
            <button type="submit" className="icon-button submit-icon" disabled={isEngrammerWorking} aria-label="Ask Engrammer">
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
