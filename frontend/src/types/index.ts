export interface UserInfo {
  username: string;
  role: string;
  registered_at: string;
  last_login_at: string | null;
  total_questions: number;
}

export interface Session {
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  status: string;
}

export interface QARecord {
  record_id: string;
  username: string;
  session_id: string;
  question: string;
  answer: string;
  created_at: string;
  api_status: string;
  api_provider: string;
}

export interface Tag {
  tag_id: string;
  name: string;
  username: string;
  created_at: string;
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

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T | null;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface SSEEventData {
  token: { content: string };
  done: { record_id: string };
  error: { message: string };
}