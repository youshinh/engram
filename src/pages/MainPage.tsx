import React from 'react';
import NoteInput from '../components/NoteInput';
import { NoteType } from '../db';

interface MainPageProps {
  onAddNote: (content: string, type?: NoteType) => void;
}

const MainPage: React.FC<MainPageProps> = ({ onAddNote }) => {
  return (
    <div className="main-page">
      <h2>Welcome to en:gram</h2>
      <p>Your intellectual creativity partner.</p>
      <NoteInput onAddNote={onAddNote} />
      {/* 将来的にACE対話エリアやInsight Bloom Animationなどをここに追加 */}
    </div>
  );
};

export default MainPage;
