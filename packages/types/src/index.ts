export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys];

export type ApiVersion = 'v1' | 'v2';

export type SortDirection = 'asc' | 'desc';

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDirection?: SortDirection;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose';

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  trace?: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export type EntityStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ARCHIVED';
