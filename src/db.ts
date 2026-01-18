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
export type NoteStatus = 'active' | 'archived';

export interface WorkshopContent {
  text: string;
  sketchDataUrl?: string;
  imageIds?: string;
  modelIds?: string;
  audioId?: string;
}

export interface Note {
  id: string;
  type: NoteType;
  content: string | Blob;
  generatedCaption?: string; // For AI-generated captions of images
  createdAt: Date;
  embedding?: number[];
  embeddingStatus: 'pending' | 'completed' | 'failed';
  insightStatus: 'pending' | 'completed' | 'failed';
  projectId?: string | null;
  location?: string | null;
  status: NoteStatus;
  isPinned: boolean;
  tags?: string[];
  isCompleted?: boolean;
  summary?: string;
}

export type RelationSource = 'ai_suggestion' | 'user_manual';
export type RelationFeedback = 'useful' | 'harmful' | 'pending';

export interface Relation {
  id: string;
  sourceId: string;
  targetId: string;
  source: RelationSource;
  reasoning?: string;
  feedback: RelationFeedback;
  createdAt: Date;
  strength?: number;
  userCorrectedReasoning?: string;
}

// ----------------------------------------------------------------------------
// 2. データベース定義
// ----------------------------------------------------------------------------

export class EngramDB extends Dexie {
  // 'notes' と 'relations' は Dexie の Table 型
  notes!: Table<Note, string>;
  relations!: Table<Relation, string>;

  constructor(databaseName: string = 'EngramDB') {
    super(databaseName);
    this.version(5).stores({
      notes: `
        id,
        type,
        createdAt,
        embeddingStatus,
        insightStatus,
        projectId,
        status,
        isPinned,
        location,
        *tags
      `,
      relations: `
        id,
        sourceId,
        targetId,
        [sourceId+targetId],
        source,
        feedback,
        createdAt
      `
    }).upgrade(async (tx) => {
      // version(4)からのマイグレーションロジック
      await tx.table('notes').toCollection().modify(note => {
        note.projectId = note.projectId === undefined ? null : note.projectId;
        note.location = note.location === undefined ? null : note.location;
        note.status = note.status === undefined ? 'active' : note.status;
        note.isPinned = note.isPinned === undefined ? false : note.isPinned;
        note.tags = note.tags === undefined ? [] : note.tags; // Initialize tags as empty array
        note.isCompleted = note.isCompleted === undefined ? undefined : note.isCompleted;
        note.summary = note.summary === undefined ? undefined : note.summary;
        if (note.embedding !== undefined && typeof note.embedding === 'number') {
          note.embedding = [note.embedding]; // Convert single number to array for backward compatibility
        }
      });
      return tx.table('relations').toCollection().modify(relation => {
        relation.strength = relation.strength === undefined ? undefined : relation.strength;
        relation.userCorrectedReasoning = relation.userCorrectedReasoning === undefined ? undefined : relation.userCorrectedReasoning;
      });
    });


    // ----------------------------------------------------------------------------
    // 3. フック (Hooks)
    // ----------------------------------------------------------------------------

    this.notes.hook('creating', (primKey, obj: Note) => {
      if (obj.id === undefined) obj.id = uuidv4();
      if (obj.createdAt === undefined) obj.createdAt = new Date();
      if (obj.status === undefined) obj.status = 'active';
      if (obj.isPinned === undefined) obj.isPinned = false;
      if (obj.embeddingStatus === undefined) obj.embeddingStatus = 'pending';
      if (obj.insightStatus === undefined) obj.insightStatus = 'pending';
      if (obj.tags === undefined) obj.tags = []; // Initialize tags as empty array
    });

    this.relations.hook('creating', (primKey, obj: Relation) => {
      if (obj.id === undefined) obj.id = uuidv4();
      if (obj.createdAt === undefined) obj.createdAt = new Date();
      if (obj.feedback === undefined) obj.feedback = 'pending';
    });
  }

  // 3. ヘルパーメソッド
  async getPaginatedNotes(offset: number, limit: number, status: NoteStatus = 'active', projectId?: string): Promise<Note[]> {
    const query = this.notes.orderBy('createdAt').reverse();
    const filtered = query.filter(note => {
      let match = note.status === status;
      if (projectId) {
        match = match && note.projectId === projectId;
      }
      return match;
    });
    return filtered.offset(offset).limit(limit).toArray();
  }

  async countNotes(status: NoteStatus = 'active', projectId?: string): Promise<number> {
    let query = this.notes.where('status').equals(status);
    if (projectId) {
      query = query.and(note => note.projectId === projectId);
    }
    return query.count();
  }

  async getPaginatedRelations(offset: number, limit: number): Promise<Relation[]> {
    return this.relations.orderBy('createdAt').reverse().offset(offset).limit(limit).toArray();
  }

  async countRelationsForNote(noteId: string): Promise<number> {
    return this.relations.where('sourceId').equals(noteId).or('targetId').equals(noteId).count();
  }

  async deleteRelation(id: string): Promise<void> {
    await this.relations.delete(id);
  }

  async updateRelationFeedback(id: string, feedback: RelationFeedback, userCorrectedReasoning?: string): Promise<void> {
    const updateData: Partial<Relation> = { feedback };
    if (userCorrectedReasoning !== undefined) {
      updateData.userCorrectedReasoning = userCorrectedReasoning;
    }
    await this.relations.update(id, updateData);
  }

  async updateNoteStatus(id: string, status: NoteStatus): Promise<void> {
    await this.notes.update(id, { status });
  }

  async updateNotePinnedStatus(id: string, isPinned: boolean): Promise<void> {
    await this.notes.update(id, { isPinned });
  }

  async updateTaskCompletion(id: string, isCompleted: boolean): Promise<void> {
    await this.notes.update(id, { isCompleted });
  }
};

export const db = new EngramDB();
