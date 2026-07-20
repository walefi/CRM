import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SecurityService {
  constructor(private readonly prisma: PrismaService) {}

  async getPolicies(tenantId: string) {
    return (this.prisma as any).securityPolicy.findMany({ where: { tenantId }, orderBy: { type: 'asc' } });
  }

  async createPolicy(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).securityPolicy.create({
      data: { name: dto.name, type: dto.type || 'access', description: dto.description, rules: (dto.rules as any) || {}, tenantId, createdBy: userId },
    });
  }

  async getSecrets(tenantId: string) {
    return (this.prisma as any).secret.findMany({ where: { tenantId }, select: { id: true, name: true, type: true, category: true, expiresAt: true, version: true, lastRotatedAt: true, createdAt: true }, orderBy: { name: 'asc' } });
  }

  async createSecret(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).secret.create({
      data: { name: dto.name, value: dto.value, type: dto.type || 'api_key', category: dto.category || 'general', expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined, metadata: (dto.metadata as any) || {}, tenantId, createdBy: userId },
    });
  }

  async getIncidents(tenantId: string) {
    return (this.prisma as any).securityIncident.findMany({ where: { tenantId }, orderBy: { detectedAt: 'desc' }, take: 30 });
  }

  async createIncident(tenantId: string, dto: any) {
    return (this.prisma as any).securityIncident.create({
      data: { title: dto.title, severity: dto.severity || 'medium', type: dto.type || 'access_attempt', description: dto.description, metadata: (dto.metadata as any) || {}, tenantId },
    });
  }

  async getCompliance(tenantId: string) {
    return (this.prisma as any).complianceAudit.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async createCompliance(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).complianceAudit.create({
      data: { title: dto.title, type: dto.type || 'internal', regulation: dto.regulation || 'LGPD', findings: (dto.findings as any) || [], status: dto.status || 'planned', tenantId, createdBy: userId },
    });
  }

  async getAudit(tenantId: string, page = 1, limit = 30) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where: { tenantId }, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.auditLog.count({ where: { tenantId } }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const [policies, secrets, incidents, compliance] = await Promise.all([
      prismaAny.securityPolicy.count({ where: { tenantId, isActive: true } }),
      prismaAny.secret.count({ where: { tenantId } }),
      prismaAny.securityIncident.count({ where: { tenantId, status: 'investigating' } }),
      prismaAny.complianceAudit.count({ where: { tenantId } }),
    ]);
    return { activePolicies: policies, secrets, openIncidents: incidents, complianceAudits: compliance };
  }
}
