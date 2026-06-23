import type { Session } from '../types';

export class SessionDAO {
  async insert(db: D1Database, session: Omit<Session, never>): Promise<string> {
    await db.prepare('INSERT INTO sessions (session_id, username, title, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(session.session_id, session.username, session.title, session.created_at, session.updated_at, session.status).run();
    return session.session_id;
  }

  async findById(db: D1Database, sessionId: string): Promise<Session | null> {
    const result = await db.prepare('SELECT * FROM sessions WHERE session_id = ?').bind(sessionId).first<Session>();
    return result ?? null;
  }

  async findByUser(db: D1Database, username: string): Promise<Session[]> {
    const result = await db.prepare('SELECT * FROM sessions WHERE username = ? ORDER BY updated_at DESC').bind(username).all<Session>();
    return result.results;
  }

  async updateTitle(db: D1Database, sessionId: string, title: string): Promise<void> {
    await db.prepare('UPDATE sessions SET title = ?, updated_at = ? WHERE session_id = ?')
      .bind(title, new Date().toISOString(), sessionId).run();
  }

  async updateStatus(db: D1Database, sessionId: string, status: string): Promise<void> {
    await db.prepare('UPDATE sessions SET status = ?, updated_at = ? WHERE session_id = ?')
      .bind(status, new Date().toISOString(), sessionId).run();
  }

  async deleteById(db: D1Database, sessionId: string): Promise<void> {
    await db.prepare('DELETE FROM sessions WHERE session_id = ?').bind(sessionId).run();
  }
}