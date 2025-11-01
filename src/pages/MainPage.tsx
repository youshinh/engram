import React, { useState } from 'react';
import NoteInput from '../components/NoteInput';
import InsightBloomAnimation from '../components/InsightBloomAnimation';
import { NoteType } from '../db';

interface MainPageProps {
  onAddNote: (content: string, type?: NoteType) => void;
  onCallAceFlow: (query: string) => Promise<void>; // ACE呼び出し関数
  aceResponse: string; // ACE応答
  isAceWorking: boolean; // ACE動作中フラグ
  onAceResponseClick: () => void; // ACE応答クリック時のハンドラ
}

const MainPage: React.FC<MainPageProps> = ({ onAddNote, onCallAceFlow, aceResponse, isAceWorking, onAceResponseClick }) => {
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

      <div className="ace-section glass-card">
        <h3>ACE Agent</h3>
        <form onSubmit={handleAceSubmit} className="ace-input-form">
          <textarea
            value={aceQuery}
            onChange={(e) => setAceQuery(e.target.value)}
            placeholder="Ask ACE a question or deepen your thoughts..."
            rows={3}
            className="ace-textarea"
            disabled={isAceWorking} // ACE動作中は無効化
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

      {/* InsightBloomAnimation は ACE の動作状況に応じて表示を制御 */}
      {/* <InsightBloomAnimation /> */}
    </div>
  );
};

export default MainPage;
