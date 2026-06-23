import type { QARecord } from '../types';

export class QARecordDAO {
  async insert(db: D1Database, record: Omit<QARecord, never>): Promise<string> {
    await db.prepare('INSERT INTO qa_records (record_id, username, session_id, question, answer, created_at, api_status, api_provider) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(record.record_id, record.username, record.session_id, record.question, record.answer, record.created_at, record.api_status, record.api_provider).run();
    return record.record_id;
  }

  async findById(db: D1Database, recordId: string): Promise<QARecord | null> {
    const result = await db.prepare('SELECT * FROM qa_records WHERE record_id = ?').bind(recordId).first<QARecord>();
    return result ?? null;
  }

  async findByUser(db: D1Database, username: string, offset: number, limit: number): Promise<{ items: QARecord[]; total: number }> {
    const countResult = await db.prepare('SELECT COUNT(*) as cnt FROM qa_records WHERE username = ?').bind(username).first<{ cnt: number }>();
    const total = countResult?.cnt ?? 0;
    const result = await db.prepare('SELECT * FROM qa_records WHERE username = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .bind(username, limit, offset).all<QARecord>();
    return { items: result.results, total };
  }

  async findBySession(db: D1Database, sessionId: string): Promise<QARecord[]> {
    const result = await db.prepare('SELECT * FROM qa_records WHERE session_id = ? ORDER BY created_at ASC').bind(sessionId).all<QARecord>();
    return result.results;
  }

  async searchByKeyword(db: D1Database, username: string, keyword: string): Promise<QARecord[]> {
    const pattern = `%${keyword}%`;
    const result = await db.prepare('SELECT * FROM qa_records WHERE username = ? AND (question LIKE ? COLLATE NOCASE OR answer LIKE ? COLLATE NOCASE) ORDER BY created_at DESC')
      .bind(username, pattern, pattern).all<QARecord>();
    return result.results;
  }

  async deleteByIds(db: D1Database, recordIds: string[]): Promise<void> {
    if (recordIds.length === 0) return;
    const stmts = recordIds.map(id => db.prepare('DELETE FROM qa_records WHERE record_id = ?').bind(id));
    await db.batch(stmts);
  }
}