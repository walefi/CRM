export interface SearchResult {
  id: string;
  entityType: string;
  entityId: string;
  title: string;
  subtitle?: string;
  contentPreview?: string;
  tags: string[];
  url?: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface SearchQuery {
  q?: string;
  entityTypes?: string[];
  tags?: string[];
  status?: string;
  ownerId?: string;
  teamId?: string;
  pipelineId?: string;
  minValue?: number;
  maxValue?: number;
  dateFrom?: string;
  dateTo?: string;
  customFields?: Record<string, unknown>;
  favorites?: boolean;
  archived?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResponse {
  data: SearchResult[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    durationMs?: number;
    suggestions?: string[];
  };
}

export interface IndexDocumentInput {
  entityType: string;
  entityId: string;
  title: string;
  subtitle?: string;
  content: string;
  tags: string[];
  metadata?: Record<string, unknown>;
  url?: string;
}

export const SEARCH_PROVIDER = 'SEARCH_PROVIDER';

export interface ISearchProvider {
  search(tenantId: string, query: SearchQuery): Promise<SearchResponse>;
  suggest(tenantId: string, query: string, limit?: number): Promise<string[]>;
  index(tenantId: string, doc: IndexDocumentInput): Promise<void>;
  bulkIndex(tenantId: string, docs: IndexDocumentInput[]): Promise<void>;
  remove(tenantId: string, entityType: string, entityId: string): Promise<void>;
  reindex(tenantId: string, entityType?: string): Promise<{ indexed: number }>;
  clearIndex(tenantId: string, entityType?: string): Promise<void>;
  healthCheck(): Promise<{ status: string; provider: string; indexedCount?: number }>;
}
