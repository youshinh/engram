import React from 'react';
import { View } from '../App';
import '../index.css'; // glass-card スタイルのためにインポート
import './SideNav.css'; // SideNav 専用のスタイル

interface SideNavProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: View) => void;
  currentView: View;
}

const SideNav: React.FC<SideNavProps> = ({ isOpen, onClose, onNavigate, currentView }) => {
  const handleNavigationClick = (view: View) => {
    onNavigate(view);
  };

  return (
    <div className={`side-nav-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <nav className={`side-nav glass-card ${isOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="icon-button close-button">
          <span className="material-symbols-outlined">close</span>
        </button>
        <ul>
          <li>
            <button
              className={`nav-item ${currentView === 'main' ? 'active' : ''}`}
              onClick={() => handleNavigationClick('main')}
            >
              <span className="material-symbols-outlined">home</span>
              <span>Home</span>
            </button>
          </li>
          <li>
            <button
              className={`nav-item ${currentView === 'notes' ? 'active' : ''}`}
              onClick={() => handleNavigationClick('notes')}
            >
              <span className="material-symbols-outlined">note_alt</span>
              <span>Notes</span>
            </button>
          </li>
          <li>
            <button
              className={`nav-item ${currentView === 'connections' ? 'active' : ''}`}
              onClick={() => handleNavigationClick('connections')}
            >
              <span className="material-symbols-outlined">bubble_chart</span>
              <span>Connections</span>
            </button>
          </li>
          <li>
            <button
              className={`nav-item ${currentView === 'archive' ? 'active' : ''}`}
              onClick={() => handleNavigationClick('archive')}
            >
              <span className="material-symbols-outlined">archive</span>
              <span>Archive</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default SideNav;
