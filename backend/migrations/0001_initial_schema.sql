CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '普通用户',
  registered_at TEXT NOT NULL,
  last_login_at TEXT,
  status TEXT NOT NULL DEFAULT '正常',
  lock_until TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT '进行中',
  FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS qa_records (
  record_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  session_id TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TEXT NOT NULL,
  api_status TEXT NOT NULL DEFAULT '成功',
  api_provider TEXT NOT NULL DEFAULT '智谱AI',
  FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tags (
  tag_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(name, username),
  FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS record_tags (
  record_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (record_id, tag_id),
  FOREIGN KEY (record_id) REFERENCES qa_records(record_id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(tag_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS knowledge_entries (
  entry_id TEXT PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT DEFAULT '',
  is_builtin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_tags (
  entry_id TEXT NOT NULL,
  tag_name TEXT NOT NULL,
  PRIMARY KEY (entry_id, tag_name),
  FOREIGN KEY (entry_id) REFERENCES knowledge_entries(entry_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS api_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  provider TEXT NOT NULL DEFAULT '智谱AI',
  api_key_encrypted TEXT NOT NULL DEFAULT '',
  api_key_iv TEXT NOT NULL DEFAULT '',
  is_verified INTEGER NOT NULL DEFAULT 0,
  last_verified TEXT
);

CREATE INDEX IF NOT EXISTS idx_qa_records_username ON qa_records(username);
CREATE INDEX IF NOT EXISTS idx_qa_records_session ON qa_records(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_username ON sessions(username);
CREATE INDEX IF NOT EXISTS idx_tags_username ON tags(username);
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_entries(category);


INSERT OR IGNORE INTO api_config (id, provider, api_key_encrypted, api_key_iv)
VALUES (1, '智谱AI', '', '');

INSERT OR IGNORE INTO knowledge_entries (entry_id, title, content, category, tags, is_builtin, created_at, updated_at, created_by)
VALUES
  ('builtin-001', 'Python基础-变量与数据类型', 'Python中常见的数据类型包括int、float、str、list、dict等。变量无需声明类型，使用赋值语句即可创建。', 'Python基础', 'Python,变量,数据类型', 1, datetime('now'), datetime('now'), 'system'),
  ('builtin-002', 'Python基础-函数定义', '使用def关键字定义函数，支持默认参数、可变参数和关键字参数。函数是一等公民，可以作为参数传递。', 'Python基础', 'Python,函数,def', 1, datetime('now'), datetime('now'), 'system'),
  ('builtin-003', '常见报错-IndexError', 'IndexError表示索引超出范围，通常发生在访问列表、元组等序列类型时使用了不存在的索引位置。', '常见报错', 'IndexError,报错,索引', 1, datetime('now'), datetime('now'), 'system');