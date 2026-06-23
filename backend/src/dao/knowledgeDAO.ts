import type { KnowledgeEntry } from '../types';

export class KnowledgeDAO {
  async insert(db: D1Database, entry: Omit<KnowledgeEntry, never>): Promise<string> {
    await db.prepare('INSERT INTO knowledge_entries (entry_id, title, content, category, tags, is_builtin, created_at, updated_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(entry.entry_id, entry.title, entry.content, entry.category, entry.tags, entry.is_builtin, entry.created_at, entry.updated_at, entry.created_by).run();
    if (entry.tags) {
      const tagNames = entry.tags.split(',').map(t => t.trim()).filter(Boolean);
      for (const tagName of tagNames) {
        await db.prepare('INSERT OR IGNORE INTO knowledge_tags (entry_id, tag_name) VALUES (?, ?)').bind(entry.entry_id, tagName).run();
      }
    }
    return entry.entry_id;
  }

  async findById(db: D1Database, entryId: string): Promise<KnowledgeEntry | null> {
    const result = await db.prepare('SELECT * FROM knowledge_entries WHERE entry_id = ?').bind(entryId).first<KnowledgeEntry>();
    return result ?? null;
  }

  async findAll(db: D1Database, keyword?: string, category?: string): Promise<KnowledgeEntry[]> {
    let query = 'SELECT * FROM knowledge_entries WHERE 1=1';
    const params: unknown[] = [];
    if (keyword) {
      query += ' AND (title LIKE ? COLLATE NOCASE OR content LIKE ? COLLATE NOCASE OR tags LIKE ? COLLATE NOCASE)';
      const pattern = `%${keyword}%`;
      params.push(pattern, pattern, pattern);
    }
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    query += ' ORDER BY updated_at DESC';
    const result = await db.prepare(query).bind(...params).all<KnowledgeEntry>();
    return result.results;
  }

  async update(db: D1Database, entryId: string, updates: Partial<Pick<KnowledgeEntry, 'title' | 'content' | 'category' | 'tags'>>): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [];
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        sets.push(`${key} = ?`);
        params.push(value);
      }
    }
    sets.push("updated_at = datetime('now')");
    params.push(entryId);
    await db.prepare(`UPDATE knowledge_entries SET ${sets.join(', ')} WHERE entry_id = ?`).bind(...params).run();
    if (updates.tags !== undefined) {
      await db.prepare('DELETE FROM knowledge_tags WHERE entry_id = ?').bind(entryId).run();
      const tagNames = updates.tags.split(',').map(t => t.trim()).filter(Boolean);
      for (const tagName of tagNames) {
        await db.prepare('INSERT OR IGNORE INTO knowledge_tags (entry_id, tag_name) VALUES (?, ?)').bind(entryId, tagName).run();
      }
    }
  }

  async deleteById(db: D1Database, entryId: string): Promise<void> {
    await db.prepare('DELETE FROM knowledge_entries WHERE entry_id = ?').bind(entryId).run();
  }

  async searchByKeywords(db: D1Database, keywords: string[]): Promise<KnowledgeEntry[]> {
    if (keywords.length === 0) return [];
    const conditions = keywords.map(() => '(title LIKE ? COLLATE NOCASE OR content LIKE ? COLLATE NOCASE OR tags LIKE ? COLLATE NOCASE)').join(' OR ');
    const params = keywords.flatMap(kw => [`%${kw}%`, `%${kw}%`, `%${kw}%`]);
    const result = await db.prepare(`SELECT * FROM knowledge_entries WHERE ${conditions} ORDER BY updated_at DESC`).bind(...params).all<KnowledgeEntry>();
    return result.results;
  }
}