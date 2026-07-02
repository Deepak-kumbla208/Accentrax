/** Standard list/response envelope used across the REST API. */

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiItemResponse<T> {
  data: T;
}

/** RFC7807-style problem detail for errors. */
export interface ApiProblem {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
}

export interface ListQuery {
  page?: number;
  limit?: number;
  sort?: string;
  q?: string;
}

export interface HealthResponse {
  status: 'ok' | 'error';
  info?: Record<string, { status: 'up' | 'down' }>;
  uptime: number;
  timestamp: string;
}
