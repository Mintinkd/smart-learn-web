import type { APIConfig } from '../types';
import { encryptApiKey, decryptApiKey } from '../utils/cryptoAdapter';

export class APIConfigDAO {
  async save(db: D1Database, config: Omit<APIConfig, 'last_verified'>, encryptionKey: string): Promise<void> {
    let encrypted = '';
    let iv = '';
    if (config.api_key_encrypted) {
      const result = await encryptApiKey(config.api_key_encrypted, encryptionKey);
      encrypted = result.encrypted;
      iv = result.iv;
    }
    await db.prepare('UPDATE api_config SET provider = ?, api_key_encrypted = ?, api_key_iv = ?, is_verified = ? WHERE id = 1')
      .bind(config.provider, encrypted, iv, config.is_verified).run();
  }

  async load(db: D1Database, encryptionKey: string): Promise<APIConfig | null> {
    const result = await db.prepare('SELECT * FROM api_config WHERE id = 1').first<APIConfig>();
    if (!result) return null;
    if (result.api_key_encrypted && result.api_key_iv) {
      try {
        const decrypted = await decryptApiKey(result.api_key_encrypted, result.api_key_iv, encryptionKey);
        result.api_key_encrypted = decrypted;
      } catch { /* keep encrypted value */ }
    }
    return result;
  }

  async updateVerification(db: D1Database, isVerified: number): Promise<void> {
    await db.prepare("UPDATE api_config SET is_verified = ?, last_verified = datetime('now') WHERE id = 1")
      .bind(isVerified).run();
  }
}