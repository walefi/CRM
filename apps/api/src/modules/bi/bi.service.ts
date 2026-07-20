import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BiService {
  private readonly logger = new Logger(BiService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOverview(tenantId: string) {
    const prismaAny = this.prisma as any;
    const [pipelines, sources, metrics, queries, dashboards] = await Promise.all([
      prismaAny.dataPipeline.count({ where: { tenantId } }),
      prismaAny.dataSource.count({ where: { tenantId } }),
      prismaAny.businessMetric.count({ where: { tenantId } }),
      prismaAny.analyticalQuery.count({ where: { tenantId } }),
      this.prisma.dashboard.count({ where: { tenantId } }),
    ]);
    return { pipelines, dataSources: sources, businessMetrics: metrics, queries, dashboards };
  }

  async getPipelines(tenantId: string) {
    return (this.prisma as any).dataPipeline.findMany({ where: { tenantId }, orderBy: { updatedAt: 'desc' } });
  }

  async runPipeline(tenantId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const pipelineId = dto?.pipelineId;
    if (!pipelineId) {
      throw new Error('pipelineId is required');
    }

    const pipeline = await prismaAny.dataPipeline.findFirst({
      where: { id: pipelineId, tenantId },
    });
    if (!pipeline) {
      throw new Error('Pipeline not found');
    }

    await prismaAny.dataPipeline.update({
      where: { id: pipelineId },
      data: { status: 'running', lastRunAt: new Date() },
    });

    try {
      const [leads, deals, contacts, companies, tickets, orders] = await Promise.all([
        prismaAny.lead.count({ where: { tenantId, deletedAt: null } }),
        prismaAny.deal.count({ where: { tenantId, deletedAt: null } }),
        prismaAny.contact.count({ where: { tenantId, deletedAt: null } }),
        prismaAny.company.count({ where: { tenantId, deletedAt: null } }),
        prismaAny.ticket.count({ where: { tenantId } }),
        prismaAny.salesOrder.count({ where: { tenantId } }),
      ]);

      const records = leads + deals + contacts + companies + tickets + orders;

      await prismaAny.dataPipeline.update({
        where: { id: pipelineId },
        data: {
          status: 'completed',
          lastStatus: 'success',
          records,
          error: null,
        },
      });

      return { pipelineId, status: 'completed', records };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await prismaAny.dataPipeline.update({
        where: { id: pipelineId },
        data: {
          status: 'failed',
          lastStatus: 'error',
          error: message,
        },
      });
      return { pipelineId, status: 'failed', records: 0 };
    }
  }

  async getDataSources(tenantId: string) {
    return (this.prisma as any).dataSource.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  async createDataSource(tenantId: string, dto: any) {
    return (this.prisma as any).dataSource.create({
      data: { name: dto.name, type: dto.type || 'postgresql', connection: dto.connection, status: 'disconnected', tenantId },
    });
  }

  async getMetrics(tenantId: string) {
    const prismaAny = this.prisma as any;
    const existing = await prismaAny.businessMetric.findMany({ where: { tenantId }, orderBy: { category: 'asc' } });

    if (existing.length > 0) {
      return existing;
    }

    const [
      totalLeads,
      convertedLeads,
      wonDeals,
      totalDeals,
      revenueResult,
      avgOrderValue,
      activeTickets,
      totalContacts,
      totalCompanies,
    ] = await Promise.all([
      prismaAny.lead.count({ where: { tenantId, deletedAt: null } }),
      prismaAny.lead.count({ where: { tenantId, status: 'CONVERTED', deletedAt: null } }),
      prismaAny.deal.count({ where: { tenantId, status: 'WON', deletedAt: null } }),
      prismaAny.deal.count({ where: { tenantId, deletedAt: null } }),
      prismaAny.salesOrder.aggregate({
        where: { tenantId, status: { not: 'cancelled' } },
        _sum: { total: true },
      }),
      prismaAny.salesOrder.aggregate({
        where: { tenantId, status: { not: 'cancelled' } },
        _avg: { total: true },
      }),
      prismaAny.ticket.count({
        where: { tenantId, status: { notIn: ['closed', 'resolved'] } },
      }),
      prismaAny.contact.count({ where: { tenantId, deletedAt: null } }),
      prismaAny.company.count({ where: { tenantId, deletedAt: null } }),
    ]);

    const revenue = Number(revenueResult?._sum?.total ?? 0);
    const avgOrder = Number(avgOrderValue?._avg?.total ?? 0);
    const conversionRate = totalLeads > 0
      ? Math.round((convertedLeads / totalLeads) * 10000) / 100
      : 0;

    return [
      { name: 'Receita Total', category: 'revenue', formula: 'SUM(sales_orders.total)', value: revenue, target: null, unit: 'BRL', period: 'monthly' },
      { name: 'Leads', category: 'sales', formula: 'COUNT(leads)', value: totalLeads, target: null, unit: 'count', period: 'monthly' },
      { name: 'Conversão', category: 'sales', formula: 'leads_convertidos / leads * 100', value: conversionRate, target: null, unit: 'percent', period: 'monthly' },
      { name: 'Ticket Médio', category: 'revenue', formula: 'AVG(sales_orders.total)', value: avgOrder, target: null, unit: 'BRL', period: 'monthly' },
      { name: 'Negócios Ganhos', category: 'sales', formula: 'COUNT(deals WHERE status = WON)', value: wonDeals, target: null, unit: 'count', period: 'monthly' },
      { name: 'Total de Negócios', category: 'sales', formula: 'COUNT(deals)', value: totalDeals, target: null, unit: 'count', period: 'monthly' },
      { name: 'Contatos', category: 'operations', formula: 'COUNT(contacts)', value: totalContacts, target: null, unit: 'count', period: 'monthly' },
      { name: 'Empresas', category: 'operations', formula: 'COUNT(companies)', value: totalCompanies, target: null, unit: 'count', period: 'monthly' },
      { name: 'Tickets Abertos', category: 'support', formula: 'COUNT(tickets WHERE status NOT IN closed, resolved)', value: activeTickets, target: null, unit: 'count', period: 'monthly' },
    ];
  }

  async createMetric(tenantId: string, dto: any) {
    return (this.prisma as any).businessMetric.create({
      data: { name: dto.name, category: dto.category || 'custom', formula: dto.formula, value: dto.value, target: dto.target, unit: dto.unit || 'count', period: dto.period || 'monthly', tenantId },
    });
  }

  async getDashboards(tenantId: string) {
    return this.prisma.dashboard.findMany({ where: { tenantId }, include: { widgets: true }, orderBy: { updatedAt: 'desc' } });
  }

  async createDashboard(tenantId: string, userId: string, dto: any) {
    return this.prisma.dashboard.create({
      data: { name: dto.name, description: dto.description, category: dto.category || 'USER', config: (dto.config as any) || {}, isTemplate: dto.isTemplate || false, tenantId, userId },
    });
  }

  async runQuery(tenantId: string, userId: string, dto: any) {
    const start = Date.now();
    const prismaAny = this.prisma as any;

    const queryText = dto?.query;
    if (!queryText || typeof queryText !== 'string') {
      throw new Error('query is required');
    }

    const queryRecord = await prismaAny.analyticalQuery.create({
      data: {
        name: dto.name || null,
        query: queryText,
        type: dto.type || 'sql',
        resultCount: 0,
        durationMs: 0,
        error: null,
        userId,
        tenantId,
      },
    });

    const durationMs = Date.now() - start;

    await prismaAny.analyticalQuery.update({
      where: { id: queryRecord.id },
      data: { durationMs },
    });

    return {
      id: queryRecord.id,
      resultCount: 0,
      durationMs,
      message: 'Query recorded. Direct SQL execution is not supported for security reasons.',
    };
  }

  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const [pipelines, active, metrics, queries] = await Promise.all([
      prismaAny.dataPipeline.count({ where: { tenantId } }),
      prismaAny.dataPipeline.count({ where: { tenantId, status: 'running' } }),
      prismaAny.businessMetric.count({ where: { tenantId } }),
      prismaAny.analyticalQuery.count({ where: { tenantId } }),
    ]);
    return { pipelines, activePipelines: active, metrics, totalQueries: queries };
  }
}
