import React, { useCallback, useEffect, useState } from 'react';
import { db, NoteType, Note, Relation } from './db';
import { findConnectionsCloud, embedNote, callAceFlow, getPlaybookNote } from './firebase'; // Import callAceFlow
import { v4 as uuidv4 } from 'uuid'; // Import uuidv4 for thread_id

// 仮のコンポーネント (後で実装)
const AppHeader = React.lazy(() => import('./components/AppHeader'));
const SideNav = React.lazy(() => import('./components/SideNav'));
const NotesPage = React.lazy(() => import('./pages/NotesPage'));
const ConnectionsPage = React.lazy(() => import('./pages/ConnectionsPage'));
const MainPage = React.lazy(() => import('./pages/MainPage'));
const ArchivePage = React.lazy(() => import('./pages/ArchivePage'));

export type View = 'main' | 'notes' | 'connections' | 'archive';
export type Theme = 'light' | 'dark';

interface InsightSuggestion {
  targetNoteId: string;
  reasoning: string;
}

// window.ai の型定義を拡張
declare global {
  interface Window {
    ai?: {
      createTextSession: () => Promise<any>; // 実際には LanguageModel クラスのインスタンスを返す
      LanguageModel?: any; // LanguageModel の存在チェック用
    };
  }
}

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
  const [isAiWorking, setIsAiWorking] = useState(false); // New state for AI working status
  const [aceResponse, setAceResponse] = useState(''); // New state for ACE response
  const [aceThreadId, setAceThreadId] = useState<string>(() => {
    // ローカルストレージからスレッドIDを読み込むか、新規生成
    const savedThreadId = localStorage.getItem('aceThreadId');
    return savedThreadId || uuidv4();
  });
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);


  // ACEスレッドIDをローカルストレージに保存
  useEffect(() => {
    localStorage.setItem('aceThreadId', aceThreadId);
  }, [aceThreadId]);

  // バックグラウンドEmbeddingワーカー
  useEffect(() => {
    const processPendingEmbeddings = async () => {
      // embeddingStatusが'pending'のノートを最大5件取得
      const pendingNotes = await db.notes
        .where('embeddingStatus')
        .equals('pending')
        .limit(5)
        .toArray();

      for (const note of pendingNotes) {
        try {
          // embedNote Cloud Functionを呼び出し
          const embedding = await embedNote(note.type, note.content as string); // contentはstringを想定
          await db.notes.update(note.id, {
            embedding,
            embeddingStatus: 'completed',
          });
          console.log(`Embedding generated for note: ${note.id}`);
        } catch (error) {
          console.error(`Failed to generate embedding for note ${note.id}:`, error);
          await db.notes.update(note.id, { embeddingStatus: 'failed' });
        }
      }
    };

    const intervalId = setInterval(processPendingEmbeddings, 10000); // 10秒ごとに実行

    return () => clearInterval(intervalId); // クリーンアップ
  }, []); // 依存配列は空で、コンポーネントマウント時に一度だけ設定

  // バックグラウンドInsightワーカー
  useEffect(() => {
    const processPendingInsights = async () => {
      if (isAiWorking) return; // AIが既に動作中の場合はスキップ

      // embeddingStatusが'completed'かつinsightStatusが'pending'のノートを最大5件取得
      const pendingNotes = await db.notes
        .where('embeddingStatus')
        .equals('completed')
        .and(note => note.insightStatus === 'pending')
        .limit(5)
        .toArray();

      for (const note of pendingNotes) {
        try {
          // 関連ノートを取得 (自分自身を除く)
          const allOtherNotes = await db.notes.where('id').notEqual(note.id).toArray();
          const suggestions = await getInsightSuggestions(note, allOtherNotes);

          // 提案された繋がりをデータベースに保存
          if (suggestions.length > 0) {
            const relationsToAdd: Relation[] = suggestions.map(s => ({
              id: '', // Dexie hook will generate UUID
              sourceNoteId: note.id,
              targetNoteId: s.targetNoteId,
              reasoning: s.reasoning,
              createdAt: new Date(),
            }));
            await db.relations.bulkAdd(relationsToAdd);
            console.log(`${relationsToAdd.length} relations added for note: ${note.id}`);
          }

          await db.notes.update(note.id, { insightStatus: 'completed' });
        } catch (error) {
          console.error(`Failed to generate insights for note ${note.id}:`, error);
          await db.notes.update(note.id, { insightStatus: 'failed' });
        }
      }
    };

    const intervalId = setInterval(processPendingInsights, 15000); // 15秒ごとに実行

    return () => clearInterval(intervalId); // クリーンアップ
  }, [isAiWorking]); // isAiWorkingを依存配列に追加

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

  // AIによる洞察提案を取得する関数
  const getInsightSuggestions = async (newNote: Note, contextNotes: Note[]): Promise<InsightSuggestion[]> => {
    setIsAiWorking(true);
    try {
      // プロンプトの構築
      const textPrompt = `
        You are an AI assistant that helps find connections between notes.
        Given a new note and a list of existing context notes, identify up to 3 strong connections.
        For each connection, provide the ID of the target note and a concise reasoning.
        Respond only with a JSON array of objects, like this:
        [
          { "targetNoteId": "uuid-of-target-note", "reasoning": "Concise reason for connection." },
          { "targetNoteId": "another-uuid", "reasoning": "Another concise reason." }
        ]

        New Note (ID: ${newNote.id}, Type: ${newNote.type}):
        ${newNote.content}

        Context Notes:
        ${contextNotes.map(note => `ID: ${note.id}, Type: ${note.type}\nContent: ${note.content}`).join('\n---\n')}
      `;

      let suggestions: InsightSuggestion[] = [];

      // 1. オンデバイスAI (window.ai.LanguageModel) を試行
      if (window.ai && window.ai.LanguageModel) {
        try {
          const model = await window.ai.createTextSession();
          const result = await model.prompt(textPrompt);
          suggestions = JSON.parse(result) as InsightSuggestion[];
          console.log('On-device AI suggestions:', suggestions);
        } catch (onDeviceError) {
          console.warn('On-device AI failed, falling back to cloud:', onDeviceError);
          // 2. オンデバイスAIが利用できない、または失敗した場合、クラウドフォールバック
          suggestions = await findConnectionsCloud(
            { id: newNote.id, type: newNote.type, content: newNote.content as string },
            contextNotes.map(n => ({ id: n.id, type: n.type, content: n.content as string }))
          );
          console.log('Cloud AI suggestions:', suggestions);
        }
      } else {
        console.log('On-device AI not available, using cloud fallback.');
        // 2. オンデバイスAIが利用できない場合、クラウドフォールバック
        suggestions = await findConnectionsCloud(
          { id: newNote.id, type: newNote.type, content: newNote.content as string },
          contextNotes.map(n => ({ id: n.id, type: n.type, content: n.content as string }))
        );
        console.log('Cloud AI suggestions:', suggestions);
      }

      // 結果のバリデーション (簡易的)
      if (!Array.isArray(suggestions) || suggestions.some(s => !s.targetNoteId || !s.reasoning)) {
        throw new Error('Invalid AI suggestion format');
      }

      return suggestions;

    } catch (error) {
      console.error('Error getting insight suggestions:', error);
      return [];
    } finally {
      setIsAiWorking(false);
    }
  };

  // ノート追加ハンドラ
  const handleAddNote = useCallback(async (content: string, type: NoteType = 'text') => {
    try {
      const newNoteId = await db.notes.add({
        id: '', // Dexie hook will generate UUID
        type,
        content,
        createdAt: new Date(),
        embeddingStatus: 'pending',
        insightStatus: 'pending',
        status: 'active',
      });
      console.log('Note added successfully! ID:', newNoteId);

      // 新しいノートが追加されたら、洞察提案を取得
      const newNote = await db.notes.get(newNoteId);
      if (newNote) {
        const allOtherNotes = await db.notes.where('id').notEqual(newNote.id).toArray();
        const suggestions = await getInsightSuggestions(newNote, allOtherNotes);

        // 提案された繋がりをデータベースに保存
        if (suggestions.length > 0) {
          const relationsToAdd: Relation[] = suggestions.map(s => ({
            id: '', // Dexie hook will generate UUID
            sourceNoteId: newNote.id,
            targetNoteId: s.targetNoteId,
            reasoning: s.reasoning,
            createdAt: new Date(),
          }));
          await db.relations.bulkAdd(relationsToAdd);
          console.log(`${relationsToAdd.length} relations added.`);
        }
      }

    } catch (error) {
      console.error('Failed to add note or get insights:', error);
    }
  }, [getInsightSuggestions]); // getInsightSuggestionsを依存配列に追加

  // ACEエージェントを呼び出す関数
  const handleCallAceFlow = useCallback(async (query: string) => {
    setIsAiWorking(true); // ACEもAI処理なのでフラグを共有
    setAceResponse(''); // 以前の応答をクリア
    try {
      const result = await callAceFlow(aceThreadId, query);
      setAceResponse(result.response);
      console.log('ACE Flow Result:', result);
    } catch (error) {
      console.error('Failed to call ACE Flow:', error);
      setAceResponse('Error: Could not get response from ACE Agent.');
    }
    finally {
      setIsAiWorking(false);
    }
  }, [aceThreadId]);

  // ACEの応答をクリックしたときの処理
  const handleAceResponseClick = useCallback(async () => {
    const match = aceResponse.match(/Ref: ([a-zA-Z0-9-]+)/);
    if (match && match[1]) {
      const noteId = match[1];
      const note = await db.notes.get(noteId);
      if (note) {
        setSelectedNote(note);
        setShowNoteModal(true);
      } else {
        console.warn(`Note with ID ${noteId} not found.`);
      }
    }
  }, [aceResponse]);


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
        return (
          <MainPage
            onAddNote={handleAddNote}
            onCallAceFlow={handleCallAceFlow}
            aceResponse={aceResponse}
            isAceWorking={isAiWorking}
            onAceResponseClick={handleAceResponseClick}
          />
        );
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

      {showNoteModal && selectedNote && (
        <div className="modal-backdrop" onClick={() => setShowNoteModal(false)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3>Note Detail</h3>
            <pre>{selectedNote.content}</pre>
            <button onClick={() => setShowNoteModal(false)} className="close-button">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
