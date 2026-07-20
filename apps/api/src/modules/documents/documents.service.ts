import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getDocuments(tenantId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const where: any = { tenantId, deletedAt: null };
    if (dto.folderId) where.folderId = dto.folderId;
    if (dto.search) where.name = { contains: dto.search, mode: 'insensitive' };
    if (dto.entity) { where.entity = dto.entity; where.entityId = dto.entityId; }
    if (dto.isFavorite !== undefined) where.isFavorite = dto.isFavorite;
    if (dto.tags) where.tags = { hasSome: dto.tags };

    const page = dto.page || 1; const limit = dto.limit || 24;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prismaAny.file.findMany({ where, skip, take: limit, orderBy: { updatedAt: 'desc' }, include: { versions: { take: 1, orderBy: { version: 'desc' } } } }),
      prismaAny.file.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 } };
  }

  async getDocument(tenantId: string, id: string) {
    const prismaAny = this.prisma as any;
    const doc = await prismaAny.file.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { versions: { orderBy: { version: 'desc' } }, shares: true },
    });
    if (!doc) throw new NotFoundException(`Document ${id} not found`);
    return doc;
  }

  async uploadDocument(tenantId: string, userId: string, dto: any) {
    const prismaAny = this.prisma as any;
    return prismaAny.file.create({
      data: {
        name: dto.name || dto.originalName, originalName: dto.originalName,
        mimeType: dto.mimeType || 'application/octet-stream', size: dto.size || 0,
        path: dto.path || '/uploads/', url: dto.url || '',
        entity: dto.entity, entityId: dto.entityId, folderId: dto.folderId,
        tags: dto.tags || [], description: dto.description,
        hash: dto.hash, tenantId, uploadedBy: userId,
        companyId: dto.companyId, contactId: dto.contactId, dealId: dto.dealId,
      },
    });
  }

  async updateDocument(tenantId: string, id: string, dto: any) {
    const prismaAny = this.prisma as any;
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.folderId !== undefined) data.folderId = dto.folderId;
    if (dto.isFavorite !== undefined) data.isFavorite = dto.isFavorite;
    if (dto.isArchived !== undefined) data.isArchived = dto.isArchived;
    return prismaAny.file.update({ where: { id }, data });
  }

  async deleteDocument(tenantId: string, id: string) {
    return (this.prisma as any).file.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async addVersion(tenantId: string, userId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const doc = await prismaAny.file.findUnique({ where: { id: dto.fileId } });
    const newVersion = (doc.version || 1) + 1;
    await prismaAny.file.update({ where: { id: dto.fileId }, data: { version: newVersion, url: dto.url, size: dto.size || doc.size, hash: dto.hash } });
    return prismaAny.documentVersion.create({
      data: { fileId: dto.fileId, version: newVersion, name: dto.name || doc.name, url: dto.url, size: dto.size || doc.size, hash: dto.hash, comment: dto.comment, uploadedBy: userId },
    });
  }

  async shareDocument(tenantId: string, userId: string, dto: any) {
    const token = crypto.randomUUID().replace(/-/g, '').substring(0, 12);
    return (this.prisma as any).documentShare.create({
      data: { fileId: dto.fileId, sharedWithId: dto.userId, sharedWithTeamId: dto.teamId, permission: dto.permission || 'view', token, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined, password: dto.password, isPublic: dto.isPublic || false, tenantId, createdBy: userId },
    });
  }

  async addComment(tenantId: string, userId: string, dto: any) {
    if (dto.timelineId) {
      return (this.prisma as any).timelineComment.create({ data: { timelineId: dto.timelineId, content: dto.content, userId } });
    }
    return { id: 'comment-' + Date.now(), content: dto.content };
  }

  async toggleFavorite(tenantId: string, id: string) {
    const prismaAny = this.prisma as any;
    const doc = await prismaAny.file.findUnique({ where: { id } });
    return prismaAny.file.update({ where: { id }, data: { isFavorite: !doc.isFavorite } });
  }

  async searchDocuments(tenantId: string, query: string, page = 1, limit = 20) {
    return this.getDocuments(tenantId, { search: query, page, limit });
  }

  async getFolders(tenantId: string, parentId?: string) {
    const where: any = { tenantId };
    if (parentId !== undefined) where.parentId = parentId || null;
    return (this.prisma as any).documentFolder.findMany({ where, orderBy: { name: 'asc' }, include: { files: { take: 1 }, children: { take: 1 } } });
  }

  async createFolder(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).documentFolder.create({
      data: { name: dto.name, parentId: dto.parentId, color: dto.color, tenantId, createdBy: userId },
    });
  }

  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const [total, totalSize, folders, versions] = await Promise.all([
      prismaAny.file.count({ where: { tenantId, deletedAt: null } }),
      prismaAny.file.aggregate({ where: { tenantId, deletedAt: null }, _sum: { size: true } }),
      prismaAny.documentFolder.count({ where: { tenantId } }),
      prismaAny.documentVersion.count({ where: { file: { tenantId } } }),
    ]);
    return { total, totalSize: totalSize._sum?.size || 0, folders, versions };
  }
}
