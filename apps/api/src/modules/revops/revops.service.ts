import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RevopsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCommissions(tenantId: string) {
    return (this.prisma as any).commissionPlan.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  async createCommission(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).commissionPlan.create({
      data: { name: dto.name, description: dto.description, type: dto.type || 'revenue_based', rule: dto.rule, percentage: dto.percentage || 0, target: dto.target, bonusRate: dto.bonusRate || 0, tenantId, createdBy: userId },
    });
  }

  async getForecasts(tenantId: string) {
    return (this.prisma as any).salesForecast.findMany({ where: { tenantId }, orderBy: { period: 'desc' } });
  }

  async createForecast(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).salesForecast.create({
      data: { name: dto.name, period: dto.period || 'monthly', target: dto.target || 0, pipeline: dto.pipeline || 0, weighted: dto.weighted || 0, closed: dto.closed || 0, confidence: dto.confidence || 0, notes: dto.notes, tenantId, createdBy: userId },
    });
  }

  async getTerritories(tenantId: string) {
    return (this.prisma as any).territory.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  async createTerritory(tenantId: string, dto: any) {
    return (this.prisma as any).territory.create({
      data: { name: dto.name, region: dto.region, type: dto.type || 'geographic', assigneeId: dto.assigneeId, teamId: dto.teamId, metadata: (dto.metadata as any) || {}, tenantId },
    });
  }

  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const [commissions, forecasts, territories, deals, quotes] = await Promise.all([
      prismaAny.commissionPlan.count({ where: { tenantId } }),
      prismaAny.salesForecast.count({ where: { tenantId } }),
      prismaAny.territory.count({ where: { tenantId } }),
      this.prisma.deal.count({ where: { tenantId, status: 'OPEN' } }),
      prismaAny.quoteItem?.count({ where: { quote: { tenantId } } }) || 0,
    ]);
    return { commissionPlans: commissions, forecasts, territories, openDeals: deals, quoteItems: quotes };
  }
}
