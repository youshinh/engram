import React, { useState } from 'react';
import NoteInput from '../components/NoteInput';
import InsightBloomAnimation from '../components/InsightBloomAnimation';
import { NoteType } from '../db';

interface MainPageProps {
  onAddNote: (content: string, type?: NoteType) => void;
  onCallAceFlow: (query: string) => Promise<void>;
  aceResponse: string;
  isAceWorking: boolean;
  isInsightWorking: boolean; // Add this
  onAceResponseClick: () => void;
}

const MainPage: React.FC<MainPageProps> = ({ 
  onAddNote, 
  onCallAceFlow, 
  aceResponse, 
  isAceWorking, 
  isInsightWorking, // Add this
  onAceResponseClick 
}) => {
  const [aceQuery, setAceQuery] = useState('');

  const handleAceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (aceQuery.trim()) {
      onCallAceFlow(aceQuery);
      setAceQuery('');
    }
  };

  const hasRef = aceResponse.includes('Ref:');

  return (
    <div className="main-page">
      <h2>Welcome to en:gram</h2>
      <p>Your intellectual creativity partner.</p>
      <NoteInput onAddNote={onAddNote} />

      {/* Display insight animation when processing new note */}
      {isInsightWorking && <InsightBloomAnimation isAnimating={true} />}

      <div className="ace-section glass-card">
        <h3>ACE Agent</h3>
        <form onSubmit={handleAceSubmit} className="ace-input-form">
          <textarea
            value={aceQuery}
            onChange={(e) => setAceQuery(e.target.value)}
            placeholder="Ask ACE a question or deepen your thoughts..."
            rows={3}
            className="ace-textarea"
            disabled={isAceWorking}
          />
          <button type="submit" className="submit-button" disabled={isAceWorking}>
            <span className="material-symbols-outlined">psychology</span>
            {isAceWorking ? 'Thinking...' : 'Ask ACE'}
          </button>
        </form>
        <div className="ace-response-area">
          {isAceWorking && <InsightBloomAnimation isAnimating={true} />}
          {aceResponse && (
            <div onClick={onAceResponseClick} className={hasRef ? 'clickable' : ''}>
              <p>{aceResponse}</p>
            </div>
          )}
          {!isAceWorking && !aceResponse && <p>ACE response will appear here.</p>}
        </div>
      </div>
    </div>
  );
};

export default MainPage;
