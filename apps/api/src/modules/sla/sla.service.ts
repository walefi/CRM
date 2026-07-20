import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventBusService } from '../../infrastructure/event-bus/event-bus.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import {
  SlaWarningEvent,
  SlaViolationEvent,
  SlaEscalatedEvent,
  SlaResolvedEvent,
} from '../../infrastructure/event-bus/domain-events';
import { NotificationsService } from '../../modules/notifications/notifications.service';

const SLA_QUEUE = 'sla-check';

export interface SlaCheckResult {
  entityType: string;
  entityId: string;
  executionId: string;
  status: 'ok' | 'warning' | 'breached';
  deadlineAt: Date;
  remainingSeconds: number;
}

@Injectable()
export class SlaService {
  private readonly logger = new Logger(SlaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly queueService: QueueService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getRules(tenantId: string) {
    return (this.prisma as any).sLAPolicy.findMany({
      where: { tenantId },
      orderBy: { priority: 'asc' },
    });
  }

  async createRule(tenantId: string, dto: any) {
    return (this.prisma as any).sLAPolicy.create({
      data: {
        name: dto.name,
        priority: dto.priority || 'normal',
        firstResponse: dto.firstResponse || 300,
        resolution: dto.resolution || 3600,
        escalationAfter: dto.escalationAfter || 600,
        escalationLevel: dto.escalationLevel || 3,
        isActive: dto.isActive !== false,
        tenantId,
      },
    });
  }

  async updateRule(tenantId: string, id: string, dto: any) {
    const existing = await (this.prisma as any).sLAPolicy.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException(`SLA Rule ${id} not found`);

    return (this.prisma as any).sLAPolicy.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.firstResponse !== undefined && { firstResponse: dto.firstResponse }),
        ...(dto.resolution !== undefined && { resolution: dto.resolution }),
        ...(dto.escalationAfter !== undefined && { escalationAfter: dto.escalationAfter }),
        ...(dto.escalationLevel !== undefined && { escalationLevel: dto.escalationLevel }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deleteRule(tenantId: string, id: string) {
    const existing = await (this.prisma as any).sLAPolicy.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException(`SLA Rule ${id} not found`);
    await (this.prisma as any).sLAPolicy.delete({ where: { id } });
    return { success: true };
  }

  async startExecution(
    tenantId: string,
    entityType: string,
    entityId: string,
    slaPolicyId?: string,
  ) {
    const policy = slaPolicyId
      ? await (this.prisma as any).sLAPolicy.findFirst({ where: { id: slaPolicyId, tenantId } })
      : await (this.prisma as any).sLAPolicy.findFirst({
          where: { tenantId, isActive: true },
          orderBy: { priority: 'asc' },
        });

    if (!policy) {
      this.logger.warn(`No active SLA policy for tenant ${tenantId}`);
      return null;
    }

    const deadlineAt = new Date(Date.now() + policy.resolution * 1000);

    const execution = await (this.prisma as any).slaExecution.create({
      data: {
        entityType,
        entityId,
        slaPolicyId: policy.id,
        status: 'running',
        startedAt: new Date(),
        deadlineAt,
        tenantId,
      },
    });

    this.logger.log(`SLA execution started: ${execution.id} for ${entityType}/${entityId}`);

    return execution;
  }

  async resolveExecution(tenantId: string, entityType: string, entityId: string) {
    const execution = await (this.prisma as any).slaExecution.findFirst({
      where: { entityType, entityId, tenantId, status: 'running' },
    });

    if (!execution) return null;

    const now = new Date();
    const isWithinDeadline = execution.deadlineAt && now <= execution.deadlineAt;

    const updated = await (this.prisma as any).slaExecution.update({
      where: { id: execution.id },
      data: {
        status: isWithinDeadline ? 'met' : 'breached',
        resolvedAt: now,
        breachedAt: isWithinDeadline ? null : now,
      },
    });

    if (isWithinDeadline) {
      await this.eventBus.publish(
        new SlaResolvedEvent(
          { executionId: execution.id, entityType, entityId, resolvedInTime: true },
          tenantId,
        ),
      );
    }

    return updated;
  }

  async checkExpiring(tenantId: string): Promise<SlaCheckResult[]> {
    const now = new Date();
    const warningThreshold = new Date(now.getTime() + 300 * 1000);

    const executions = await (this.prisma as any).slaExecution.findMany({
      where: {
        tenantId,
        status: 'running',
        deadlineAt: { lte: warningThreshold },
      },
      include: { slaPolicy: true },
    });

    const results: SlaCheckResult[] = [];

    for (const execution of executions) {
      const remainingMs = execution.deadlineAt.getTime() - now.getTime();
      const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
      const isBreached = remainingSeconds <= 0;

      if (isBreached) {
        await this.handleBreach(tenantId, execution);
        results.push({
          entityType: execution.entityType,
          entityId: execution.entityId,
          executionId: execution.id,
          status: 'breached',
          deadlineAt: execution.deadlineAt,
          remainingSeconds: 0,
        });
      } else {
        await this.handleWarning(tenantId, execution, remainingSeconds);
        results.push({
          entityType: execution.entityType,
          entityId: execution.entityId,
          executionId: execution.id,
          status: 'warning',
          deadlineAt: execution.deadlineAt,
          remainingSeconds,
        });
      }
    }

    return results;
  }

  private async handleWarning(tenantId: string, execution: any, remainingSeconds: number) {
    const existingViolation = await (this.prisma as any).slaViolation.findFirst({
      where: {
        executionId: execution.id,
        violationType: 'warning',
        resolved: false,
      },
    });

    if (existingViolation) return;

    await (this.prisma as any).slaViolation.create({
      data: {
        executionId: execution.id,
        slaPolicyId: execution.slaPolicyId,
        entityType: execution.entityType,
        entityId: execution.entityId,
        violationType: 'warning',
        deadlineAt: execution.deadlineAt,
        severity: 'warning',
        tenantId,
      },
    });

    await this.eventBus.publish(
      new SlaWarningEvent(
        {
          executionId: execution.id,
          entityType: execution.entityType,
          entityId: execution.entityId,
          remainingSeconds,
          deadlineAt: execution.deadlineAt,
        },
        tenantId,
      ),
    );
  }

  private async handleBreach(tenantId: string, execution: any) {
    await (this.prisma as any).slaExecution.update({
      where: { id: execution.id },
      data: { status: 'breached', breachedAt: new Date() },
    });

    const existingViolation = await (this.prisma as any).slaViolation.findFirst({
      where: {
        executionId: execution.id,
        violationType: 'breach',
        resolved: false,
      },
    });

    if (!existingViolation) {
      await (this.prisma as any).slaViolation.create({
        data: {
          executionId: execution.id,
          slaPolicyId: execution.slaPolicyId,
          entityType: execution.entityType,
          entityId: execution.entityId,
          violationType: 'breach',
          deadlineAt: execution.deadlineAt,
          severity: 'critical',
          tenantId,
        },
      });
    }

    await this.eventBus.publish(
      new SlaViolationEvent(
        {
          executionId: execution.id,
          entityType: execution.entityType,
          entityId: execution.entityId,
          deadlineAt: execution.deadlineAt,
        },
        tenantId,
      ),
    );

    await this.executeEscalation(tenantId, execution);
  }

  private async executeEscalation(tenantId: string, execution: any) {
    const policy = execution.slaPolicy;
    if (!policy || policy.escalationLevel <= 0) return;

    const currentEscalations = await (this.prisma as any).slaEscalation.count({
      where: { entityType: execution.entityType, entityId: execution.entityId, tenantId },
    });

    const nextLevel = currentEscalations + 1;
    if (nextLevel > policy.escalationLevel) return;

    const targetUserId = await this.getEscalationTarget(tenantId, nextLevel);

    const escalation = await (this.prisma as any).slaEscalation.create({
      data: {
        executionId: execution.id,
        entityType: execution.entityType,
        entityId: execution.entityId,
        level: nextLevel,
        action: 'notify',
        targetUserId,
        status: 'pending',
        tenantId,
      },
    });

    if (targetUserId) {
      await this.notificationsService.send(tenantId, targetUserId, {
        title: `SLA Escalonamento Nível ${nextLevel}`,
        body: `O ${execution.entityType} excedeu o SLA e foi escalonado para nível ${nextLevel}.`,
        type: 'warning',
        channel: 'in_app',
        category: 'sla',
        url: `/${execution.entityType === 'ticket' ? 'tickets' : 'conversations'}/${execution.entityId}`,
        data: {
          executionId: execution.id,
          entityType: execution.entityType,
          entityId: execution.entityId,
          level: nextLevel,
        },
      });
    }

    await (this.prisma as any).slaEscalation.update({
      where: { id: escalation.id },
      data: { status: 'executed', executedAt: new Date() },
    });

    await this.eventBus.publish(
      new SlaEscalatedEvent(
        {
          executionId: execution.id,
          entityType: execution.entityType,
          entityId: execution.entityId,
          level: nextLevel,
          targetUserId,
        },
        tenantId,
      ),
    );

    this.logger.log(
      `SLA escalation level ${nextLevel} for ${execution.entityType}/${execution.entityId}`,
    );
  }

  private async getEscalationTarget(tenantId: string, level: number): Promise<string | null> {
    const admins = await (this.prisma as any).user.findMany({
      where: { tenantId, status: 'ACTIVE', role: 'admin' },
      select: { id: true },
      orderBy: { firstName: 'asc' },
    });

    if (admins.length === 0) return null;
    return admins[(level - 1) % admins.length].id;
  }

  async getViolations(tenantId: string, dto: any) {
    const where: any = { tenantId };
    if (dto.resolved !== undefined) where.resolved = dto.resolved === 'true';
    if (dto.entityType) where.entityType = dto.entityType;
    if (dto.severity) where.severity = dto.severity;

    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      (this.prisma as any).slaViolation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { violatedAt: 'desc' },
        include: { execution: true, slaPolicy: true },
      }),
      (this.prisma as any).slaViolation.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getStatistics(tenantId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [total, running, breached, met, violations, escalations] = await Promise.all([
      (this.prisma as any).slaExecution.count({ where: { tenantId } }),
      (this.prisma as any).slaExecution.count({ where: { tenantId, status: 'running' } }),
      (this.prisma as any).slaExecution.count({ where: { tenantId, status: 'breached' } }),
      (this.prisma as any).slaExecution.count({ where: { tenantId, status: 'met' } }),
      (this.prisma as any).slaViolation.count({
        where: { tenantId, violatedAt: { gte: todayStart } },
      }),
      (this.prisma as any).slaEscalation.count({
        where: { tenantId, createdAt: { gte: todayStart } },
      }),
    ]);

    const complianceRate = total > 0 ? ((met / total) * 100).toFixed(1) : '0.0';

    return {
      total,
      running,
      breached,
      met,
      violationsToday: violations,
      escalationsToday: escalations,
      complianceRate,
    };
  }

  async getExecutions(tenantId: string, dto: any) {
    const where: any = { tenantId };
    if (dto.status) where.status = dto.status;
    if (dto.entityType) where.entityType = dto.entityType;

    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      (this.prisma as any).slaExecution.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { slaPolicy: true, violations: true },
      }),
      (this.prisma as any).slaExecution.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async scheduleCheck() {
    try {
      await this.queueService.addJob(SLA_QUEUE, 'sla-check', {}, { delay: 60000 });
      this.logger.log('SLA check scheduled');
    } catch (error: any) {
      this.logger.warn(`Failed to schedule SLA check: ${error.message}`);
    }
  }
}
