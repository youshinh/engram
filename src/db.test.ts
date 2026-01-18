import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Dexie from 'dexie';
import { EngramDB, Note, Relation } from './db';
import { v4 as uuidv4 } from 'uuid';

describe('Dexie Database CRUD Operations', () => {
  let testDb: EngramDB;
  const dbName = `test-engram-db-${uuidv4()}`;

  beforeEach(async () => {
    testDb = new EngramDB(dbName);
    await testDb.open();
  });

  afterEach(async () => {
    await testDb.close();
    await Dexie.delete(dbName);
  });

  it('should create, read, update, and delete a note', async () => {
    const newNote: Omit<Note, 'id'> = {
      type: 'text',
      content: 'This is a test note.',
      createdAt: new Date(),
      embeddingStatus: 'pending',
      insightStatus: 'pending',
      status: 'active',
      isPinned: false,
      tags: [],
    };
    const id = await testDb.notes.add(newNote as Note);
    expect(id).toBeDefined();

    const addedNote = await testDb.notes.get(id);
    expect(addedNote).toBeDefined();
    expect(addedNote?.content).toBe('This is a test note.');

    await testDb.notes.update(id, { content: 'Updated test note.' });
    const updatedNote = await testDb.notes.get(id);
    expect(updatedNote?.content).toBe('Updated test note.');

    await testDb.notes.delete(id);
    const deletedNote = await testDb.notes.get(id);
    expect(deletedNote).toBeUndefined();
  });

  it('should create, read, and delete a relation', async () => {
    const note1Id = await testDb.notes.add({ id: uuidv4(), type: 'text', content: 'Note 1', createdAt: new Date(), embeddingStatus: 'completed', insightStatus: 'completed', status: 'active', isPinned: false, tags: [] });
    const note2Id = await testDb.notes.add({ id: uuidv4(), type: 'text', content: 'Note 2', createdAt: new Date(), embeddingStatus: 'completed', insightStatus: 'completed', status: 'active', isPinned: false, tags: [] });

    const newRelation: Omit<Relation, 'id'> = {
      sourceId: note1Id,
      targetId: note2Id,
      reasoning: 'Connection between Note 1 and Note 2',
      source: 'ai_suggestion',
      feedback: 'pending',
      createdAt: new Date(),
    };
    const id = await testDb.relations.add(newRelation as Relation);
    expect(id).toBeDefined();

    const addedRelation = await testDb.relations.get(id);
    expect(addedRelation).toBeDefined();
    expect(addedRelation?.reasoning).toBe('Connection between Note 1 and Note 2');

    await testDb.relations.delete(id);
    const deletedRelation = await testDb.relations.get(id);
    expect(deletedRelation).toBeUndefined();
  });
});