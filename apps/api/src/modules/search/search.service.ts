import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventBusService } from '../../infrastructure/event-bus/event-bus.service';
import { BaseDomainEvent } from '../../infrastructure/event-bus/domain-events';
import {
  ISearchProvider,
  SearchQuery,
  IndexDocumentInput,
} from './providers/search-provider.interface';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly searchProvider: ISearchProvider,
  ) {}

  async search(tenantId: string, query: SearchQuery, userId?: string) {
    const result = await this.searchProvider.search(tenantId, query);
    if (query.q && query.q.trim()) {
      this.saveHistory(
        tenantId,
        userId,
        query.q,
        query,
        result.meta.total,
        result.meta.durationMs,
      ).catch(() => {});
    }
    return result;
  }

  async suggest(tenantId: string, q: string, limit = 5) {
    return this.searchProvider.suggest(tenantId, q, limit);
  }

  async index(tenantId: string, doc: IndexDocumentInput) {
    await this.searchProvider.index(tenantId, doc);
    this.logger.debug(`Indexed: ${doc.entityType}/${doc.entityId}`);
  }

  async remove(tenantId: string, entityType: string, entityId: string) {
    await this.searchProvider.remove(tenantId, entityType, entityId);
    this.logger.debug(`Removed from index: ${entityType}/${entityId}`);
  }

  async reindex(tenantId: string, entityType?: string) {
    const result = await this.searchProvider.reindex(tenantId, entityType);
    this.eventBus
      .publish(
        new BaseDomainEvent({
          eventName: 'search.reindexed',
          aggregateType: 'Search',
          aggregateId: tenantId,
          payload: { entityType, ...result },
          tenantId,
        }),
      )
      .catch(() => {});
    this.logger.log(`Reindex complete: ${result.indexed} documents`);
    return result;
  }

  async clearIndex(tenantId: string, entityType?: string) {
    await this.searchProvider.clearIndex(tenantId, entityType);
    this.logger.log(`Index cleared for tenant ${tenantId}`);
  }

  async getHistory(tenantId: string, userId: string, page = 1, limit = 20) {
    const prismaAny = this.prisma as any;
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      prismaAny.searchHistory.findMany({
        where: { tenantId, userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prismaAny.searchHistory.count({ where: { tenantId, userId } }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async addFavorite(
    tenantId: string,
    userId: string,
    entityType: string,
    entityId: string,
    title: string,
    url?: string,
  ) {
    const prismaAny = this.prisma as any;
    return prismaAny.searchFavorite.upsert({
      where: {
        userId_entityType_entityId: { userId, entityType, entityId },
      },
      create: { entityType, entityId, title, url, userId, tenantId },
      update: { title, url },
    });
  }

  async removeFavorite(tenantId: string, userId: string, entityType: string, entityId: string) {
    const prismaAny = this.prisma as any;
    await prismaAny.searchFavorite.deleteMany({
      where: { userId, entityType, entityId, tenantId },
    });
  }

  async getFavorites(tenantId: string, userId: string, page = 1, limit = 20) {
    const prismaAny = this.prisma as any;
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      prismaAny.searchFavorite.findMany({
        where: { tenantId, userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prismaAny.searchFavorite.count({ where: { tenantId, userId } }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getSavedFilters(tenantId: string, userId: string) {
    const prismaAny = this.prisma as any;
    return prismaAny.searchSavedFilter.findMany({
      where: {
        tenantId,
        OR: [{ userId }, { isShared: true }],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async saveFilter(
    tenantId: string,
    userId: string,
    name: string,
    filters: Record<string, unknown>,
    isShared = false,
  ) {
    const prismaAny = this.prisma as any;
    return prismaAny.searchSavedFilter.create({
      data: { name, filters: filters as any, userId, tenantId, isShared },
    });
  }

  async deleteFilter(tenantId: string, userId: string, filterId: string) {
    const prismaAny = this.prisma as any;
    await prismaAny.searchSavedFilter.deleteMany({
      where: { id: filterId, tenantId, userId },
    });
  }

  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalIndexed, searchesToday, totalHistory] = await Promise.all([
      prismaAny.searchIndex.count({ where: { tenantId, isActive: true } }),
      prismaAny.searchHistory.count({
        where: { tenantId, createdAt: { gte: todayStart } },
      }),
      prismaAny.searchHistory.count({ where: { tenantId } }),
    ]);

    const avgResult = await prismaAny.searchHistory.aggregate({
      where: { tenantId, resultCount: { gt: 0 } },
      _avg: { resultCount: true },
    });

    const avgDurationResult = await prismaAny.searchHistory.aggregate({
      where: { tenantId, durationMs: { not: null } },
      _avg: { durationMs: true },
    });

    const mostFrequentQueries = await prismaAny.searchHistory.groupBy({
      by: ['query'],
      where: { tenantId },
      _count: { query: true },
      orderBy: { _count: { query: 'desc' } },
      take: 10,
    });

    const entityDistribution = await prismaAny.searchIndex.groupBy({
      by: ['entityType'],
      where: { tenantId, isActive: true },
      _count: true,
    });

    return {
      totalIndexed,
      searchesToday,
      totalHistory,
      avgResultCount: avgResult?._avg?.resultCount ? Math.round(avgResult._avg.resultCount) : 0,
      avgDurationMs: avgDurationResult?._avg?.durationMs
        ? Math.round(avgDurationResult._avg.durationMs)
        : 0,
      mostFrequentQueries: mostFrequentQueries.map((q: any) => ({
        query: q.query,
        count: q._count.query,
      })),
      entityDistribution: entityDistribution.map((e: any) => ({
        entityType: e.entityType,
        count: e._count,
      })),
    };
  }

  async healthCheck() {
    return this.searchProvider.healthCheck();
  }

  private async saveHistory(
    tenantId: string,
    userId: string | undefined,
    query: string,
    filters: any,
    resultCount: number,
    durationMs?: number,
  ) {
    const prismaAny = this.prisma as any;
    await prismaAny.searchHistory.create({
      data: {
        query,
        filters: filters as any,
        resultCount,
        durationMs: durationMs || 0,
        userId: userId || 'anonymous',
        tenantId,
      },
    });
  }
}
