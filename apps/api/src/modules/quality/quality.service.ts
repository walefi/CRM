import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class QualityService {
  constructor(private readonly prisma: PrismaService) {}

  async getNonConformities(tenantId: string, dto: any) {
    const where: any = { tenantId };
    if (dto.status) where.status = dto.status;
    if (dto.severity) where.severity = dto.severity;
    const page = dto.page || 1; const limit = dto.limit || 20; const skip = (page - 1) * limit;
    const prismaAny = this.prisma as any;
    const [data, total] = await Promise.all([
      prismaAny.nonConformity.findMany({ where, skip, take: limit, orderBy: { updatedAt: 'desc' } }),
      prismaAny.nonConformity.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 } };
  }

  async createNonConformity(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).nonConformity.create({
      data: { title: dto.title, description: dto.description, severity: dto.severity || 'minor', source: dto.source || 'inspection', status: 'open', productId: dto.productId, orderId: dto.orderId, notes: dto.notes, tenantId, createdBy: userId },
    });
  }

  async getCAPAs(tenantId: string, dto: any) {
    const where: any = { tenantId };
    if (dto.status) where.status = dto.status;
    const page = dto.page || 1; const limit = dto.limit || 20; const skip = (page - 1) * limit;
    const prismaAny = this.prisma as any;
    const [data, total] = await Promise.all([
      prismaAny.cAPA.findMany({ where, skip, take: limit, orderBy: { updatedAt: 'desc' } }),
      prismaAny.cAPA.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 } };
  }

  async createCAPA(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).cAPA.create({
      data: { nonConformityId: dto.nonConformityId, title: dto.title, type: dto.type || 'corrective', rootCause: dto.rootCause, actionPlan: dto.actionPlan, status: 'open', assignedToId: dto.assignedToId, dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined, notes: dto.notes, tenantId, createdBy: userId },
    });
  }

  async getAudits(tenantId: string) {
    return (this.prisma as any).qualityAudit.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async createAudit(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).qualityAudit.create({
      data: { title: dto.title, type: dto.type || 'internal', scope: dto.scope, status: 'planned', plannedDate: dto.plannedDate ? new Date(dto.plannedDate) : undefined, findings: (dto.findings as any) || [], tenantId, createdBy: userId },
    });
  }

  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const [open, capas, audits, resolved] = await Promise.all([
      prismaAny.nonConformity.count({ where: { tenantId, status: 'open' } }),
      prismaAny.cAPA.count({ where: { tenantId } }),
      prismaAny.qualityAudit.count({ where: { tenantId } }),
      prismaAny.nonConformity.count({ where: { tenantId, status: 'resolved' } }),
    ]);
    return { openNCs: open, resolvedNCs: resolved, totalCAPAs: capas, totalAudits: audits };
  }
}
