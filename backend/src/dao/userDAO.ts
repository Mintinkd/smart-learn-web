import type { Env, User, UserInfo } from '../types';

export class UserDAO {
  async insert(db: D1Database, user: Omit<User, 'last_login_at' | 'lock_until' | 'failed_attempts'>): Promise<void> {
    await db.prepare('INSERT INTO users (username, password_hash, salt, role, registered_at, status) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(user.username, user.password_hash, user.salt, user.role, user.registered_at, user.status).run();
  }

  async findByUsername(db: D1Database, username: string): Promise<User | null> {
    const result = await db.prepare('SELECT * FROM users WHERE username = ?').bind(username).first<User>();
    return result ?? null;
  }

  async updatePassword(db: D1Database, username: string, passwordHash: string, salt: string): Promise<void> {
    await db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE username = ?')
      .bind(passwordHash, salt, username).run();
  }

  async updateLoginTime(db: D1Database, username: string): Promise<void> {
    await db.prepare('UPDATE users SET last_login_at = ? WHERE username = ?')
      .bind(new Date().toISOString(), username).run();
  }

  async updateStatus(db: D1Database, username: string, status: string, lockUntil: string | null): Promise<void> {
    const failedAttempts = status === '正常' ? 0 : undefined;
    if (failedAttempts !== undefined) {
      await db.prepare('UPDATE users SET status = ?, lock_until = ?, failed_attempts = ? WHERE username = ?')
        .bind(status, lockUntil, failedAttempts, username).run();
    } else {
      await db.prepare('UPDATE users SET status = ?, lock_until = ? WHERE username = ?')
        .bind(status, lockUntil, username).run();
    }
  }

  async countQuestions(db: D1Database, username: string): Promise<number> {
    const result = await db.prepare('SELECT COUNT(*) as cnt FROM qa_records WHERE username = ?').bind(username).first<{ cnt: number }>();
    return result?.cnt ?? 0;
  }

  async getFailedAttempts(db: D1Database, username: string): Promise<number> {
    const result = await db.prepare('SELECT failed_attempts FROM users WHERE username = ?').bind(username).first<{ failed_attempts: number }>();
    return result?.failed_attempts ?? 0;
  }

  async updateFailedAttempts(db: D1Database, username: string, count: number): Promise<void> {
    await db.prepare('UPDATE users SET failed_attempts = ? WHERE username = ?').bind(count, username).run();
  }

  async getUserInfo(db: D1Database, username: string): Promise<UserInfo | null> {
    const user = await this.findByUsername(db, username);
    if (!user) return null;
    const totalQuestions = await this.countQuestions(db, username);
    return {
      username: user.username,
      role: user.role,
      registered_at: user.registered_at,
      last_login_at: user.last_login_at,
      total_questions: totalQuestions
    };
  }
}