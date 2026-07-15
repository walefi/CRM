import { Module, Global } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SearchSubscriber } from './search.subscriber';
import { PostgresqlSearchProvider } from './providers/postgresql-search.provider';
import { ElasticsearchSearchProvider } from './providers/elasticsearch-search.provider';
import { OpensearchSearchProvider } from './providers/opensearch-search.provider';
import { MeilisearchSearchProvider } from './providers/meilisearch-search.provider';
import { AlgoliaSearchProvider } from './providers/algolia-search.provider';
import { SEARCH_PROVIDER } from './providers/search-provider.interface';

@Global()
@Module({
  controllers: [SearchController],
  providers: [
    SearchService,
    SearchSubscriber,
    PostgresqlSearchProvider,
    ElasticsearchSearchProvider,
    OpensearchSearchProvider,
    MeilisearchSearchProvider,
    AlgoliaSearchProvider,
    {
      provide: SEARCH_PROVIDER,
      useFactory: (
        postgresql: PostgresqlSearchProvider,
        elasticsearch: ElasticsearchSearchProvider,
        opensearch: OpensearchSearchProvider,
        meilisearch: MeilisearchSearchProvider,
        algolia: AlgoliaSearchProvider,
      ) => {
        const provider = process.env.SEARCH_PROVIDER || 'postgresql';
        const providers: Record<string, unknown> = {
          postgresql,
          elasticsearch,
          opensearch,
          meilisearch,
          algolia,
        };
        return providers[provider] || postgresql;
      },
      inject: [
        PostgresqlSearchProvider,
        ElasticsearchSearchProvider,
        OpensearchSearchProvider,
        MeilisearchSearchProvider,
        AlgoliaSearchProvider,
      ],
    },
  ],
  exports: [SearchService, SEARCH_PROVIDER],
})
export class SearchModule {}
