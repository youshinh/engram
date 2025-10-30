import React, { useState, useEffect, useCallback } from 'react';
import { db, NoteType } from './db'; // Dexie.jsデータベースインスタンス

// 仮のコンポーネント (後で実装)
const AppHeader = React.lazy(() => import('./components/AppHeader'));
const SideNav = React.lazy(() => import('./components/SideNav'));
const NotesPage = React.lazy(() => import('./pages/NotesPage'));
const ConnectionsPage = React.lazy(() => import('./pages/ConnectionsPage'));
const MainPage = React.lazy(() => import('./pages/MainPage'));
const ArchivePage = React.lazy(() => import('./pages/ArchivePage'));

export type View = 'main' | 'notes' | 'connections' | 'archive';
export type Theme = 'light' | 'dark';

function App() {
  const [view, setView] = useState<View>('main');
  const [theme, setTheme] = useState<Theme>(() => {
    // ローカルストレージからテーマを読み込むか、システムのデフォルトを使用
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [isNavOpen, setIsNavOpen] = useState(false);

  // テーマの適用とローカルストレージへの保存
  useEffect(() => {
    document.body.className = theme === 'dark' ? 'dark-theme' : '';
    localStorage.setItem('theme', theme);
  }, [theme]);

  // テーマ切り替えハンドラ
  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

  // 画面遷移ハンドラ
  const handleNavigate = useCallback((newView: View) => {
    setView(newView);
    setIsNavOpen(false); // ナビゲーション後は閉じる
  }, []);

  // ナビゲーション開閉ハンドラ
  const toggleNav = useCallback(() => {
    setIsNavOpen((prev) => !prev);
  }, []);

  // ノート追加ハンドラ
  const handleAddNote = useCallback(async (content: string, type: NoteType = 'text') => {
    try {
      await db.notes.add({
        id: '', // Dexie hook will generate UUID
        type,
        content,
        createdAt: new Date(),
        embeddingStatus: 'pending',
        insightStatus: 'pending',
        status: 'active',
      });
      console.log('Note added successfully!');
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  }, []);

  // 現在のビューに基づいてメインコンテンツをレンダリング
  const renderMainContent = () => {
    switch (view) {
      case 'notes':
        return <NotesPage />;
      case 'connections':
        return <ConnectionsPage />;
      case 'archive':
        return <ArchivePage />;
      case 'main':
      default:
        return <MainPage onAddNote={handleAddNote} />;
    }
  };

  return (
    <div className="app-container">
      <React.Suspense fallback={<div>Loading...</div>}>
        <AppHeader
          toggleNav={toggleNav}
          toggleTheme={toggleTheme}
          currentTheme={theme}
        />
        <SideNav
          isOpen={isNavOpen}
          onClose={() => setIsNavOpen(false)}
          onNavigate={handleNavigate}
          currentView={view}
        />
        <main className="main-content">
          {renderMainContent()}
        </main>
      </React.Suspense>
    </div>
  );
}

export default App;
