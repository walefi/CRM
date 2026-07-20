import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ObservabilityApiService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(tenantId: string) {
    const prismaAny = this.prisma as any;
    const [metrics, logs, health, alerts, incidents] = await Promise.all([
      prismaAny.observabilityMetric.count({ where: { tenantId } }),
      prismaAny.observabilityLog.count({ where: { tenantId } }),
      prismaAny.healthCheck.count({ where: { tenantId } }),
      prismaAny.alertRule.count({ where: { tenantId, isActive: true } }),
      (this.prisma as any).securityIncident?.count({ where: { tenantId } }) || 0,
    ]);
    return { totalMetrics: metrics, totalLogs: logs, healthChecks: health, activeAlerts: alerts, securityIncidents: incidents };
  }

  async getMetrics(tenantId: string, name?: string) {
    const where: any = { tenantId };
    if (name) where.name = name;
    return (this.prisma as any).observabilityMetric.findMany({ where, orderBy: { timestamp: 'desc' }, take: 50 });
  }

  async recordMetric(tenantId: string, dto: any) {
    return (this.prisma as any).observabilityMetric.create({
      data: { name: dto.name, value: dto.value, unit: dto.unit || 'ms', tags: (dto.tags as any) || {}, tenantId },
    });
  }

  async getLogs(tenantId: string, severity?: string, page = 1, limit = 30) {
    const where: any = { tenantId };
    if (severity) where.severity = severity;
    const skip = (page - 1) * limit;
    const prismaAny = this.prisma as any;
    const [data, total] = await Promise.all([
      prismaAny.observabilityLog.findMany({ where, skip, take: limit, orderBy: { timestamp: 'desc' } }),
      prismaAny.observabilityLog.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async recordLog(tenantId: string, dto: any) {
    return (this.prisma as any).observabilityLog.create({
      data: { severity: dto.severity || 'info', message: dto.message, service: dto.service || 'api', traceId: dto.traceId, metadata: (dto.metadata as any) || {}, tenantId },
    });
  }

  async getHealth(tenantId: string) {
    return (this.prisma as any).healthCheck.findMany({ where: { tenantId }, orderBy: { checkedAt: 'desc' }, take: 20 });
  }

  async runHealthCheck(tenantId: string) {
    const prismaAny = this.prisma as any;
    const start = Date.now();
    const checks = ['database', 'api'];

    const dbTest = await prismaAny.$queryRaw`SELECT 1`.then(() => true).catch(() => false);

    const results = checks.map(s => ({
      service: s,
      status: s === 'database' ? (dbTest ? 'healthy' : 'degraded') : 'healthy',
      latencyMs: Date.now() - start,
    }));

    for (const r of results) {
      await prismaAny.healthCheck.create({
        data: { service: r.service, status: r.status, latencyMs: r.latencyMs, dependencies: { checks: results.length } as any, tenantId },
      });
    }
    return { checks: results, overallLatencyMs: Date.now() - start };
  }

  async getAlerts(tenantId: string) {
    return (this.prisma as any).alertRule.findMany({ where: { tenantId }, orderBy: { severity: 'asc' } });
  }

  async createAlert(tenantId: string, dto: any) {
    return (this.prisma as any).alertRule.create({
      data: { name: dto.name, metric: dto.metric, operator: dto.operator || 'gt', threshold: dto.threshold, severity: dto.severity || 'warning', channels: dto.channels || ['email'], tenantId },
    });
  }

  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const [metrics, logs, healthy] = await Promise.all([
      prismaAny.observabilityMetric.count({ where: { tenantId, timestamp: { gte: todayStart } } }),
      prismaAny.observabilityLog.count({ where: { tenantId, timestamp: { gte: todayStart } } }),
      prismaAny.healthCheck.count({ where: { tenantId, status: 'healthy' } }),
    ]);
    return { metricsToday: metrics, logsToday: logs, healthyServices: healthy };
  }
}
