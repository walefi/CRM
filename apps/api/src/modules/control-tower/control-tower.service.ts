import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ControlTowerService {
  constructor(private readonly prisma: PrismaService) {}

  async getExecutiveDashboard(tenantId: string) {
    const prismaAny = this.prisma as any;
    const [leads, deals, tickets, revenue, orders, subscriptions] = await Promise.all([
      this.prisma.lead.count({ where: { tenantId } }),
      this.prisma.deal.count({ where: { tenantId, status: 'OPEN' } }),
      prismaAny.ticket?.count({ where: { tenantId, status: { in: ['new', 'open'] } } }) || 0,
      prismaAny.salesOrder?.aggregate({ where: { tenantId, status: 'approved' }, _sum: { total: true } }) || { _sum: { total: 0 } },
      prismaAny.purchaseOrder?.count({ where: { tenantId } }) || 0,
      prismaAny.subscription?.count({ where: { tenantId, status: 'active' } }) || 0,
    ]);

    return {
      leads, openDeals: deals, openTickets: tickets,
      approvedRevenue: revenue._sum?.total || 0, purchaseOrders: orders, activeSubscriptions: subscriptions,
    };
  }

  async getKPIs(tenantId: string) {
    const prismaAny = this.prisma as any;
    const existing = await prismaAny.kPIDefinition.findMany({ where: { tenantId }, orderBy: { category: 'asc' } });

    if (existing.length > 0) {
      return existing;
    }

    const [
      totalDeals,
      wonDeals,
      revenueResult,
      avgNPS,
      npsCount,
      totalSubscriptions,
      cancelledSubscriptions,
      openTickets,
      resolvedTickets,
      totalLeads,
    ] = await Promise.all([
      prismaAny.deal.count({ where: { tenantId, deletedAt: null } }),
      prismaAny.deal.count({ where: { tenantId, status: 'WON', deletedAt: null } }),
      prismaAny.salesOrder.aggregate({
        where: { tenantId, status: { not: 'cancelled' } },
        _sum: { total: true },
      }),
      prismaAny.nPSResponse.aggregate({
        where: { tenantId },
        _avg: { score: true },
      }),
      prismaAny.nPSResponse.count({ where: { tenantId } }),
      prismaAny.subscription.count({ where: { tenantId } }),
      prismaAny.subscription.count({ where: { tenantId, status: { in: ['cancelled', 'terminated'] } } }),
      prismaAny.ticket.count({ where: { tenantId, status: { notIn: ['closed', 'resolved'] } } }),
      prismaAny.ticket.count({ where: { tenantId, status: { in: ['closed', 'resolved'] } } }),
      prismaAny.lead.count({ where: { tenantId, deletedAt: null } }),
    ]);

    const revenue = Number(revenueResult?._sum?.total ?? 0);
    const conversionRate = totalLeads > 0 ? Math.round((wonDeals / totalLeads) * 10000) / 100 : 0;
    const npsScore = npsCount > 0 ? Math.round(Number(avgNPS?._avg?.score ?? 0) * 10) / 10 : 0;
    const churnRate = totalSubscriptions > 0
      ? Math.round((cancelledSubscriptions / totalSubscriptions) * 10000) / 100
      : 0;
    const ticketResolutionRate = (openTickets + resolvedTickets) > 0
      ? Math.round((resolvedTickets / (openTickets + resolvedTickets)) * 10000) / 100
      : 0;

    return [
      { name: 'Receita Total', category: 'financial', target: null, unit: 'BRL', currentValue: revenue, trend: 'stable' },
      { name: 'Conversão', category: 'sales', target: null, unit: 'percent', currentValue: conversionRate, trend: 'stable' },
      { name: 'NPS', category: 'customer', target: null, unit: 'score', currentValue: npsScore, trend: 'stable' },
      { name: 'Churn', category: 'customer', target: null, unit: 'percent', currentValue: churnRate, trend: 'stable' },
      { name: 'Resolução de Tickets', category: 'support', target: null, unit: 'percent', currentValue: ticketResolutionRate, trend: 'stable' },
      { name: 'Negócios Ativos', category: 'sales', target: null, unit: 'count', currentValue: totalDeals, trend: 'stable' },
      { name: 'Negócios Ganhos', category: 'sales', target: null, unit: 'count', currentValue: wonDeals, trend: 'stable' },
      { name: 'Tickets Abertos', category: 'support', target: null, unit: 'count', currentValue: openTickets, trend: 'stable' },
      { name: 'Assinaturas Ativas', category: 'financial', target: null, unit: 'count', currentValue: totalSubscriptions - cancelledSubscriptions, trend: 'stable' },
    ];
  }

  async getAlerts(tenantId: string) {
    return (this.prisma as any).operationalAlert.findMany({
      where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 30,
    });
  }

  async createAlert(tenantId: string, dto: any) {
    return (this.prisma as any).operationalAlert.create({
      data: { title: dto.title, description: dto.description, severity: dto.severity || 'warning', source: dto.source || 'system', status: 'active', tenantId },
    });
  }

  async getRisks(tenantId: string) {
    return (this.prisma as any).riskEvent.findMany({
      where: { tenantId }, orderBy: { severity: 'desc' }, take: 30,
    });
  }

  async createRisk(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).riskEvent.create({
      data: { title: dto.title, description: dto.description, category: dto.category || 'operational', probability: dto.probability || 0, impact: dto.impact || 0, severity: dto.severity || 'medium', mitigation: dto.mitigation, tenantId, createdBy: userId },
    });
  }

  async getScenarios(tenantId: string) {
    return (this.prisma as any).planningScenario.findMany({
      where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 20,
    });
  }

  async createScenario(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).planningScenario.create({
      data: { name: dto.name, type: dto.type || 'what_if', description: dto.description, assumptions: (dto.assumptions as any) || {}, results: (dto.results as any) || {}, status: dto.status || 'draft', tenantId, createdBy: userId },
    });
  }

  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const [alerts, risks, scenarios, kpis] = await Promise.all([
      prismaAny.operationalAlert.count({ where: { tenantId, status: 'active' } }),
      prismaAny.riskEvent.count({ where: { tenantId, status: 'identified' } }),
      prismaAny.planningScenario.count({ where: { tenantId } }),
      prismaAny.kPIDefinition.count({ where: { tenantId } }),
    ]);
    return { activeAlerts: alerts, identifiedRisks: risks, planningScenarios: scenarios, kpisTracked: kpis };
  }
}
