import { Logger } from '@nestjs/common';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventBusService } from '../../infrastructure/event-bus/event-bus.service';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import {
  SlaWarningEvent,
  SlaViolationEvent,
  SlaEscalatedEvent,
} from '../../infrastructure/event-bus/domain-events';

const SLA_QUEUE = 'sla-check';
const SLA_CHECK_JOB = 'sla-check';

export class SlaWorker {
  private readonly logger = new Logger(SlaWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly notificationsService: NotificationsService,
  ) {}

  register() {
    this.queueService.registerWorker(
      SLA_QUEUE,
      async (job) => {
        if (job.name === SLA_CHECK_JOB) {
          await this.processCheck();
          await this.queueService.addJob(SLA_QUEUE, SLA_CHECK_JOB, {}, { delay: 60000 });
        }
      },
      { concurrency: 1 },
    );

    this.logger.log('SLA Worker registered');
  }

  private async processCheck() {
    try {
      const tenants = await (this.prisma as any).tenant.findMany({
        select: { id: true },
      });

      for (const tenant of tenants) {
        await this.checkTenantSLAs(tenant.id);
      }
    } catch (error: any) {
      this.logger.error(`SLA check failed: ${error.message}`);
    }
  }

  private async checkTenantSLAs(tenantId: string) {
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

    for (const execution of executions) {
      const remainingMs = execution.deadlineAt.getTime() - now.getTime();
      const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
      const isBreached = remainingSeconds <= 0;

      if (isBreached) {
        await this.handleBreach(tenantId, execution);
      } else {
        await this.handleWarning(tenantId, execution, remainingSeconds);
      }
    }
  }

  private async handleWarning(tenantId: string, execution: any, remainingSeconds: number) {
    const existing = await (this.prisma as any).slaViolation.findFirst({
      where: { executionId: execution.id, violationType: 'warning', resolved: false },
    });

    if (existing) return;

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

    const existing = await (this.prisma as any).slaViolation.findFirst({
      where: { executionId: execution.id, violationType: 'breach', resolved: false },
    });

    if (!existing) {
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

    const admins = await (this.prisma as any).user.findMany({
      where: { tenantId, status: 'ACTIVE', role: 'admin' },
      select: { id: true },
      orderBy: { firstName: 'asc' },
    });

    const targetUserId = admins.length > 0 ? admins[(nextLevel - 1) % admins.length].id : null;

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
        body: `O ${execution.entityType} excedeu o SLA e foi escalonado.`,
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
  }
}
