import React from 'react';
import { Theme } from '../App';
import '../index.css'; // glass-card スタイルのためにインポート

interface AppHeaderProps {
  toggleNav: () => void;
  toggleTheme: () => void;
  currentTheme: Theme;
}

const AppHeader: React.FC<AppHeaderProps> = ({ toggleNav, toggleTheme, currentTheme }) => {
  return (
    <header className="app-header">
      <button onClick={toggleNav} className="icon-button">
        <span className="material-symbols-outlined">menu</span>
      </button>
      <h1 className="app-title">en:gram</h1>
      <button onClick={toggleTheme} className="icon-button">
        <span className="material-symbols-outlined">
          {currentTheme === 'dark' ? 'light_mode' : 'dark_mode'}
        </span>
      </button>
    </header>
  );
};

export default AppHeader;
