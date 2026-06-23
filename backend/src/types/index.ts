export interface Env {
  DB: D1Database;
  RATE_LIMIT_KV: KVNamespace;
  JWT_SECRET_KEY: string;
  ENCRYPTION_KEY: string;
  CORS_ORIGINS: string;
  ADMIN_INITIAL_PASSWORD: string;
}

export interface User {
  username: string;
  password_hash: string;
  salt: string;
  role: '普通用户' | '管理员';
  registered_at: string;
  last_login_at: string | null;
  status: '正常' | '锁定';
  lock_until: string | null;
}

export interface Session {
  session_id: string;
  username: string;
  title: string;
  created_at: string;
  updated_at: string;
  status: '进行中' | '已结束';
}

export interface QARecord {
  record_id: string;
  username: string;
  session_id: string;
  question: string;
  answer: string;
  created_at: string;
  api_status: '成功' | '超时' | '失败';
  api_provider: '智谱AI' | '百度UNIT';
}

export interface Tag {
  tag_id: string;
  name: string;
  username: string;
  created_at: string;
}

export interface RecordTag {
  record_id: string;
  tag_id: string;
}

export interface KnowledgeEntry {
  entry_id: string;
  title: string;
  content: string;
  category: string;
  tags: string;
  is_builtin: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface APIConfig {
  provider: '智谱AI' | '百度UNIT';
  api_key_encrypted: string;
  api_key_iv: string;
  is_verified: number;
  last_verified: string | null;
}

export interface UserInfo {
  username: string;
  role: string;
  registered_at: string;
  last_login_at: string | null;
  total_questions: number;
}

export interface JWTPayload {
  username: string;
  role: string;
  exp: number;
  iat: number;
  type: 'access' | 'refresh';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface SSEMessage {
  event: 'token' | 'done' | 'error';
  data: string;
  id?: string;
}