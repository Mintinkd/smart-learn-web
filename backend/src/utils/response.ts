export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T | null;
}

export function success<T>(data: T, message = 'success'): ApiResponse<T> {
  return { code: 0, message, data };
}

export function error(code: number, message: string): ApiResponse<null> {
  return { code, message, data: null };
}

export function paginated<T>(items: T[], total: number, page: number, size: number): ApiResponse<PaginatedResult<T>> {
  return {
    code: 0,
    message: 'success',
    data: { items, total, page, size }
  };
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}