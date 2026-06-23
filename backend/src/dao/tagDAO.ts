import type { Tag } from '../types';

export class TagDAO {
  async insert(db: D1Database, tag: Omit<Tag, never>): Promise<string> {
    await db.prepare('INSERT INTO tags (tag_id, name, username, created_at) VALUES (?, ?, ?, ?)')
      .bind(tag.tag_id, tag.name, tag.username, tag.created_at).run();
    return tag.tag_id;
  }

  async findByUser(db: D1Database, username: string): Promise<Tag[]> {
    const result = await db.prepare('SELECT * FROM tags WHERE username = ? ORDER BY name').bind(username).all<Tag>();
    return result.results;
  }

  async findByName(db: D1Database, username: string, name: string): Promise<Tag | null> {
    const result = await db.prepare('SELECT * FROM tags WHERE username = ? AND name = ?').bind(username, name).first<Tag>();
    return result ?? null;
  }

  async addRecordTag(db: D1Database, recordId: string, tagId: string): Promise<void> {
    await db.prepare('INSERT OR IGNORE INTO record_tags (record_id, tag_id) VALUES (?, ?)').bind(recordId, tagId).run();
  }

  async removeRecordTag(db: D1Database, recordId: string, tagId: string): Promise<void> {
    await db.prepare('DELETE FROM record_tags WHERE record_id = ? AND tag_id = ?').bind(recordId, tagId).run();
  }

  async findRecordsByTag(db: D1Database, tagId: string): Promise<string[]> {
    const result = await db.prepare('SELECT record_id FROM record_tags WHERE tag_id = ?').bind(tagId).all<{ record_id: string }>();
    return result.results.map(r => r.record_id);
  }
}