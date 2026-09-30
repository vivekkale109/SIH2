export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  requestId: string;
  timestamp: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  data: T;
  requestId: string;
  timestamp: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface HealthCheckResult {
  status: 'ok' | 'error' | 'shutting_down';
  timestamp: string;
  version: string;
  uptime: number;
  services: {
    database: { status: 'up' | 'down'; latencyMs?: number };
    redis?: { status: 'up' | 'down'; latencyMs?: number };
    storage?: { status: 'up' | 'down'; latencyMs?: number };
    clamav?: { status: 'up' | 'down'; latencyMs?: number };
  };
}
