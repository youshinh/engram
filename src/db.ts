import Dexie, { Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';

// ----------------------------------------------------------------------------
// 1. エンティティ定義
// ----------------------------------------------------------------------------

/**
 * ノートのタイプ
 * - 'text': テキストノート
 * - 'image': 画像ノート (Base64またはURL)
 * - 'audio': 音声ノート (Base64またはURL)
 * - 'url': URLノート (contentはURL文字列)
 * - 'project': プロジェクトノート (contentはプロジェクト概要など)
 * - 'task': タスクノート (contentはタスク名など)
 * - 'workshop': マルチモーダルなワークショップノート (contentはJSON文字列)
 */
export type NoteType = 'text' | 'image' | 'audio' | 'url' | 'project' | 'task' | 'workshop';

/**
 * ノートのEmbedding処理ステータス
 */
export type EmbeddingStatus = 'pending' | 'completed' | 'failed';

/**
 * ノートのInsight処理ステータス
 */
export type InsightStatus = 'pending' | 'completed' | 'failed';

/**
 * ノートエンティティ
 */
export interface Note {
  id: string;
  type: NoteType;
  content: string | object; // タイプによって異なる (例: textはstring, workshopはobject)
  createdAt: Date;
  embeddingStatus: EmbeddingStatus;
  insightStatus: InsightStatus;
  embedding?: number[]; // Multimodal Embeddingベクトル

  // 複合機能からの追加フィールド
  projectId?: string; // 関連するプロジェクトノートのID
  location?: string; // 位置情報 (例: "Tokyo, Japan")
  tags?: string[]; // タグ
  isPinned?: boolean; // ピン留めされているか
  status?: 'active' | 'archived'; // ノートの状態
  isCompleted?: boolean; // タスクノートの場合、完了しているか
}

/**
 * 繋がりエンティティ (Relation)
 */
export interface Relation {
  id: string;
  sourceNoteId: string; // 繋がりの起点となるノートのID
  targetNoteId: string; // 繋がりの終点となるノートのID
  reasoning: string; // なぜ繋がっているかの理由 (AIが生成)
  createdAt: Date;

  // ユーザーフィードバック
  feedback?: 'useful' | 'harmful';
  userCorrectedReasoning?: string; // ユーザーが修正した理由
}

// ----------------------------------------------------------------------------
// 2. データベース定義
// ----------------------------------------------------------------------------

export class EngramDB extends Dexie {
  // 'notes' と 'relations' は Dexie の Table 型
  notes!: Table<Note, string>;
  relations!: Table<Relation, string>;

  constructor() {
    super('EngramDB');
    this.version(5).stores({
      notes: '++id, createdAt, embeddingStatus, insightStatus, projectId, *tags, status',
      relations: '++id, sourceNoteId, targetNoteId, createdAt',
    });

    // マイグレーション (バージョンアップ時のスキーマ変更に対応)
    this.version(1).upgrade(async () => {
      // 初期バージョンなので特に処理なし
    });

    this.version(2).upgrade(async () => {
      // Note に embeddingStatus, insightStatus を追加
      await this.notes.toCollection().modify(note => {
        note.embeddingStatus = 'pending';
        note.insightStatus = 'pending';
      });
    });

    this.version(3).upgrade(async () => {
      // Note に projectId, location, tags, isPinned, status, isCompleted を追加
      await this.notes.toCollection().modify(note => {
        note.projectId = undefined;
        note.location = undefined;
        note.tags = [];
        note.isPinned = false;
        note.status = 'active';
        note.isCompleted = false;
      });
    });

    this.version(4).upgrade(async () => {
      // Relation に feedback, userCorrectedReasoning を追加
      await this.relations.toCollection().modify(relation => {
        relation.feedback = undefined;
        relation.userCorrectedReasoning = undefined;
      });
    });

    this.version(5).upgrade(async () => {
      // Note の content を string | object に変更 (workshopノート対応)
      // 既存のstring contentはそのまま、新しいworkshopノートはobjectとして保存される
    });


    // ----------------------------------------------------------------------------
    // 3. フック (Hooks)
    // ----------------------------------------------------------------------------

    // ノートが作成される前にIDと作成日時を設定するフック
    this.notes.hook('creating', (primKey, obj, trans) => {
      if (!obj.id) obj.id = uuidv4();
      if (!obj.createdAt) obj.createdAt = new Date();
      if (!obj.embeddingStatus) obj.embeddingStatus = 'pending';
      if (!obj.insightStatus) obj.insightStatus = 'pending';
      if (!obj.status) obj.status = 'active';
    });

    // 繋がりが作成される前にIDと作成日時を設定するフック
    this.relations.hook('creating', (primKey, obj, trans) => {
      if (!obj.id) obj.id = uuidv4();
      if (!obj.createdAt) obj.createdAt = new Date();
    });
  }

  // ----------------------------------------------------------------------------
  // 4. ヘルパーメソッド
  // ----------------------------------------------------------------------------

  /**
   * 指定されたステータスのノートをページネーションして取得する
   * @param offset 取得開始位置
   * @param limit 取得件数
   * @param status ノートのステータス ('active' または 'archived')
   * @returns ノートの配列
   */
  async getPaginatedNotes(offset: number, limit: number, status: 'active' | 'archived' = 'active'): Promise<Note[]> {
    return this.notes
      .where('status')
      .equals(status)
      .reverse() // 最新のノートから取得
      .sortBy('createdAt')
      .then(sortedNotes => sortedNotes.slice(offset, offset + limit));
  }

  /**
   * 指定されたIDのノートを削除する
   * @param id 削除するノートのID
   */
  async deleteNote(id: string): Promise<void> {
    await this.notes.delete(id);
    // 関連する繋がりも削除
    await this.relations.where('sourceNoteId').equals(id).delete();
    await this.relations.where('targetNoteId').equals(id).delete();
  }

  /**
   * 指定されたIDの繋がりを削除する
   * @param id 削除する繋がりのID
   */
  async deleteRelation(id: string): Promise<void> {
    await this.relations.delete(id);
  }

  /**
   * 指定されたIDのノートをアーカイブする
   * @param id アーカイブするノートのID
   */
  async archiveNote(id: string): Promise<void> {
    await this.notes.update(id, { status: 'archived' });
  }
}

export const db = new EngramDB();
