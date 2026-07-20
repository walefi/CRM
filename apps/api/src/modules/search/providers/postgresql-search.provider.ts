import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ISearchProvider,
  SearchQuery,
  SearchResponse,
  SearchResult,
  IndexDocumentInput,
} from './search-provider.interface';

@Injectable()
export class PostgresqlSearchProvider implements ISearchProvider {
  private readonly logger = new Logger(PostgresqlSearchProvider.name);

  constructor(private readonly prisma: PrismaService) {}

  async search(tenantId: string, query: SearchQuery): Promise<SearchResponse> {
    const start = Date.now();
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const prismaAny = this.prisma as any;

    const where: Record<string, unknown> = {
      tenantId,
      isActive: true,
    };

    if (query.q && query.q.trim()) {
      const terms = query.q.trim().toLowerCase().split(/\s+/);
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { subtitle: { contains: query.q, mode: 'insensitive' } },
        { content: { contains: query.q, mode: 'insensitive' } },
        { searchVector: { contains: query.q, mode: 'insensitive' } },
        ...terms.flatMap((t) => [
          { title: { contains: t, mode: 'insensitive' } },
          { content: { contains: t, mode: 'insensitive' } },
        ]),
      ];
    }

    if (query.entityTypes?.length) {
      where.entityType = { in: query.entityTypes };
    }

    if (query.tags?.length) {
      const tagConditions = query.tags.map((tag) => ({
        tags: { has: tag },
      }));
      where.AND = tagConditions;
    }

    const orderBy: any = query.q
      ? { score: 'desc' }
      : query.sortBy
        ? { [query.sortBy]: query.sortOrder || 'desc' }
        : { indexedAt: 'desc' };

    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      prismaAny.searchIndex.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      prismaAny.searchIndex.count({ where }),
    ]);

    const results: SearchResult[] = data.map((item: any) => ({
      id: item.id,
      entityType: item.entityType,
      entityId: item.entityId,
      title: item.title,
      subtitle: item.subtitle,
      contentPreview: item.content?.substring(0, 200),
      tags: item.tags || [],
      url: item.url,
      score: item.score,
      metadata: item.metadata as Record<string, unknown> | undefined,
    }));

    const durationMs = Date.now() - start;

    return {
      data: results,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
        durationMs,
      },
    };
  }

  async suggest(tenantId: string, query: string, limit = 5): Promise<string[]> {
    if (!query || query.length < 2) return [];
    const prismaAny = this.prisma as any;

    const results = await prismaAny.searchIndex.findMany({
      where: {
        tenantId,
        isActive: true,
        title: { contains: query, mode: 'insensitive' },
      },
      select: { title: true },
      take: limit,
      orderBy: { score: 'desc' },
    });

    const suggestions: string[] = [...new Set(results.map((r: any) => r.title))] as string[];
    return suggestions.slice(0, limit);
  }

  async index(tenantId: string, doc: IndexDocumentInput): Promise<void> {
    const prismaAny = this.prisma as any;
    const searchVector = [
      doc.title,
      doc.subtitle,
      doc.content,
      ...doc.tags,
      JSON.stringify(doc.metadata || {}),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const existing = await prismaAny.searchIndex.findUnique({
      where: {
        entityType_entityId: {
          entityType: doc.entityType,
          entityId: doc.entityId,
        },
      },
    });

    if (existing) {
      await prismaAny.searchIndex.update({
        where: { id: existing.id },
        data: {
          title: doc.title,
          subtitle: doc.subtitle,
          content: typeof doc.content === 'string' ? doc.content : JSON.stringify(doc.content),
          searchVector,
          tags: doc.tags,
          metadata: (doc.metadata as any) || {},
          url: doc.url,
          reindexedAt: new Date(),
        },
      });
    } else {
      await prismaAny.searchIndex.create({
        data: {
          entityType: doc.entityType,
          entityId: doc.entityId,
          title: doc.title,
          subtitle: doc.subtitle,
          content: typeof doc.content === 'string' ? doc.content : JSON.stringify(doc.content),
          searchVector,
          tags: doc.tags,
          metadata: (doc.metadata as any) || {},
          url: doc.url,
          tenantId,
          score: this.computeScore(doc),
        },
      });
    }
  }

  async bulkIndex(tenantId: string, docs: IndexDocumentInput[]): Promise<void> {
    for (const doc of docs) {
      await this.index(tenantId, doc);
    }
  }

  async remove(tenantId: string, entityType: string, entityId: string): Promise<void> {
    const prismaAny = this.prisma as any;
    await prismaAny.searchIndex.deleteMany({
      where: { tenantId, entityType, entityId },
    });
  }

  async reindex(tenantId: string, entityType?: string): Promise<{ indexed: number }> {
    let count = 0;

    const indexers: Array<{
      entityType: string;
      table: string;
      buildDoc: (item: any) => IndexDocumentInput;
    }> = [];

    if (!entityType || entityType === 'lead') {
      indexers.push({
        entityType: 'lead',
        table: 'lead',
        buildDoc: (item: any) => ({
          entityType: 'lead',
          entityId: item.id,
          title: `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.email || 'Lead',
          subtitle: item.companyName || item.email,
          content: [item.description, item.source, item.status, item.email, item.phone]
            .filter(Boolean)
            .join(' '),
          tags: item.tags || [],
          metadata: { source: item.source, status: item.status, value: item.value },
          url: `/leads`,
        }),
      });
    }

    if (!entityType || entityType === 'contact') {
      indexers.push({
        entityType: 'contact',
        table: 'contact',
        buildDoc: (item: any) => ({
          entityType: 'contact',
          entityId: item.id,
          title: `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.email || 'Contact',
          subtitle: item.email || item.phone,
          content: [item.description, item.email, item.phone, item.position]
            .filter(Boolean)
            .join(' '),
          tags: item.tags || [],
          metadata: { email: item.email, phone: item.phone, companyId: item.companyId },
          url: `/contacts`,
        }),
      });
    }

    if (!entityType || entityType === 'company') {
      indexers.push({
        entityType: 'company',
        table: 'company',
        buildDoc: (item: any) => ({
          entityType: 'company',
          entityId: item.id,
          title: item.name || 'Company',
          subtitle: item.industry || item.email,
          content: [item.description, item.email, item.phone, item.website, item.industry]
            .filter(Boolean)
            .join(' '),
          tags: item.tags || [],
          metadata: { industry: item.industry, email: item.email },
          url: `/companies`,
        }),
      });
    }

    if (!entityType || entityType === 'deal') {
      indexers.push({
        entityType: 'deal',
        table: 'deal',
        buildDoc: (item: any) => ({
          entityType: 'deal',
          entityId: item.id,
          title: item.title || 'Deal',
          subtitle: item.company?.name || `R$ ${item.value || 0}`,
          content: [item.description, item.status, `R$ ${item.value}`].filter(Boolean).join(' '),
          tags: item.tags || [],
          metadata: { status: item.status, value: item.value, pipelineId: item.pipelineId },
          url: `/deals`,
        }),
      });
    }

    if (!entityType || entityType === 'product') {
      indexers.push({
        entityType: 'product',
        table: 'product',
        buildDoc: (item: any) => ({
          entityType: 'product',
          entityId: item.id,
          title: item.name || 'Product',
          subtitle: item.sku || `R$ ${item.price}`,
          content: [item.description, item.sku, item.category?.name].filter(Boolean).join(' '),
          tags: item.tags || [],
          metadata: { price: item.price, sku: item.sku, categoryId: item.categoryId },
          url: `/products`,
        }),
      });
    }

    if (!entityType || entityType === 'quote') {
      indexers.push({
        entityType: 'quote',
        table: 'quote',
        buildDoc: (item: any) => ({
          entityType: 'quote',
          entityId: item.id,
          title: item.title || `Quote #${item.quoteNumber}`,
          subtitle: item.company?.name || `R$ ${item.total}`,
          content: [item.description, item.status, `R$ ${item.total}`].filter(Boolean).join(' '),
          tags: item.tags || [],
          metadata: { status: item.status, total: item.total },
          url: `/quotes`,
        }),
      });
    }

    if (!entityType || entityType === 'contract') {
      indexers.push({
        entityType: 'contract',
        table: 'contract',
        buildDoc: (item: any) => ({
          entityType: 'contract',
          entityId: item.id,
          title: item.title || `Contract #${item.contractNumber}`,
          subtitle: item.company?.name || item.status,
          content: [item.description, item.status, item.type].filter(Boolean).join(' '),
          tags: item.tags || [],
          metadata: { status: item.status, type: item.type },
          url: `/contracts`,
        }),
      });
    }

    const prismaAny = this.prisma as any;

    for (const indexer of indexers) {
      const items = await prismaAny[indexer.table].findMany({
        where: { tenantId, deletedAt: null },
        include: { company: { select: { name: true } }, category: { select: { name: true } } },
      });

      for (const item of items) {
        try {
          await this.index(tenantId, indexer.buildDoc(item));
          count++;
        } catch (error: any) {
          this.logger.warn(
            `Failed to index ${indexer.entityType} ${(item as any).id}: ${error.message}`,
          );
        }
      }
    }

    return { indexed: count };
  }

  async clearIndex(tenantId: string, entityType?: string): Promise<void> {
    const prismaAny = this.prisma as any;
    const where: Record<string, unknown> = { tenantId };
    if (entityType) where.entityType = entityType;
    await prismaAny.searchIndex.deleteMany({ where });
  }

  async healthCheck(): Promise<{ status: string; provider: string; indexedCount?: number }> {
    const prismaAny = this.prisma as any;
    const count = await prismaAny.searchIndex.count();
    return { status: 'healthy', provider: 'postgresql', indexedCount: count };
  }

  private computeScore(doc: IndexDocumentInput): number {
    let score = 0;
    if (doc.title) score += Math.min(doc.title.length, 50);
    if (doc.subtitle) score += Math.min(doc.subtitle.length * 0.5, 25);
    if (doc.content) {
      const contentStr = typeof doc.content === 'string' ? doc.content : JSON.stringify(doc.content);
      score += Math.min(contentStr.length * 0.1, 100);
    }
    if (doc.tags && doc.tags.length > 0) score += doc.tags.length * 5;
    return Math.round(score);
  }
}
