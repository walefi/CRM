import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CustomerSuccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getSubscriptions(tenantId: string, dto: any) {
    const where: any = { tenantId };
    if (dto.status) where.status = dto.status;
    const page = dto.page || 1; const limit = dto.limit || 20; const skip = (page - 1) * limit;
    const prismaAny = this.prisma as any;
    const [data, total] = await Promise.all([
      prismaAny.subscription.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: { renewals: { take: 1, orderBy: { createdAt: 'desc' } } } }),
      prismaAny.subscription.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 } };
  }

  async createSubscription(tenantId: string, userId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const startDate = new Date(dto.startDate || Date.now());
    const nextBillingAt = this.calculateNextBilling(startDate, dto.billingCycle || 'monthly');
    return prismaAny.subscription.create({
      data: { companyId: dto.companyId, planName: dto.planName, price: dto.price || 0, billingCycle: dto.billingCycle || 'monthly', status: 'active', startDate, nextBillingAt, autoRenew: dto.autoRenew ?? true, notes: dto.notes, tenantId, createdBy: userId },
    });
  }

  async getRenewals(tenantId: string) {
    return (this.prisma as any).subscriptionRenewal.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, include: { subscription: { select: { id: true, planName: true } } }, take: 30 });
  }

  async createRenewal(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).subscriptionRenewal.create({
      data: { subscriptionId: dto.subscriptionId, status: dto.status || 'pending', newPrice: dto.newPrice, newCycle: dto.newCycle, notes: dto.notes, tenantId, createdBy: userId },
    });
  }

  async getHealth(tenantId: string, companyId?: string) {
    const where: any = { tenantId };
    if (companyId) where.companyId = companyId;
    return (this.prisma as any).customerHealth.findMany({ where, orderBy: { score: 'asc' } });
  }

  async recalculateHealth(tenantId: string, companyId: string) {
    const prismaAny = this.prisma as any;

    const [subscription, npsResponse, openTickets] = await Promise.all([
      prismaAny.subscription.findFirst({ where: { companyId, tenantId, status: 'active' } }),
      prismaAny.nPSResponse.findFirst({ where: { companyId, tenantId }, orderBy: { createdAt: 'desc' } }),
      prismaAny.ticket.count({ where: { companyId, tenantId, status: { notIn: ['closed', 'resolved'] } } }),
    ]);

    let score = 50;
    if (subscription) score += 20;
    if (npsResponse && npsResponse.score >= 8) score += 20;
    else if (npsResponse && npsResponse.score >= 6) score += 10;
    if (openTickets === 0) score += 10;
    else if (openTickets > 5) score -= 10;

    score = Math.max(0, Math.min(100, score));
    const status = score >= 80 ? 'healthy' : score >= 50 ? 'at_risk' : 'critical';

    return prismaAny.customerHealth.upsert({
      where: { companyId },
      create: { companyId, score, status, factors: { subscription: !!subscription, nps: npsResponse?.score ?? null, openTickets }, tenantId },
      update: { score, status, factors: { subscription: !!subscription, nps: npsResponse?.score ?? null, openTickets }, lastUpdated: new Date() },
    });
  }

  async getJourney(tenantId: string, companyId?: string) {
    const prismaAny = this.prisma as any;
    const stages = ['lead', 'onboarding', 'implementation', 'activation', 'adoption', 'expansion', 'renewal', 'advocacy'];
    const onboards = await prismaAny.onboardingPlan.findMany({ where: { tenantId, ...(companyId ? { companyId } : {}) }, orderBy: { createdAt: 'desc' } });
    const health = companyId ? await prismaAny.customerHealth.findUnique({ where: { companyId } }) : null;
    const subs = companyId ? await prismaAny.subscription.findFirst({ where: { companyId, tenantId } }) : null;
    return { stages, currentStage: onboards[0]?.status || 'unknown', health, subscription: subs, onboarding: onboards };
  }

  async getNPS(tenantId: string) {
    const prismaAny = this.prisma as any;
    const responses = await prismaAny.nPSResponse.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 50 });
    const avg = responses.length > 0 ? responses.reduce((s: number, r: any) => s + r.score, 0) / responses.length : 0;
    return { responses, average: Math.round(avg * 10) / 10, total: responses.length };
  }

  async submitNPS(tenantId: string, dto: any) {
    return (this.prisma as any).nPSResponse.create({
      data: { companyId: dto.companyId, contactId: dto.contactId, score: dto.score, feedback: dto.feedback, survey: dto.survey || 'nps', tenantId },
    });
  }

  async createOnboarding(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).onboardingPlan.create({
      data: { companyId: dto.companyId, name: dto.name || 'Onboarding Plan', status: dto.status || 'in_progress', steps: (dto.steps as any) || [], tenantId, createdBy: userId },
    });
  }

  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const [activeSubs, atRisk, nps, onboardings] = await Promise.all([
      prismaAny.subscription.count({ where: { tenantId, status: 'active' } }),
      prismaAny.customerHealth.count({ where: { tenantId, status: 'at_risk' } }),
      prismaAny.nPSResponse.aggregate({ where: { tenantId }, _avg: { score: true } }),
      prismaAny.onboardingPlan.count({ where: { tenantId, status: 'in_progress' } }),
    ]);
    return { activeSubscriptions: activeSubs, customersAtRisk: atRisk, averageNPS: Math.round(nps._avg?.score || 0), activeOnboardings: onboardings };
  }

  private calculateNextBilling(start: Date, cycle: string): Date {
    const next = new Date(start);
    if (cycle === 'monthly') next.setMonth(next.getMonth() + 1);
    else if (cycle === 'quarterly') next.setMonth(next.getMonth() + 3);
    else if (cycle === 'semiannual') next.setMonth(next.getMonth() + 6);
    else if (cycle === 'annual') next.setFullYear(next.getFullYear() + 1);
    return next;
  }
}
