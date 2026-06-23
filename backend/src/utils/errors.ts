export class AppError extends Error {
  statusCode: number;
  code: string;
  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'AppError';
  }
}

export class AuthError extends AppError {
  constructor(code: string, message: string) {
    super(400, code, message);
    this.name = 'AuthError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = '未授权，请先登录') {
    super(401, 'UNAUTHORIZED', message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = '权限不足') {
    super(403, 'FORBIDDEN', message);
    this.name = 'ForbiddenError';
  }
}

export class ChatError extends AppError {
  constructor(code: string, message: string) {
    super(400, code, message);
    this.name = 'ChatError';
  }
}

export class HistoryError extends AppError {
  constructor(code: string, message: string) {
    super(404, code, message);
    this.name = 'HistoryError';
  }
}

export class KnowledgeError extends AppError {
  constructor(code: string, message: string) {
    super(400, code, message);
    this.name = 'KnowledgeError';
  }
}

export class SystemError extends AppError {
  constructor(message: string) {
    super(500, 'SYS_001', message);
    this.name = 'SystemError';
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super(429, 'RATE_LIMITED', `请求过于频繁，请${retryAfter}秒后重试`);
    this.name = 'RateLimitError';
  }
}