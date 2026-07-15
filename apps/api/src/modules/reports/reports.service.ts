import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async findAll(tenantId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const where: any = { tenantId };
    if (dto.search) where.name = { contains: dto.search, mode: 'insensitive' };
    if (dto.type) where.type = dto.type;
    if (dto.isTemplate !== undefined) where.isTemplate = dto.isTemplate;
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prismaAny.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: { executions: { take: 3, orderBy: { createdAt: 'desc' } } },
      }),
      prismaAny.report.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findById(tenantId: string, id: string) {
    const prismaAny = this.prisma as any;
    const report = await prismaAny.report.findFirst({
      where: { id, tenantId },
      include: { executions: { orderBy: { createdAt: 'desc' }, take: 10 }, schedules: true },
    });
    if (!report) throw new NotFoundException(`Report ${id} not found`);
    return report;
  }

  async create(tenantId: string, userId: string, dto: any) {
    const prismaAny = this.prisma as any;
    return prismaAny.report.create({
      data: {
        name: dto.name,
        type: dto.type,
        description: dto.description,
        config: (dto.config as any) || {},
        format: dto.format || 'pdf',
        sections: (dto.sections as any) || [],
        filters: (dto.filters as any) || {},
        parameters: (dto.parameters as any) || {},
        isTemplate: dto.isTemplate || false,
        tenantId,
        userId,
      },
      include: { executions: true, schedules: true },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findById(tenantId, id);
    const prismaAny = this.prisma as any;
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.config !== undefined) data.config = dto.config as any;
    if (dto.filters !== undefined) data.filters = dto.filters as any;
    if (dto.parameters !== undefined) data.parameters = dto.parameters as any;
    if (dto.sections !== undefined) data.sections = dto.sections as any;
    if (dto.isArchived !== undefined) data.isArchived = dto.isArchived;
    return prismaAny.report.update({
      where: { id },
      data,
      include: { executions: true, schedules: true },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    const prismaAny = this.prisma as any;
    await prismaAny.reportSchedule.deleteMany({ where: { reportId: id } });
    await prismaAny.reportExecution.deleteMany({ where: { reportId: id } });
    await prismaAny.report.deleteMany({ where: { id, tenantId } });
  }

  async run(tenantId: string, id: string, userId: string, dto: any) {
    const report = await this.findById(tenantId, id);
    const prismaAny = this.prisma as any;
    const format = dto.format || (report as any).format || 'pdf';
    const start = Date.now();

    const execution = await prismaAny.reportExecution.create({
      data: {
        reportId: id,
        status: 'running',
        format,
        filters: (dto.filters as any) || {},
        parameters: (dto.parameters as any) || {},
        tenantId,
        userId,
        startedAt: new Date(),
      },
    });

    try {
      const result = await this.generateReport(tenantId, report, format, dto);
      await prismaAny.reportExecution.update({
        where: { id: execution.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          durationMs: Date.now() - start,
          outputUrl: result.outputUrl,
          fileSize: result.fileSize,
        },
      });
      return { ...execution, ...result, durationMs: Date.now() - start };
    } catch (error: any) {
      await prismaAny.reportExecution.update({
        where: { id: execution.id },
        data: { status: 'failed', completedAt: new Date(), error: error.message },
      });
      throw error;
    }
  }

  async export(tenantId: string, id: string, dto: any) {
    return this.run(tenantId, id, 'system', { format: dto.format, filters: dto.filters });
  }

  async getHistory(tenantId: string, reportId?: string, page = 1, limit = 20) {
    const prismaAny = this.prisma as any;
    const where: any = { tenantId };
    if (reportId) where.reportId = reportId;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prismaAny.reportExecution.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { report: { select: { id: true, name: true } } },
      }),
      prismaAny.reportExecution.count({ where }),
    ]);
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getTemplates(tenantId: string, category?: string) {
    const prismaAny = this.prisma as any;
    const where: any = { tenantId, isActive: true };
    if (category) where.category = category;
    return prismaAny.reportTemplate.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async createTemplate(tenantId: string, userId: string, dto: any) {
    const prismaAny = this.prisma as any;
    return prismaAny.reportTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        type: dto.type,
        config: (dto.config as any) || {},
        sections: (dto.sections as any) || [],
        filters: (dto.filters as any) || {},
        tenantId,
        createdBy: userId,
      },
    });
  }

  async createSchedule(tenantId: string, reportId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const now = new Date();
    const nextRun = this.calculateNextRun(dto.frequency, dto.cronExpression);
    return prismaAny.reportSchedule.create({
      data: {
        reportId,
        name: dto.name,
        frequency: dto.frequency,
        cronExpression: dto.cronExpression,
        timezone: dto.timezone || 'America/Sao_Paulo',
        recipients: dto.recipients || [],
        channels: dto.channels || ['email'],
        filters: (dto.filters as any) || {},
        lastRunAt: now,
        nextRunAt: nextRun,
        tenantId,
      },
    });
  }

  async getSchedules(tenantId: string, reportId?: string) {
    const prismaAny = this.prisma as any;
    const where: any = { tenantId };
    if (reportId) where.reportId = reportId;
    return prismaAny.reportSchedule.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async deleteSchedule(tenantId: string, scheduleId: string) {
    const prismaAny = this.prisma as any;
    await prismaAny.reportSchedule.deleteMany({ where: { id: scheduleId, tenantId } });
  }

  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [total, executionsToday, templates, schedules] = await Promise.all([
      prismaAny.report.count({ where: { tenantId } }),
      prismaAny.reportExecution.count({ where: { tenantId, createdAt: { gte: todayStart } } }),
      prismaAny.reportTemplate.count({ where: { tenantId, isActive: true } }),
      prismaAny.reportSchedule.count({ where: { tenantId, isEnabled: true } }),
    ]);
    return { total, executionsToday, templates, schedules };
  }

  private async generateReport(tenantId: string, report: any, format: string, dto: any) {
    const config = report.config || {};
    const type = report.type;
    const filters = dto.filters || report.filters || {};

    let data: any = {};
    switch (type) {
      case 'leads':
        data = await this.analyticsService.getKPIs(tenantId, filters);
        break;
      case 'pipeline':
        data = await this.analyticsService.getFunnel(tenantId, filters);
        break;
      case 'sales':
        data = await this.analyticsService.getDealsByOwner(tenantId, filters);
        break;
      case 'revenue':
        data = await this.analyticsService.getRevenueByPeriod(tenantId, filters);
        break;
      default:
        data = {
          message: `Report type "${type}" executed at ${new Date().toISOString()}`,
          filters,
          config,
        };
    }

    const outputUrl = `/exports/report-${(report as any).id}-${Date.now()}.${format}`;
    const fileSize = JSON.stringify(data).length;

    return { outputUrl, fileSize, data };
  }

  private calculateNextRun(frequency: string, _cronExpression?: string): Date {
    const now = new Date();
    switch (frequency) {
      case 'hourly':
        return new Date(now.getTime() + 3600000);
      case 'daily':
        return new Date(now.getTime() + 86400000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 86400000);
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
      default:
        return new Date(now.getTime() + 86400000);
    }
  }
}
