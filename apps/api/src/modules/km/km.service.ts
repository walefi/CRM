import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class KmService {
  constructor(private readonly prisma: PrismaService) {}

  async getWiki(tenantId: string, category?: string) {
    const where: any = { tenantId, status: 'published' };
    if (category) where.category = category;
    return (this.prisma as any).wikiPage.findMany({ where, orderBy: { updatedAt: 'desc' }, select: { id: true, title: true, slug: true, category: true, version: true, viewCount: true, tags: true, updatedAt: true } });
  }

  async getWikiPage(tenantId: string, slug: string) {
    const prismaAny = this.prisma as any;
    await prismaAny.wikiPage.update({ where: { slug_tenantId: { slug, tenantId } }, data: { viewCount: { increment: 1 } } });
    return prismaAny.wikiPage.findUnique({ where: { slug_tenantId: { slug, tenantId } } });
  }

  async createWiki(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).wikiPage.create({
      data: { title: dto.title, content: dto.content, slug: dto.slug || dto.title.toLowerCase().replace(/\s+/g, '-'), category: dto.category, tags: dto.tags || [], tenantId, createdBy: userId },
    });
  }

  async getFAQs(tenantId: string, category?: string) {
    const where: any = { tenantId, isActive: true };
    if (category) where.category = category;
    return (this.prisma as any).fAQ.findMany({ where, orderBy: { order: 'asc' } });
  }

  async createFAQ(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).fAQ.create({
      data: { question: dto.question, answer: dto.answer, category: dto.category, order: dto.order || 0, tags: dto.tags || [], tenantId, createdBy: userId },
    });
  }

  async getCollections(tenantId: string) {
    return (this.prisma as any).knowledgeCollection.findMany({ where: { tenantId, isActive: true }, orderBy: { category: 'asc' } });
  }

  async createCollection(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).knowledgeCollection.create({
      data: { name: dto.name, description: dto.description, type: dto.type || 'manual', category: dto.category, items: (dto.items as any) || [], tenantId, createdBy: userId },
    });
  }

  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const [wiki, faqs, collections, articles, documents] = await Promise.all([
      prismaAny.wikiPage.count({ where: { tenantId } }),
      prismaAny.fAQ.count({ where: { tenantId, isActive: true } }),
      prismaAny.knowledgeCollection.count({ where: { tenantId } }),
      prismaAny.knowledgeArticle?.count({ where: { tenantId } }) || 0,
      prismaAny.file?.count({ where: { tenantId, deletedAt: null } }) || 0,
    ]);
    return { wikiPages: wiki, faqs, knowledgeCollections: collections, articles, documents };
  }
}
