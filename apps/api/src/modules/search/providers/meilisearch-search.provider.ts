import { Injectable, Logger } from '@nestjs/common';
import {
  ISearchProvider,
  SearchQuery,
  SearchResponse,
  IndexDocumentInput,
} from './search-provider.interface';

@Injectable()
export class MeilisearchSearchProvider implements ISearchProvider {
  private readonly logger = new Logger(MeilisearchSearchProvider.name);

  async search(_tenantId: string, query: SearchQuery): Promise<SearchResponse> {
    this.logger.warn('Meilisearch provider not configured');
    return {
      data: [],
      meta: {
        total: 0,
        page: query.page || 1,
        limit: query.limit || 20,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  }

  async suggest(_tenantId: string, _query: string, _limit?: number): Promise<string[]> {
    return [];
  }
  async index(_tenantId: string, _doc: IndexDocumentInput): Promise<void> {}
  async bulkIndex(_tenantId: string, _docs: IndexDocumentInput[]): Promise<void> {}
  async remove(_tenantId: string, _entityType: string, _entityId: string): Promise<void> {}
  async reindex(_tenantId: string, _entityType?: string): Promise<{ indexed: number }> {
    return { indexed: 0 };
  }
  async clearIndex(_tenantId: string, _entityType?: string): Promise<void> {}
  async healthCheck(): Promise<{ status: string; provider: string }> {
    return { status: 'not_configured', provider: 'meilisearch' };
  }
}
