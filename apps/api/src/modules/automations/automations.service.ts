import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventBusService } from '../../infrastructure/event-bus/event-bus.service';
import { BaseDomainEvent } from '../../infrastructure/event-bus/domain-events';
import { WorkflowsService } from '../workflows/workflows.service';
import {
  CreateAutomationDto,
  UpdateAutomationDto,
  AutomationFilterDto,
  RunAutomationDto,
  TestAutomationDto,
  CreateAutomationTemplateDto,
} from './dto/automations.dto';
@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly workflowsService: WorkflowsService,
  ) {}

  async findAll(tenantId: string, dto: AutomationFilterDto) {
    const prismaAny = this.prisma as any;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };

    if (dto.status) {
      where.status = dto.status;
    }

    if (dto.search) {
      const s = dto.search;
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
      ];
    }

    const page = dto.page || 1;
    const limit = dto.limit || 15;
    const skip = (page - 1) * limit;
    const orderBy: Record<string, string> = dto.sortBy
      ? { [dto.sortBy]: dto.sortOrder || 'desc' }
      : { createdAt: 'desc' };

    const [data, total] = await this.prisma.$transaction([
      prismaAny.automation.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          priority: true,
          cooldown: true,
          maxRetries: true,
          tags: true,
          config: true,
          lastRunAt: true,
          runCount: true,
          tenantId: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prismaAny.automation.count({ where }),
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

  async findById(id: string, tenantId: string) {
    const prismaAny = this.prisma as any;

    const automation = await prismaAny.automation.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        triggers: true,
        conditions: { orderBy: { sortOrder: 'asc' } },
        actions: { orderBy: { sortOrder: 'asc' } },
        schedules: true,
        variables: true,
      },
    });

    if (!automation) {
      throw new NotFoundException(`Automation ${id} not found`);
    }

    return automation;
  }

  async create(tenantId: string, userId: string, dto: CreateAutomationDto) {
    const prismaAny = this.prisma as any;

    const automation = await prismaAny.automation.create({
      data: {
        name: dto.name,
        description: dto.description,
        priority: dto.priority || 0,
        cooldown: dto.cooldown || 0,
        maxRetries: dto.maxRetries ?? 3,
        tags: dto.tags || [],
        config: (dto.config as any) || {},
        tenantId,
        createdBy: userId,
        triggers: dto.triggers?.length
          ? {
              create: dto.triggers.map((t) => ({
                type: t.type,
                config: (t.config as any) || {},
                isEnabled: t.isEnabled ?? true,
              })),
            }
          : undefined,
        conditions: dto.conditions?.length
          ? {
              create: dto.conditions.map((c) => ({
                field: c.field,
                operator: c.operator,
                value: c.value,
                logic: c.logic || 'AND',
                groupId: c.groupId,
                sortOrder: c.sortOrder || 0,
              })),
            }
          : undefined,
        actions: dto.actions?.length
          ? {
              create: dto.actions.map((a) => ({
                type: a.type,
                config: (a.config as any) || {},
                sortOrder: a.sortOrder || 0,
                delay: a.delay || 0,
                isEnabled: a.isEnabled ?? true,
              })),
            }
          : undefined,
        schedules: dto.schedules?.length
          ? {
              create: dto.schedules.map((s) => ({
                name: s.name,
                frequency: s.frequency,
                cronExpression: s.cronExpression,
                interval: s.interval,
                startAt: s.startAt ? new Date(s.startAt) : undefined,
                endAt: s.endAt ? new Date(s.endAt) : undefined,
                timezone: s.timezone || 'America/Sao_Paulo',
                isEnabled: s.isEnabled ?? true,
                config: (s.config as any) || {},
                tenantId,
              })),
            }
          : undefined,
        variables: dto.variables?.length
          ? {
              create: dto.variables.map((v) => ({
                name: v.name,
                key: v.key,
                value: v.value,
                type: v.type || 'string',
                isSecret: v.isSecret || false,
                tenantId,
              })),
            }
          : undefined,
      },
      include: {
        triggers: true,
        conditions: { orderBy: { sortOrder: 'asc' } },
        actions: { orderBy: { sortOrder: 'asc' } },
        schedules: true,
        variables: true,
      },
    });

    this.eventBus
      .publish(
        new BaseDomainEvent({
          eventName: 'automation.created',
          aggregateType: 'Automation',
          aggregateId: automation.id,
          payload: { id: automation.id, name: automation.name },
          tenantId,
          userId,
        }),
      )
      .catch((error: any) => this.logger.warn(`Failed to publish automation.created event: ${error.message}`));

    this.logger.log(`Automation "${automation.name}" created by ${userId}`);
    return automation;
  }

  async update(id: string, tenantId: string, dto: UpdateAutomationDto) {
    const prismaAny = this.prisma as any;

    await this.findById(id, tenantId);

    const updateData: Record<string, unknown> = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.cooldown !== undefined) updateData.cooldown = dto.cooldown;
    if (dto.maxRetries !== undefined) updateData.maxRetries = dto.maxRetries;
    if (dto.tags !== undefined) updateData.tags = dto.tags;
    if (dto.config !== undefined) updateData.config = dto.config as any;

    await prismaAny.automation.update({
      where: { id },
      data: updateData,
    });

    if (dto.triggers !== undefined) {
      await prismaAny.trigger.deleteMany({ where: { automationId: id } });
      if (dto.triggers.length > 0) {
        await prismaAny.trigger.createMany({
          data: dto.triggers.map((t) => ({
            automationId: id,
            type: t.type,
            config: (t.config as any) || {},
            isEnabled: t.isEnabled ?? true,
          })),
        });
      }
    }

    if (dto.conditions !== undefined) {
      await prismaAny.condition.deleteMany({ where: { automationId: id } });
      if (dto.conditions.length > 0) {
        await prismaAny.condition.createMany({
          data: dto.conditions.map((c) => ({
            automationId: id,
            field: c.field,
            operator: c.operator,
            value: c.value,
            logic: c.logic || 'AND',
            groupId: c.groupId,
            sortOrder: c.sortOrder || 0,
          })),
        });
      }
    }

    if (dto.actions !== undefined) {
      await prismaAny.action.deleteMany({ where: { automationId: id } });
      if (dto.actions.length > 0) {
        await prismaAny.action.createMany({
          data: dto.actions.map((a) => ({
            automationId: id,
            type: a.type,
            config: (a.config as any) || {},
            sortOrder: a.sortOrder || 0,
            delay: a.delay || 0,
            isEnabled: a.isEnabled ?? true,
          })),
        });
      }
    }

    if (dto.schedules !== undefined) {
      await prismaAny.automationSchedule.deleteMany({ where: { automationId: id } });
      if (dto.schedules.length > 0) {
        await prismaAny.automationSchedule.createMany({
          data: dto.schedules.map((s) => ({
            automationId: id,
            name: s.name,
            frequency: s.frequency,
            cronExpression: s.cronExpression,
            interval: s.interval,
            startAt: s.startAt ? new Date(s.startAt) : undefined,
            endAt: s.endAt ? new Date(s.endAt) : undefined,
            timezone: s.timezone || 'America/Sao_Paulo',
            isEnabled: s.isEnabled ?? true,
            config: (s.config as any) || {},
            tenantId,
          })),
        });
      }
    }

    if (dto.variables !== undefined) {
      await prismaAny.automationVariable.deleteMany({ where: { automationId: id } });
      if (dto.variables.length > 0) {
        await prismaAny.automationVariable.createMany({
          data: dto.variables.map((v) => ({
            automationId: id,
            name: v.name,
            key: v.key,
            value: v.value,
            type: v.type || 'string',
            isSecret: v.isSecret || false,
            tenantId,
          })),
        });
      }
    }

    return this.findById(id, tenantId);
  }

  async remove(id: string, tenantId: string) {
    const prismaAny = this.prisma as any;

    await this.findById(id, tenantId);
    await prismaAny.automation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    this.logger.log(`Automation ${id} soft-deleted`);
  }

  async publish(id: string, tenantId: string, userId: string) {
    const prismaAny = this.prisma as any;

    await this.findById(id, tenantId);

    const automation = await prismaAny.automation.update({
      where: { id },
      data: { status: 'ACTIVE' },
      include: { triggers: true },
    });

    this.eventBus
      .publish(
        new BaseDomainEvent({
          eventName: 'automation.published',
          aggregateType: 'Automation',
          aggregateId: id,
          payload: { id, name: automation.name },
          tenantId,
          userId,
        }),
      )
      .catch((error: any) => this.logger.warn(`Failed to publish automation.published event: ${error.message}`));

    this.logger.log(`Automation "${automation.name}" published by ${userId}`);
    return automation;
  }

  async duplicate(id: string, tenantId: string, userId: string) {
    const prismaAny = this.prisma as any;
    const original = await this.findById(id, tenantId);

    const duplicated = await prismaAny.automation.create({
      data: {
        name: `${(original as any).name} (Copy)`,
        description: (original as any).description,
        status: 'DRAFT',
        priority: (original as any).priority,
        cooldown: (original as any).cooldown,
        maxRetries: (original as any).maxRetries,
        tags: [...((original as any).tags || [])],
        config: (original as any).config ? { ...((original as any).config as object) } : {},
        tenantId,
        createdBy: userId,
        triggers: (original as any).triggers?.length
          ? {
              create: (original as any).triggers.map((t: any) => ({
                type: t.type,
                config: t.config ? { ...(t.config as object) } : {},
                isEnabled: t.isEnabled,
              })),
            }
          : undefined,
        conditions: (original as any).conditions?.length
          ? {
              create: (original as any).conditions.map((c: any) => ({
                field: c.field,
                operator: c.operator,
                value: c.value,
                logic: c.logic,
                groupId: c.groupId,
                sortOrder: c.sortOrder,
              })),
            }
          : undefined,
        actions: (original as any).actions?.length
          ? {
              create: (original as any).actions.map((a: any) => ({
                type: a.type,
                config: a.config ? { ...(a.config as object) } : {},
                sortOrder: a.sortOrder,
                delay: a.delay,
                isEnabled: a.isEnabled,
              })),
            }
          : undefined,
        schedules: (original as any).schedules?.length
          ? {
              create: (original as any).schedules.map((s: any) => ({
                name: s.name,
                frequency: s.frequency,
                cronExpression: s.cronExpression,
                interval: s.interval,
                startAt: s.startAt,
                endAt: s.endAt,
                timezone: s.timezone,
                isEnabled: s.isEnabled,
                config: s.config ? { ...(s.config as object) } : {},
                tenantId,
              })),
            }
          : undefined,
        variables: (original as any).variables?.length
          ? {
              create: (original as any).variables.map((v: any) => ({
                name: v.name,
                key: v.key,
                value: v.value,
                type: v.type,
                isSecret: v.isSecret,
                tenantId,
              })),
            }
          : undefined,
      },
      include: {
        triggers: true,
        conditions: { orderBy: { sortOrder: 'asc' } },
        actions: { orderBy: { sortOrder: 'asc' } },
        schedules: true,
        variables: true,
      },
    });

    this.logger.log(
      `Automation "${(original as any).name}" duplicated as "${(duplicated as any).name}" by ${userId}`,
    );
    return duplicated;
  }

  async run(id: string, tenantId: string, userId: string, dto: RunAutomationDto) {
    const prismaAny = this.prisma as any;
    const automation = (await this.findById(id, tenantId)) as any;
    const triggerType = dto.trigger || 'MANUAL';
    const input = dto.input || {};
    const maxRetries = (automation.maxRetries as number) ?? 3;

    const execution = await prismaAny.automationExecution.create({
      data: {
        automationId: id,
        tenantId,
        createdBy: userId,
        trigger: triggerType,
        input: input as any,
        status: 'PENDING',
        maxRetries,
        correlationId: crypto.randomUUID(),
      },
    });

    try {
      await prismaAny.automationExecution.update({
        where: { id: execution.id },
        data: { status: 'RUNNING', startedAt: new Date() },
      });

      await this.logExecution(
        automation.id,
        execution.id,
        tenantId,
        userId,
        'INFO',
        `Execution started via ${triggerType}`,
      );

      const context = this.buildContext(input, automation);

      const conditionsPassed = this.evaluateConditions(automation.conditions || [], context);

      if (!conditionsPassed) {
        await prismaAny.automationExecution.update({
          where: { id: execution.id },
          data: { status: 'SKIPPED', completedAt: new Date(), error: 'Conditions not met' },
        });
        await this.logExecution(
          automation.id,
          execution.id,
          tenantId,
          userId,
          'INFO',
          'Conditions not met - execution skipped',
        );
        return prismaAny.automationExecution.findUnique({ where: { id: execution.id } });
      }

      await this.logExecution(
        automation.id,
        execution.id,
        tenantId,
        userId,
        'INFO',
        `${automation.conditions?.length || 0} conditions evaluated: passed`,
      );

      const actionResults: Record<string, unknown>[] = [];
      const sortedActions = (automation.actions || [])
        .filter((a: any) => a.isEnabled)
        .sort((a: any, b: any) => a.sortOrder - b.sortOrder);

      for (const action of sortedActions) {
        if (action.delay && action.delay > 0) {
          await this.sleep(Math.min(action.delay, 60000));
        }

        let actionSuccess = false;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            const result = await this.executeAction(action, context, tenantId, userId);
            actionResults.push({ actionId: action.id, type: action.type, success: true, result });
            actionSuccess = true;
            await this.logExecution(
              automation.id,
              execution.id,
              tenantId,
              userId,
              'INFO',
              `Action executed: ${action.type}${attempt > 0 ? ` (retry ${attempt})` : ''}`,
            );
            break;
          } catch (error: any) {
            lastError = error;
            this.logger.error(
              `Action ${action.type} failed (attempt ${attempt + 1}/${maxRetries + 1}): ${error.message}`,
            );
            await this.logExecution(
              automation.id,
              execution.id,
              tenantId,
              userId,
              'WARN',
              `Action ${action.type} failed (attempt ${attempt + 1}): ${error.message}`,
            );

            if (attempt < maxRetries) {
              const backoff = Math.min(1000 * Math.pow(2, attempt), 30000);
              await this.sleep(backoff);
            }
          }
        }

        if (!actionSuccess) {
          actionResults.push({
            actionId: action.id,
            type: action.type,
            success: false,
            error: lastError?.message,
          });
          await this.logExecution(
            automation.id,
            execution.id,
            tenantId,
            userId,
            'ERROR',
            `Action ${action.type} failed after all retries: ${lastError?.message}`,
          );

          if ((automation.config as any)?.stopOnError) {
            throw lastError;
          }
        }
      }

      const existingExec = await prismaAny.automationExecution.findUnique({
        where: { id: execution.id },
      });
      const startedAt = existingExec?.startedAt;
      const completedAt = new Date();
      const duration = startedAt
        ? Math.round((completedAt.getTime() - new Date(startedAt).getTime()) / 1000)
        : 0;

      await prismaAny.automationExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          completedAt,
          duration,
          result: actionResults as any,
        },
      });

      await prismaAny.automation.update({
        where: { id },
        data: { lastRunAt: completedAt, runCount: { increment: 1 } },
      });

      this.eventBus
        .publish(
          new BaseDomainEvent({
            eventName: 'automation.execution.completed',
            aggregateType: 'AutomationExecution',
            aggregateId: execution.id,
            payload: { executionId: execution.id, automationId: id, status: 'COMPLETED' },
            tenantId,
            userId,
          }),
        )
        .catch((error: any) => this.logger.warn(`Failed to publish automation.execution.completed event: ${error.message}`));

      this.logger.log(`Automation ${id} execution ${execution.id} completed`);
      return prismaAny.automationExecution.findUnique({ where: { id: execution.id } });
    } catch (error: any) {
      const existingExec = await prismaAny.automationExecution.findUnique({
        where: { id: execution.id },
      });
      const startedAt = existingExec?.startedAt;
      const completedAt = new Date();
      const duration = startedAt
        ? Math.round((completedAt.getTime() - new Date(startedAt).getTime()) / 1000)
        : 0;

      await prismaAny.automationExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          completedAt,
          duration,
          error: error.message,
        },
      });

      this.eventBus
        .publish(
          new BaseDomainEvent({
            eventName: 'automation.execution.failed',
            aggregateType: 'AutomationExecution',
            aggregateId: execution.id,
            payload: { executionId: execution.id, automationId: id, error: error.message },
            metadata: { error: error.message },
            tenantId,
            userId,
          }),
        )
        .catch((err: any) => this.logger.warn(`Failed to publish automation.execution.failed event: ${err.message}`));

      this.logger.error(`Automation ${id} execution ${execution.id} failed: ${error.message}`);
      return prismaAny.automationExecution.findUnique({ where: { id: execution.id } });
    }
  }

  async test(id: string, tenantId: string, dto: TestAutomationDto) {
    const automation = (await this.findById(id, tenantId)) as any;
    const context = this.buildContext(dto.input, automation);

    const conditionsPassed = this.evaluateConditions(automation.conditions || [], context);

    if (!conditionsPassed) {
      return {
        automationId: id,
        automationName: automation.name,
        trigger: dto.trigger,
        input: dto.input,
        conditionsPassed: false,
        actionsExecuted: [],
        success: false,
        message: 'Conditions not met',
      };
    }

    const actionResults: Record<string, unknown>[] = [];
    const sortedActions = (automation.actions || [])
      .filter((a: any) => a.isEnabled)
      .sort((a: any, b: any) => a.sortOrder - b.sortOrder);

    for (const action of sortedActions) {
      this.logger.debug(`[TEST] Would execute action: ${action.type} with config:`, action.config);
      actionResults.push({
        actionId: action.id,
        type: action.type,
        config: action.config,
        simulated: true,
      });
    }

    return {
      automationId: id,
      automationName: automation.name,
      trigger: dto.trigger,
      input: dto.input,
      conditionsPassed: true,
      conditionsCount: automation.conditions?.length || 0,
      actionsCount: sortedActions.length,
      actionsExecuted: actionResults,
      success: true,
      message: `Would execute ${sortedActions.length} actions`,
    };
  }

  async getLogs(tenantId: string, automationId?: string, page: number = 1, limit: number = 50) {
    const prismaAny = this.prisma as any;
    const where: Record<string, unknown> = { tenantId };
    if (automationId) where.automationId = automationId;

    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      prismaAny.automationLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prismaAny.automationLog.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getHistory(tenantId: string, automationId?: string, page: number = 1, limit: number = 15) {
    const prismaAny = this.prisma as any;
    const where: Record<string, unknown> = { tenantId };
    if (automationId) where.automationId = automationId;

    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      prismaAny.automationExecution.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          automation: { select: { id: true, name: true } },
        },
      }),
      prismaAny.automationExecution.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTemplates(tenantId: string) {
    return (this.prisma as any).automationTemplate.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      total,
      active,
      draft,
      paused,
      errorCount,
      executionsToday,
      failedLast24h,
      totalExecutions,
    ] = await Promise.all([
      prismaAny.automation.count({ where: { tenantId, deletedAt: null } }),
      prismaAny.automation.count({ where: { tenantId, status: 'ACTIVE', deletedAt: null } }),
      prismaAny.automation.count({ where: { tenantId, status: 'DRAFT', deletedAt: null } }),
      prismaAny.automation.count({ where: { tenantId, status: 'PAUSED', deletedAt: null } }),
      prismaAny.automation.count({ where: { tenantId, status: 'ERROR', deletedAt: null } }),
      prismaAny.automationExecution.count({
        where: { tenantId, createdAt: { gte: todayStart } },
      }),
      prismaAny.automationExecution.count({
        where: { tenantId, status: 'FAILED', createdAt: { gte: last24h } },
      }),
      prismaAny.automationExecution.count({ where: { tenantId } }),
    ]);

    const avgDurationResult = await prismaAny.automationExecution.aggregate({
      where: { tenantId, duration: { not: null } },
      _avg: { duration: true },
    });

    const statusDistribution = await prismaAny.automation.groupBy({
      by: ['status'],
      where: { tenantId, deletedAt: null },
      _count: true,
    });

    const mostExecuted = await prismaAny.automationExecution.groupBy({
      by: ['automationId'],
      where: { tenantId },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const mostFrequentTriggers = await prismaAny.automationExecution.groupBy({
      by: ['trigger'],
      where: { tenantId, trigger: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    return {
      total,
      active,
      draft,
      paused,
      error: errorCount,
      executionsToday,
      failedLast24h,
      totalExecutions,
      avgDurationMs: avgDurationResult?._avg?.duration
        ? Math.round(avgDurationResult._avg.duration * 1000)
        : 0,
      statusDistribution,
      mostExecuted,
      mostFrequentTriggers,
    };
  }

  async createFromTemplate(tenantId: string, userId: string, templateId: string) {
    const prismaAny = this.prisma as any;
    const template = await prismaAny.automationTemplate.findFirst({
      where: { id: templateId, tenantId },
    });

    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    const dto: CreateAutomationDto = {
      name: template.name,
      description: template.description || undefined,
      config: template.config as Record<string, unknown>,
      tags: [template.category || 'template'],
      triggers: (template.triggers as any[]) || [],
      conditions: (template.conditions as any[]) || [],
      actions: (template.actions as any[]) || [],
      schedules: (template.schedules as any[]) || [],
      variables: (template.variables as any[]) || [],
    };

    return this.create(tenantId, userId, dto);
  }

  async createTemplate(tenantId: string, userId: string, dto: CreateAutomationTemplateDto) {
    const prismaAny = this.prisma as any;

    const template = await prismaAny.automationTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        icon: dto.icon,
        config: dto.config as any,
        triggers: dto.triggers as any,
        conditions: dto.conditions as any,
        actions: dto.actions as any,
        schedules: dto.schedules as any,
        variables: dto.variables as any,
        tenantId,
        createdBy: userId,
      },
    });

    this.logger.log(`Automation template "${template.name}" created by ${userId}`);
    return template;
  }

  private buildContext(input: Record<string, unknown>, automation: any): Record<string, unknown> {
    const context: Record<string, unknown> = { ...input };

    if (automation.variables?.length) {
      for (const v of automation.variables) {
        context[v.key] = v.isSecret ? '[SECRET]' : v.value;
      }
    }

    return context;
  }

  private evaluateConditions(conditions: any[], context: Record<string, unknown>): boolean {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    const groups = new Map<string, any[]>();
    const ungrouped: any[] = [];

    for (const condition of conditions) {
      if (condition.groupId) {
        if (!groups.has(condition.groupId)) {
          groups.set(condition.groupId, []);
        }
        groups.get(condition.groupId)!.push(condition);
      } else {
        ungrouped.push(condition);
      }
    }

    let globalLogic = 'AND';
    if (ungrouped.length > 0) {
      globalLogic = ungrouped[0].logic || 'AND';
    } else if (groups.size > 0) {
      const firstGroup = groups.values().next().value as any[];
      globalLogic = firstGroup[0]?.logic || 'AND';
    }

    const results: boolean[] = [];

    for (const condition of ungrouped) {
      results.push(this.evaluateSingleCondition(condition, context));
    }

    for (const [, groupConditions] of groups) {
      const groupLogic = groupConditions[0]?.logic || 'AND';
      const groupResults = groupConditions.map((c: any) =>
        this.evaluateSingleCondition(c, context),
      );

      if (groupLogic === 'OR') {
        results.push(groupResults.some(Boolean));
      } else {
        results.push(groupResults.every(Boolean));
      }
    }

    if (globalLogic === 'OR') {
      return results.some(Boolean);
    }
    return results.every(Boolean);
  }

  private evaluateSingleCondition(condition: any, context: Record<string, unknown>): boolean {
    const rawValue = this.resolveFieldValue(condition.field, context);
    const comparisonValue = condition.value;
    const operator = condition.operator;

    const fieldStr = rawValue !== null && rawValue !== undefined ? String(rawValue) : '';
    const fieldNum = parseFloat(fieldStr);
    const isNumeric = !isNaN(fieldNum) && !isNaN(parseFloat(comparisonValue));

    switch (operator) {
      case 'EQUALS':
        return fieldStr === comparisonValue;
      case 'NOT_EQUALS':
        return fieldStr !== comparisonValue;
      case 'GREATER_THAN':
        if (isNumeric) return fieldNum > parseFloat(comparisonValue);
        return fieldStr > comparisonValue;
      case 'LESS_THAN':
        if (isNumeric) return fieldNum < parseFloat(comparisonValue);
        return fieldStr < comparisonValue;
      case 'GREATER_OR_EQUAL':
        if (isNumeric) return fieldNum >= parseFloat(comparisonValue);
        return fieldStr >= comparisonValue;
      case 'LESS_OR_EQUAL':
        if (isNumeric) return fieldNum <= parseFloat(comparisonValue);
        return fieldStr <= comparisonValue;
      case 'CONTAINS':
        return fieldStr.toLowerCase().includes(comparisonValue.toLowerCase());
      case 'NOT_CONTAINS':
        return !fieldStr.toLowerCase().includes(comparisonValue.toLowerCase());
      case 'STARTS_WITH':
        return fieldStr.toLowerCase().startsWith(comparisonValue.toLowerCase());
      case 'ENDS_WITH':
        return fieldStr.toLowerCase().endsWith(comparisonValue.toLowerCase());
      case 'IS_EMPTY':
        return rawValue === null || rawValue === undefined || fieldStr.trim() === '';
      case 'IS_NOT_EMPTY':
        return rawValue !== null && rawValue !== undefined && fieldStr.trim() !== '';
      case 'IN':
        try {
          const list = JSON.parse(comparisonValue);
          if (Array.isArray(list)) return list.some((v: unknown) => String(v) === fieldStr);
        } catch {
          /* noop */
        }
        return comparisonValue.split(',').some((v: string) => v.trim() === fieldStr);
      case 'NOT_IN':
        try {
          const list = JSON.parse(comparisonValue);
          if (Array.isArray(list)) return !list.some((v: unknown) => String(v) === fieldStr);
        } catch {
          /* noop */
        }
        return !comparisonValue.split(',').some((v: string) => v.trim() === fieldStr);
      case 'BETWEEN':
        try {
          const [min, max] = JSON.parse(comparisonValue);
          if (isNumeric) return fieldNum >= parseFloat(min) && fieldNum <= parseFloat(max);
          return fieldStr >= String(min) && fieldStr <= String(max);
        } catch {
          /* noop */
        }
        return false;
      case 'REGEX':
        try {
          return new RegExp(comparisonValue).test(fieldStr);
        } catch {
          return false;
        }
      case 'BEFORE':
        return new Date(fieldStr) < new Date(comparisonValue);
      case 'AFTER':
        return new Date(fieldStr) > new Date(comparisonValue);
      case 'IS_TRUE':
        return fieldStr === 'true' || fieldStr === '1' || fieldStr === 'yes';
      case 'IS_FALSE':
        return fieldStr === 'false' || fieldStr === '0' || fieldStr === 'no';
      default:
        this.logger.warn(`Unknown condition operator: ${operator}`);
        return false;
    }
  }

  private resolveFieldValue(field: string, context: Record<string, unknown>): unknown {
    if (field in context) {
      return context[field];
    }

    const parts = field.split('.');
    let current: any = context;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    return current;
  }

  private async executeAction(
    action: any,
    context: Record<string, unknown>,
    tenantId: string,
    userId: string,
  ): Promise<Record<string, unknown>> {
    const config = action.config || {};

    switch (action.type) {
      case 'SEND_EMAIL': {
        const notification = await this.prisma.notification.create({
          data: {
            title: (config.subject as string) || (config.title as string) || 'Automation Email',
            message: (config.body as string) || (config.body as string) || '',
            user: { connect: { id: (config.toUserId as string) || userId } },
            type: 'EMAIL',
            tenantId,
          } as any,
        });
        this.logger.log(`SEND_EMAIL: notification ${(notification as any).id} created`);
        return {
          notificationId: (notification as any).id,
          to: config.to || config.toUserId || userId,
        };
      }

      case 'CREATE_TASK': {
        const taskData: Record<string, unknown> = {
          title: (config.title as string) || 'Automation task',
          tenantId,
          createdBy: userId,
        };
        if (config.description) taskData.description = config.description;
        if (config.ownerId || context.ownerId)
          taskData.ownerId = (config.ownerId || context.ownerId) as string;
        if (config.dueDate) taskData.dueDate = new Date(config.dueDate as string);
        if (config.priority) taskData.priority = config.priority;
        if (config.relatedEntityId) taskData.relatedEntityId = config.relatedEntityId;
        if (config.relatedEntityType) taskData.relatedEntityType = config.relatedEntityType;

        const task = await (this.prisma as any).task.create({ data: taskData });
        this.logger.log(`CREATE_TASK: task ${(task as any).id} created`);
        return { taskId: (task as any).id };
      }

      case 'UPDATE_DEAL': {
        const dealId = (config.dealId as string) || (context.dealId as string);
        if (!dealId) throw new Error('Missing dealId for UPDATE_DEAL');

        const dealData: Record<string, unknown> = {};
        if (config.title) dealData.title = config.title;
        if (config.value !== undefined) dealData.value = config.value;
        if (config.stageId) dealData.stageId = config.stageId;
        if (config.ownerId) dealData.ownerId = config.ownerId;
        if (config.expectedCloseDate)
          dealData.expectedCloseDate = new Date(config.expectedCloseDate as string);
        if (config.status) dealData.status = config.status;

        const deal = await this.prisma.deal.update({
          where: { id: dealId },
          data: dealData as any,
        });
        this.logger.log(`UPDATE_DEAL: deal ${dealId} updated`);
        return { dealId: deal.id, updatedFields: Object.keys(dealData) };
      }

      case 'SEND_NOTIFICATION': {
        const notification = await this.prisma.notification.create({
          data: {
            title: (config.title as string) || 'Automation notification',
            message: (config.message as string) || (config.body as string) || '',
            user: { connect: { id: (config.targetUserId as string) || userId } },
            type: (config.notificationType as string) || 'INFO',
            tenantId,
          } as any,
        });
        this.logger.log(`SEND_NOTIFICATION: notification ${(notification as any).id} created`);
        return { notificationId: (notification as any).id };
      }

      case 'WEBHOOK': {
        const url = config.url as string;
        const method = (config.method as string) || 'POST';
        const headers = (config.headers as Record<string, string>) || {};
        this.logger.log(`WEBHOOK: ${method} ${url}`);
        try {
          const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', ...headers },
            body: config.body ? JSON.stringify(config.body) : undefined,
          });
          return { url, method, status: response.status };
        } catch (error: any) {
          this.logger.warn(`Webhook call failed: ${error.message}`);
          return { url, method, status: 'error', error: error.message };
        }
      }

      case 'UPDATE_CONTACT': {
        const contactId = (config.contactId as string) || (context.contactId as string);
        if (!contactId) throw new Error('Missing contactId for UPDATE_CONTACT');

        const contactData: Record<string, unknown> = {};
        if (config.firstName) contactData.firstName = config.firstName;
        if (config.lastName) contactData.lastName = config.lastName;
        if (config.email) contactData.email = config.email;
        if (config.phone) contactData.phone = config.phone;
        if (config.companyId) contactData.companyId = config.companyId;
        if (config.ownerId) contactData.ownerId = config.ownerId;

        const contact = await this.prisma.contact.update({
          where: { id: contactId },
          data: contactData as any,
        });
        this.logger.log(`UPDATE_CONTACT: contact ${contactId} updated`);
        return { contactId: contact.id, updatedFields: Object.keys(contactData) };
      }

      case 'MOVE_PIPELINE': {
        const dealId = (config.dealId as string) || (context.dealId as string);
        const targetStageId = (config.targetStageId as string) || (config.stageId as string);
        if (!dealId || !targetStageId)
          throw new Error('Missing dealId or targetStageId for MOVE_PIPELINE');

        await this.prisma.deal.update({ where: { id: dealId }, data: { stageId: targetStageId } });
        this.logger.log(`MOVE_PIPELINE: deal ${dealId} moved to stage ${targetStageId}`);
        return { dealId, targetStageId };
      }

      case 'CREATE_LEAD': {
        const leadData: Record<string, unknown> = {
          firstName: (config.firstName as string) || (context.firstName as string) || 'Unknown',
          lastName: (config.lastName as string) || (context.lastName as string) || 'Lead',
          tenantId,
          ownerId: (config.ownerId as string) || userId,
        };
        if (config.email || context.email)
          leadData.email = (config.email || context.email) as string;
        if (config.phone || context.phone)
          leadData.phone = (config.phone || context.phone) as string;
        if (config.companyName || context.companyName)
          leadData.companyName = (config.companyName || context.companyName) as string;
        if (config.source) leadData.source = config.source;
        if (config.value !== undefined) leadData.value = config.value;
        if (config.description) leadData.description = config.description;
        if (config.status) leadData.status = config.status;

        const lead = await this.prisma.lead.create({ data: leadData as any });
        this.logger.log(`CREATE_LEAD: lead ${(lead as any).id} created`);
        return { leadId: (lead as any).id };
      }

      case 'CREATE_CONTACT': {
        const contactData: Record<string, unknown> = {
          firstName: (config.firstName as string) || (context.firstName as string) || 'Unknown',
          lastName: (config.lastName as string) || (context.lastName as string) || 'Contact',
          tenantId,
          ownerId: (config.ownerId as string) || userId,
        };
        if (config.email || context.email)
          contactData.email = (config.email || context.email) as string;
        if (config.phone || context.phone)
          contactData.phone = (config.phone || context.phone) as string;
        if (config.companyId || context.companyId)
          contactData.companyId = (config.companyId || context.companyId) as string;
        if (config.description) contactData.description = config.description;

        const contact = await this.prisma.contact.create({ data: contactData as any });
        this.logger.log(`CREATE_CONTACT: contact ${(contact as any).id} created`);
        return { contactId: (contact as any).id };
      }

      case 'CREATE_COMPANY': {
        const companyData: Record<string, unknown> = {
          name: (config.name as string) || (context.companyName as string) || 'New Company',
          tenantId,
          ownerId: (config.ownerId as string) || userId,
        };
        if (config.email || context.email)
          companyData.email = (config.email || context.email) as string;
        if (config.phone || context.phone)
          companyData.phone = (config.phone || context.phone) as string;
        if (config.website) companyData.website = config.website;
        if (config.industry) companyData.industry = config.industry;
        if (config.address) companyData.address = config.address;

        const company = await this.prisma.company.create({ data: companyData as any });
        this.logger.log(`CREATE_COMPANY: company ${(company as any).id} created`);
        return { companyId: (company as any).id };
      }

      case 'CREATE_DEAL': {
        const dealData: Record<string, unknown> = {
          title: (config.title as string) || 'Automation deal',
          tenantId,
          ownerId: (config.ownerId as string) || userId,
        };
        if (config.value !== undefined) dealData.value = config.value;
        if (config.companyId || context.companyId)
          dealData.companyId = (config.companyId || context.companyId) as string;
        if (config.contactId || context.contactId)
          dealData.contactId = (config.contactId || context.contactId) as string;
        if (config.pipelineId) dealData.pipelineId = config.pipelineId;
        if (config.stageId) dealData.stageId = config.stageId;
        if (config.expectedCloseDate)
          dealData.expectedCloseDate = new Date(config.expectedCloseDate as string);
        if (config.status) dealData.status = config.status;

        const deal = await this.prisma.deal.create({ data: dealData as any });
        this.logger.log(`CREATE_DEAL: deal ${(deal as any).id} created`);
        return { dealId: (deal as any).id };
      }

      case 'CREATE_ACTIVITY': {
        const activityData: Record<string, unknown> = {
          title: (config.title as string) || 'Automation activity',
          type: (config.activityType as string) || 'NOTE',
          tenantId,
          createdBy: userId,
        };
        if (config.description) activityData.description = config.description;
        if (config.dueDate) activityData.dueDate = new Date(config.dueDate as string);
        if (config.contactId) activityData.contactId = config.contactId;
        if (config.companyId) activityData.companyId = config.companyId;
        if (config.dealId || context.dealId)
          activityData.dealId = (config.dealId || context.dealId) as string;

        const activity = await (this.prisma as any).activity.create({ data: activityData });
        this.logger.log(`CREATE_ACTIVITY: activity ${(activity as any).id} created`);
        return { activityId: (activity as any).id };
      }

      case 'SEND_WHATSAPP': {
        const to = (config.to as string) || (context.phone as string) || '';
        const message = (config.message as string) || (config.body as string) || '';
        this.logger.log(
          `SEND_WHATSAPP: Would send WhatsApp to "${to}" with message: ${message.substring(0, 50)}...`,
        );
        return { platform: 'whatsapp', to, messageLength: message.length };
      }

      case 'SEND_PUSH': {
        const notification = await this.prisma.notification.create({
          data: {
            title: (config.title as string) || 'Push Notification',
            message: (config.message as string) || (config.body as string) || '',
            user: { connect: { id: (config.targetUserId as string) || userId } },
            type: 'PUSH',
            tenantId,
          } as any,
        });
        this.logger.log(`SEND_PUSH: notification ${(notification as any).id} created`);
        return { notificationId: (notification as any).id, type: 'PUSH' };
      }

      case 'CREATE_DOCUMENT': {
        const documentData: Record<string, unknown> = {
          title: (config.title as string) || 'Automation document',
          tenantId,
          createdBy: userId,
        };
        if (config.content) documentData.content = config.content;
        if (config.type) documentData.type = config.type;
        if (config.dealId || context.dealId)
          documentData.dealId = (config.dealId || context.dealId) as string;
        if (config.companyId) documentData.companyId = config.companyId;

        if ((this.prisma as any).document) {
          const doc = await (this.prisma as any).document.create({ data: documentData });
          this.logger.log(`CREATE_DOCUMENT: document ${doc.id} created`);
          return { documentId: doc.id };
        }
        this.logger.log(`CREATE_DOCUMENT: Would create document (no document model in client yet)`);
        return { documentId: null, simulated: true };
      }

      case 'UPDATE_FIELDS': {
        const entityType = (config.entityType as string) || '';
        const entityId =
          (config.entityId as string) ||
          (context[entityType] as any)?.id ||
          (context[`${entityType}Id`] as string);
        const fields = (config.fields as Record<string, unknown>) || {};

        if (!entityType || !entityId) {
          throw new Error('Missing entityType or entityId for UPDATE_FIELDS');
        }

        const delegate = (this.prisma as any)[entityType];
        if (!delegate) {
          throw new Error(`Unknown entity type: ${entityType}`);
        }

        await delegate.update({ where: { id: entityId }, data: fields });
        this.logger.log(
          `UPDATE_FIELDS: ${entityType} ${entityId} updated with fields: ${Object.keys(fields).join(', ')}`,
        );
        return { entityType, entityId, fields };
      }

      case 'EXECUTE_AI': {
        const prompt = (config.prompt as string) || '';
        const model = (config.model as string) || 'gpt-4';
        this.logger.log(
          `EXECUTE_AI: Would call AI model ${model} with prompt: ${prompt.substring(0, 100)}...`,
        );
        return { model, promptLength: prompt.length, simulated: true };
      }

      case 'EXECUTE_API': {
        const url = config.url as string;
        const method = (config.method as string) || 'GET';
        const headers = (config.headers as Record<string, string>) || {};
        this.logger.log(`EXECUTE_API: ${method} ${url}`);
        try {
          const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', ...headers },
            body: config.body ? JSON.stringify(config.body) : undefined,
          });
          return { url, method, status: response.status };
        } catch (error: any) {
          this.logger.warn(`API call failed: ${error.message}`);
          return { url, method, status: 'error', error: error.message };
        }
      }

      case 'CREATE_PRODUCT': {
        const productData: Record<string, unknown> = {
          name: (config.name as string) || 'New Product',
          tenantId,
        };
        if (config.price !== undefined) productData.price = config.price;
        if (config.description) productData.description = config.description;
        if (config.sku) productData.sku = config.sku;
        if (config.category) productData.category = config.category;

        const product = await (this.prisma as any).product.create({ data: productData });
        this.logger.log(`CREATE_PRODUCT: product ${(product as any).id} created`);
        return { productId: (product as any).id };
      }

      case 'SEND_SMS': {
        const to = (config.to as string) || (context.phone as string) || '';
        const message = (config.message as string) || (config.body as string) || '';
        this.logger.log(
          `SEND_SMS: Would send SMS to "${to}" with message: ${message.substring(0, 50)}...`,
        );
        return { platform: 'sms', to, messageLength: message.length };
      }

      case 'EXECUTE_WORKFLOW': {
        const workflowId = (config.workflowId as string) || '';
        if (!workflowId) throw new Error('Missing workflowId for EXECUTE_WORKFLOW');

        const result = await this.workflowsService.run(workflowId, tenantId, userId, {
          trigger: 'automation',
          input: { ...context, automationActionId: action.id },
        });
        this.logger.log(`EXECUTE_WORKFLOW: workflow ${workflowId} executed`);
        return { workflowId, executionId: (result as any)?.id };
      }

      case 'CREATE_TIMELINE': {
        const timelineData: Record<string, unknown> = {
          title: (config.title as string) || 'Automation event',
          description: (config.description as string) || '',
          tenantId,
          createdBy: userId,
        };
        if (config.dealId || context.dealId)
          timelineData.dealId = (config.dealId || context.dealId) as string;
        if (config.contactId || context.contactId)
          timelineData.contactId = (config.contactId || context.contactId) as string;
        if (config.companyId || context.companyId)
          timelineData.companyId = (config.companyId || context.companyId) as string;
        if (config.leadId || context.leadId)
          timelineData.leadId = (config.leadId || context.leadId) as string;

        if ((this.prisma as any).timeline) {
          const timeline = await (this.prisma as any).timeline.create({ data: timelineData });
          this.logger.log(`CREATE_TIMELINE: timeline ${timeline.id} created`);
          return { timelineId: timeline.id };
        }
        this.logger.log(`CREATE_TIMELINE: Would create timeline (no timeline model in client yet)`);
        return { timelineId: null, simulated: true };
      }

      case 'CREATE_AUDIT': {
        const auditData: Record<string, unknown> = {
          action: (config.action as string) || 'AUTOMATION',
          entity: (config.entity as string) || 'Automation',
          entityId: (config.entityId as string) || config.automationId || '',
          tenantId,
          userId,
        };
        if (config.changes) auditData.changes = config.changes;
        if (config.metadata) auditData.metadata = config.metadata;

        if ((this.prisma as any).auditLog) {
          const auditLog = await (this.prisma as any).auditLog.create({ data: auditData });
          this.logger.log(`CREATE_AUDIT: audit log ${auditLog.id} created`);
          return { auditLogId: auditLog.id };
        }
        this.logger.log(`CREATE_AUDIT: Would create audit log (no auditLog model in client yet)`);
        return { auditLogId: null, simulated: true };
      }

      case 'CREATE_COMMENT': {
        const commentData: Record<string, unknown> = {
          content: (config.content as string) || (config.body as string) || '',
          tenantId,
          userId,
        };
        if (config.dealId || context.dealId)
          commentData.dealId = (config.dealId || context.dealId) as string;
        if (config.contactId || context.contactId)
          commentData.contactId = (config.contactId || context.contactId) as string;
        if (config.leadId || context.leadId)
          commentData.leadId = (config.leadId || context.leadId) as string;
        if (config.companyId || context.companyId)
          commentData.companyId = (config.companyId || context.companyId) as string;

        if ((this.prisma as any).comment) {
          const comment = await (this.prisma as any).comment.create({ data: commentData });
          this.logger.log(`CREATE_COMMENT: comment ${comment.id} created`);
          return { commentId: comment.id };
        }
        this.logger.log(`CREATE_COMMENT: Would create comment (no comment model in client yet)`);
        return { commentId: null, simulated: true };
      }

      case 'CREATE_TAG': {
        const tagData: Record<string, unknown> = {
          name: (config.name as string) || 'automation-tag',
          color: config.color as string,
          tenantId,
        };
        if (config.entityType) tagData.entityType = config.entityType;
        if (config.entityId || context.id)
          tagData.entityId = (config.entityId || context.id) as string;

        const tag = await (this.prisma as any).tag.create({ data: tagData });
        this.logger.log(`CREATE_TAG: tag ${(tag as any).id} created`);
        return { tagId: (tag as any).id };
      }

      case 'ADD_FILE': {
        const fileName =
          (config.fileName as string) || (config.name as string) || 'automation-file';
        const fileUrl = (config.fileUrl as string) || (config.url as string) || '';
        const entityType = (config.entityType as string) || '';
        const entityId = (config.entityId as string) || (context.id as string) || '';

        this.logger.log(`ADD_FILE: Would add file "${fileName}" to ${entityType} ${entityId}`);
        return { fileName, fileUrl, entityType, entityId, simulated: true };
      }

      case 'EXECUTE_SCRIPT': {
        const script = (config.script as string) || '';

        if (config.safe !== false) {
          this.logger.log(`EXECUTE_SCRIPT: Would execute script (length: ${script.length})`);
          return { scriptLength: script.length, simulated: true };
        }

        try {
          const safeEval = new Function(
            'ctx',
            'prisma',
            'logger',
            `try { return (${script}); } catch(e) { return { error: e.message }; }`,
          );
          const result = safeEval(context, this.prisma, this.logger);
          this.logger.log(`EXECUTE_SCRIPT: script executed`);
          return { result };
        } catch (error: any) {
          throw new Error(`Script execution failed: ${error.message}`);
        }
      }

      default:
        this.logger.warn(`Unknown action type: ${action.type}`);
        return { unknown: action.type, skipped: true };
    }
  }

  private async logExecution(
    automationId: string,
    executionId: string,
    tenantId: string,
    userId: string,
    level: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    await (this.prisma as any).automationLog.create({
      data: {
        automationId,
        executionId,
        tenantId,
        userId,
        level,
        message,
        details: details as any,
      },
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
