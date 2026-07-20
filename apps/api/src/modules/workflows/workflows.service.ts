import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventBusService } from '../../infrastructure/event-bus/event-bus.service';
import { EventStoreService } from '../../infrastructure/event-bus/event-store.service';
import { BaseDomainEvent } from '../../infrastructure/event-bus/domain-events';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  WorkflowFilterDto,
  RunWorkflowDto,
  TestWorkflowDto,
} from './dto/workflows.dto';

interface WorkflowNode {
  id: string;
  type: string;
  label?: string;
  config?: Record<string, unknown>;
  position?: { x: number; y: number };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  config?: Record<string, unknown>;
}

interface AdjacencyMap {
  [nodeId: string]: string[];
}

@Injectable()
export class WorkflowsService {
  private readonly logger = new Logger(WorkflowsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly eventStore: EventStoreService,
  ) {}

  async findAll(tenantId: string, dto: WorkflowFilterDto) {
    const where: any = { tenantId, deletedAt: null };

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
    const orderBy: any = dto.sortBy
      ? { [dto.sortBy]: dto.sortOrder || 'desc' }
      : { createdAt: 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.workflow.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          version: true,
          nodes: true,
          edges: true,
          tags: true,
          isTemplate: true,
          templateCategory: true,
          tenantId: true,
          createdBy: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.workflow.count({ where }),
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
    const workflow = await this.prisma.workflow.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 10,
        },
      },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow ${id} not found`);
    }

    return workflow;
  }

  async create(tenantId: string, userId: string, dto: CreateWorkflowDto) {
    const workflow = await this.prisma.workflow.create({
      data: {
        name: dto.name,
        description: dto.description,
        status: 'DRAFT',
        version: 1,
        nodes: (dto.nodes as any) || [],
        edges: (dto.edges as any) || [],
        config: (dto.config as any) || {},
        tags: dto.tags || [],
        isTemplate: dto.isTemplate || false,
        templateCategory: dto.templateCategory,
        tenantId,
        createdBy: userId,
      },
    });

    await this.eventBus.publish(
      new BaseDomainEvent({
        eventName: 'workflow.created',
        aggregateType: 'Workflow',
        aggregateId: workflow.id,
        payload: { id: workflow.id, name: workflow.name },
        tenantId,
        userId,
      }),
    );

    this.logger.log(`Workflow "${workflow.name}" created by ${userId}`);
    return workflow;
  }

  async update(id: string, tenantId: string, dto: UpdateWorkflowDto) {
    const existing = await this.findById(id, tenantId);
    const existingWorkflow = existing as any;

    const needsVersionSnapshot =
      ((dto.nodes !== undefined || dto.edges !== undefined) &&
        JSON.stringify(dto.nodes || existingWorkflow.nodes) !==
          JSON.stringify(existingWorkflow.nodes)) ||
      JSON.stringify(dto.edges || existingWorkflow.edges) !==
        JSON.stringify(existingWorkflow.edges);

    if (needsVersionSnapshot) {
      const nextVersion = existingWorkflow.version + 1;
      await this.prisma.workflowVersion.create({
        data: {
          workflowId: id,
          version: nextVersion,
          data: {
            nodes: dto.nodes !== undefined ? dto.nodes : existingWorkflow.nodes,
            edges: dto.edges !== undefined ? dto.edges : existingWorkflow.edges,
            name: existingWorkflow.name,
            description: existingWorkflow.description,
            config: existingWorkflow.config,
          },
          reason: 'Workflow updated',
          tenantId,
          createdBy: existingWorkflow.createdBy,
        },
      });

      await this.prisma.workflow.update({
        where: { id },
        data: { version: nextVersion },
      });
    }

    const updateData: any = { ...dto };
    if (updateData.nodes !== undefined) {
      updateData.nodes = updateData.nodes as any;
    }
    if (updateData.edges !== undefined) {
      updateData.edges = updateData.edges as any;
    }
    if (updateData.config !== undefined) {
      updateData.config = updateData.config as any;
    }

    return this.prisma.workflow.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    await this.prisma.workflow.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    this.logger.log(`Workflow ${id} soft-deleted`);
  }

  async publish(id: string, tenantId: string, userId: string) {
    await this.findById(id, tenantId);

    const workflow = await this.prisma.workflow.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    await this.eventBus.publish(
      new BaseDomainEvent({
        eventName: 'workflow.published',
        aggregateType: 'Workflow',
        aggregateId: id,
        payload: { id, name: workflow.name },
        tenantId,
        userId,
      }),
    );

    this.logger.log(`Workflow "${workflow.name}" published by ${userId}`);
    return workflow;
  }

  async run(id: string, tenantId: string, userId: string, dto: RunWorkflowDto) {
    const workflow = (await this.findById(id, tenantId)) as any;

    const execution = await this.prisma.workflowExecution.create({
      data: {
        workflowId: id,
        tenantId,
        createdBy: userId,
        trigger: dto.trigger || 'manual',
        input: (dto.input as any) || {},
        status: 'PENDING',
        nodeResults: [],
      },
    });

    try {
      await this.prisma.workflowExecution.update({
        where: { id: execution.id },
        data: { status: 'RUNNING', startedAt: new Date() },
      });

      const nodeResults = await this.executeWorkflow(
        workflow.nodes as WorkflowNode[],
        workflow.edges as WorkflowEdge[],
        dto.trigger || 'manual',
        dto.input || {},
        tenantId,
        userId,
        workflow.config,
      );

      const completedAt = new Date();
      const startedAt = execution.startedAt || execution.createdAt;
      const duration = startedAt
        ? Math.round((completedAt.getTime() - startedAt.getTime()) / 1000)
        : 0;

      const updated = await this.prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          completedAt,
          duration,
          nodeResults: nodeResults as any,
          output: nodeResults[nodeResults.length - 1]?.output || {},
        },
      });

      await this.eventBus.publish(
        new BaseDomainEvent({
          eventName: 'workflow.execution.completed',
          aggregateType: 'WorkflowExecution',
          aggregateId: execution.id,
          payload: { executionId: execution.id, workflowId: id, status: 'COMPLETED' },
          tenantId,
          userId,
        }),
      );

      this.logger.log(`Workflow ${id} execution ${execution.id} completed successfully`);
      return updated;
    } catch (error: any) {
      const completedAt = new Date();
      const startedAt = execution.startedAt || execution.createdAt;
      const duration = startedAt
        ? Math.round((completedAt.getTime() - startedAt.getTime()) / 1000)
        : 0;

      const failed = await this.prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          completedAt,
          duration,
          error: error.message,
        },
      });

      await this.eventBus.publish(
        new BaseDomainEvent({
          eventName: 'workflow.execution.failed',
          aggregateType: 'WorkflowExecution',
          aggregateId: execution.id,
          payload: { executionId: execution.id, workflowId: id, error: error.message },
          metadata: { error: error.message },
          tenantId,
          userId,
        }),
      );

      this.logger.error(`Workflow ${id} execution ${execution.id} failed: ${error.message}`);
      return failed;
    }
  }

  async test(id: string, tenantId: string, dto: TestWorkflowDto) {
    const workflow = (await this.findById(id, tenantId)) as any;

    const nodeResults = await this.executeWorkflow(
      workflow.nodes as WorkflowNode[],
      workflow.edges as WorkflowEdge[],
      dto.trigger,
      dto.input,
      tenantId,
      'system',
      workflow.config,
      true,
    );

    return {
      workflowId: id,
      workflowName: workflow.name,
      trigger: dto.trigger,
      input: dto.input,
      nodeCount: workflow.nodes?.length || 0,
      executedNodes: nodeResults.length,
      results: nodeResults,
      success: true,
    };
  }

  private async executeWorkflow(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    trigger: string,
    input: Record<string, unknown>,
    tenantId: string,
    userId: string,
    workflowConfig: any,
    isTest: boolean = false,
  ): Promise<any[]> {
    if (!nodes || nodes.length === 0) {
      this.logger.warn('Workflow has no nodes');
      return [];
    }

    const adjacency = this.buildAdjacencyMap(edges, nodes);
    const nodeMap = new Map<string, WorkflowNode>();
    for (const node of nodes) {
      nodeMap.set(node.id, node);
    }

    const triggerNode = nodes.find(
      (n) =>
        n.type === 'TRIGGER' &&
        (!trigger || trigger === 'manual' || n.config?.triggerType === trigger),
    );

    if (!triggerNode) {
      this.logger.warn(`No matching trigger node found for trigger: ${trigger}`);
      return [];
    }

    const visited = new Set<string>();
    const results: any[] = [];
    const context: Record<string, unknown> = {
      ...input,
      __trigger: trigger,
      __workflowConfig: workflowConfig,
    };

    const queue: string[] = [triggerNode.id];
    visited.add(triggerNode.id);

    while (queue.length > 0) {
      const currentNodeId = queue.shift()!;
      const node = nodeMap.get(currentNodeId);

      if (!node) continue;

      const startedAt = new Date();
      let result: any;

      try {
        result = await this.executeNode(node, context, tenantId, userId, isTest);
      } catch (error: any) {
        result = {
          status: 'error',
          error: error.message,
          output: null,
        };
        results.push({
          nodeId: node.id,
          nodeType: node.type,
          nodeLabel: node.label || node.id,
          startedAt: startedAt.toISOString(),
          completedAt: new Date().toISOString(),
          ...result,
        });
        throw error;
      }

      results.push({
        nodeId: node.id,
        nodeType: node.type,
        nodeLabel: node.label || node.id,
        startedAt: startedAt.toISOString(),
        completedAt: new Date().toISOString(),
        ...result,
      });

      if (result.output) {
        Object.assign(context, { [node.id]: result.output });
      }

      if (node.type === 'END') {
        break;
      }

      if (node.type === 'CONDITION' || node.type === 'IF') {
        const branch = result.branch || 'default';
        const branchEdge = edges.find(
          (e) => e.source === currentNodeId && (e.sourceHandle === branch || e.label === branch),
        );
        if (branchEdge && !visited.has(branchEdge.target)) {
          visited.add(branchEdge.target);
          queue.push(branchEdge.target);
        }
        continue;
      }

      const neighbors = adjacency[currentNodeId] || [];
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      }
    }

    return results;
  }

  private buildAdjacencyMap(edges: WorkflowEdge[], _nodes: WorkflowNode[]): AdjacencyMap {
    const map: AdjacencyMap = {};
    for (const edge of edges) {
      if (!map[edge.source]) {
        map[edge.source] = [];
      }
      map[edge.source].push(edge.target);
    }
    return map;
  }

  private async executeNode(
    node: WorkflowNode,
    context: Record<string, unknown>,
    tenantId: string,
    userId: string,
    isTest: boolean,
  ): Promise<{ status: string; output?: any; branch?: string; message?: string }> {
    const config = node.config || {};

    switch (node.type) {
      case 'TRIGGER':
        return { status: 'success', output: context, message: 'Trigger activated' };

      case 'CONDITION':
      case 'IF': {
        const condition = (config.condition as string) || '';
        const branches = (config.branches as Record<string, string>) || {};
        let branch = 'else';

        if (condition) {
          try {
            const safeEval = new Function(
              'ctx',
              `try { return !!(${condition}); } catch(e) { return false; }`,
            );
            const evaluated = safeEval(context);
            branch = evaluated ? 'true' : 'false';
          } catch {
            branch = 'else';
          }
        }

        const branchLabel = branches[branch] || branches.default || branch;
        return {
          status: 'success',
          branch: branchLabel,
          output: { condition, result: branch },
          message: `Branch: ${branchLabel}`,
        };
      }

      case 'DELAY':
      case 'WAIT': {
        const delayMs = (config.delay as number) || 1000;
        const maxDelay = Math.min(delayMs, 30000);
        if (!isTest) {
          await new Promise((resolve) => setTimeout(resolve, maxDelay));
        }
        return { status: 'success', output: { waited: delayMs }, message: `Waited ${delayMs}ms` };
      }

      case 'EMAIL': {
        const template = (config.template as string) || '';
        const to = (config.to as string) || '';
        if (isTest) {
          this.logger.debug(`[TEST] Would send email to "${to}" with template "${template}"`);
        } else {
          this.logger.log(`Would send email to "${to}" with template "${template}"`);
        }
        return { status: 'success', output: { to, template }, message: `Email queued to ${to}` };
      }

      case 'WHATSAPP': {
        const template = (config.template as string) || '';
        const to = (config.to as string) || '';
        if (isTest) {
          this.logger.debug(`[TEST] Would send WhatsApp to "${to}" with template "${template}"`);
        } else {
          this.logger.log(`Would send WhatsApp to "${to}" with template "${template}"`);
        }
        return { status: 'success', output: { to, template }, message: `WhatsApp queued to ${to}` };
      }

      case 'CREATE_TASK': {
        if (isTest) {
          return {
            status: 'success',
            output: { simulated: true, type: 'task' },
            message: `[TEST] Would create task`,
          };
        }
        const taskData: any = {
          title: (config.title as string) || 'Workflow task',
          tenantId,
          createdBy: userId,
        };
        if (config.description) taskData.description = config.description;
        if (config.ownerId) taskData.ownerId = config.ownerId;
        if (config.dueDate) taskData.dueDate = new Date(config.dueDate as string);
        if (config.priority) taskData.priority = config.priority;
        if (config.relatedEntityId) taskData.relatedEntityId = config.relatedEntityId;
        if (config.relatedEntityType) taskData.relatedEntityType = config.relatedEntityType;

        const task = await this.prisma.task.create({ data: taskData });
        return {
          status: 'success',
          output: { taskId: task.id },
          message: `Task "${task.title}" created`,
        };
      }

      case 'CREATE_LEAD': {
        if (isTest) {
          return {
            status: 'success',
            output: { simulated: true, type: 'lead' },
            message: '[TEST] Would create lead',
          };
        }
        const leadData: any = {
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
        if (config.value) leadData.value = config.value;
        if (config.description) leadData.description = config.description;

        const lead = await this.prisma.lead.create({ data: leadData });
        return {
          status: 'success',
          output: { leadId: lead.id },
          message: `Lead "${lead.firstName} ${lead.lastName}" created`,
        };
      }

      case 'CREATE_CONTACT': {
        if (isTest) {
          return {
            status: 'success',
            output: { simulated: true, type: 'contact' },
            message: '[TEST] Would create contact',
          };
        }
        const contactData: any = {
          firstName: (config.firstName as string) || (context.firstName as string) || 'Unknown',
          lastName: (config.lastName as string) || (context.lastName as string) || 'Contact',
          tenantId,
          ownerId: (config.ownerId as string) || userId,
        };
        if (config.email || context.email)
          contactData.email = (config.email || context.email) as string;
        if (config.phone || context.phone)
          contactData.phone = (config.phone || context.phone) as string;
        if (config.companyId) contactData.companyId = config.companyId;
        if (config.description) contactData.description = config.description;

        const contact = await this.prisma.contact.create({ data: contactData });
        return {
          status: 'success',
          output: { contactId: contact.id },
          message: `Contact "${contact.firstName} ${contact.lastName}" created`,
        };
      }

      case 'CREATE_DEAL': {
        if (isTest) {
          return {
            status: 'success',
            output: { simulated: true, type: 'deal' },
            message: '[TEST] Would create deal',
          };
        }
        const dealData: any = {
          title: (config.title as string) || 'Workflow deal',
          tenantId,
          ownerId: (config.ownerId as string) || userId,
        };
        if (config.value) dealData.value = config.value;
        if (config.companyId || context.companyId)
          dealData.companyId = (config.companyId || context.companyId) as string;
        if (config.contactId || context.contactId)
          dealData.contactId = (config.contactId || context.contactId) as string;
        if (config.pipelineId) dealData.pipelineId = config.pipelineId;
        if (config.stageId) dealData.stageId = config.stageId;
        if (config.expectedCloseDate)
          dealData.expectedCloseDate = new Date(config.expectedCloseDate as string);

        const deal = await this.prisma.deal.create({ data: dealData });
        return {
          status: 'success',
          output: { dealId: deal.id },
          message: `Deal "${deal.title}" created`,
        };
      }

      case 'UPDATE_FIELDS': {
        const entityType = (config.entityType as string) || '';
        const entityId =
          (config.entityId as string) ||
          (context[entityType] as any)?.id ||
          (context[`${entityType}Id`] as string);
        const fields = (config.fields as Record<string, unknown>) || {};

        if (isTest) {
          return {
            status: 'success',
            output: { entityType, entityId, fields },
            message: `[TEST] Would update ${entityType} fields`,
          };
        }

        if (!entityType || !entityId) {
          return {
            status: 'error',
            output: null,
            message: 'Missing entityType or entityId for UPDATE_FIELDS',
          };
        }

        const delegate = (this.prisma as any)[entityType];
        if (!delegate) {
          return { status: 'error', output: null, message: `Unknown entity type: ${entityType}` };
        }

        await delegate.update({ where: { id: entityId }, data: fields });
        return {
          status: 'success',
          output: { entityType, entityId, fields },
          message: `Updated ${entityType} ${entityId}`,
        };
      }

      case 'SEND_NOTIFICATION': {
        const notificationData: any = {
          title: (config.title as string) || 'Workflow notification',
          message: (config.message as string) || '',
          userId: (config.targetUserId as string) || userId,
          type: (config.notificationType as string) || 'INFO',
          tenantId,
        };

        if (isTest) {
          return {
            status: 'success',
            output: notificationData,
            message: `[TEST] Would send notification`,
          };
        }

        const notification = await this.prisma.notification.create({ data: notificationData });
        return {
          status: 'success',
          output: { notificationId: notification.id },
          message: `Notification sent to ${notificationData.userId}`,
        };
      }

      case 'MOVE_PIPELINE': {
        const dealId = (config.dealId as string) || (context.dealId as string);
        const targetStageId = (config.targetStageId as string) || '';

        if (isTest) {
          return {
            status: 'success',
            output: { dealId, targetStageId },
            message: `[TEST] Would move deal to stage ${targetStageId}`,
          };
        }

        if (!dealId || !targetStageId) {
          return {
            status: 'error',
            output: null,
            message: 'Missing dealId or targetStageId for MOVE_PIPELINE',
          };
        }

        await this.prisma.deal.update({
          where: { id: dealId as string },
          data: { stageId: targetStageId },
        });
        return {
          status: 'success',
          output: { dealId, targetStageId },
          message: `Deal ${dealId} moved to stage ${targetStageId}`,
        };
      }

      case 'END':
        return { status: 'success', output: context, message: 'Workflow ended' };

      case 'HTTP_REQUEST': {
        const url = (config.url as string) || '';
        const method = (config.method as string) || 'GET';
        const headers = (config.headers as Record<string, string>) || {};

        if (isTest) {
          return {
            status: 'success',
            output: { url, method, headers, simulated: true },
            message: `[TEST] Would make ${method} request to ${url}`,
          };
        }

        try {
          const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', ...headers },
            body: config.body ? JSON.stringify(config.body) : undefined,
          });
          const data = await response.json().catch(() => null);
          return {
            status: response.ok ? 'success' : 'error',
            output: { statusCode: response.status, data },
            message: `HTTP ${method} ${url} -> ${response.status}`,
          };
        } catch (error: any) {
          return {
            status: 'error',
            output: null,
            message: `HTTP request failed: ${error.message}`,
          };
        }
      }

      case 'AI': {
        const prompt = (config.prompt as string) || '';
        const model = (config.model as string) || 'gpt-4';

        if (isTest) {
          return {
            status: 'success',
            output: { prompt, model, simulated: true },
            message: `[TEST] Would call AI with model ${model}`,
          };
        }

        this.logger.log(`AI call with model ${model}, prompt: ${prompt.substring(0, 100)}...`);
        return {
          status: 'success',
          output: { model, response: null, configured: false },
          message: `AI call recorded. AI provider not configured for model ${model}.`,
        };
      }

      case 'SCRIPT': {
        const script = (config.script as string) || '';
        const allowedGlobals = [
          'Math',
          'Date',
          'JSON',
          'String',
          'Number',
          'Boolean',
          'Array',
          'Object',
          'parseInt',
          'parseFloat',
          'isNaN',
          'isFinite',
        ];

        if (isTest) {
          return {
            status: 'success',
            output: { script, simulated: true },
            message: '[TEST] Would execute script',
          };
        }

        try {
          const safeEval = new Function(
            ...allowedGlobals,
            'ctx',
            `try { return (${script}); } catch(e) { return { error: e.message }; }`,
          );
          const result = safeEval(...allowedGlobals.map((g) => (globalThis as any)[g]), context);
          return { status: 'success', output: result, message: 'Script executed successfully' };
        } catch (error: any) {
          return {
            status: 'error',
            output: null,
            message: `Script execution failed: ${error.message}`,
          };
        }
      }

      default:
        this.logger.warn(`Unknown node type: ${node.type}`);
        return {
          status: 'success',
          output: null,
          message: `Unknown node type: ${node.type} - skipped`,
        };
    }
  }

  async getHistory(workflowId: string, tenantId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.workflowExecution.findMany({
        where: { workflowId, tenantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.workflowExecution.count({ where: { workflowId, tenantId } }),
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

  async getVersions(workflowId: string, tenantId: string) {
    return this.prisma.workflowVersion.findMany({
      where: { workflowId, tenantId },
      orderBy: { version: 'desc' },
    });
  }

  async getLogs(tenantId: string) {
    return this.prisma.workflowExecution.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        status: true,
        trigger: true,
        startedAt: true,
        completedAt: true,
        duration: true,
        error: true,
        workflowId: true,
        createdAt: true,
      },
    });
  }

  async getTemplates(tenantId: string) {
    return this.prisma.workflow.findMany({
      where: { tenantId, isTemplate: true, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        templateCategory: true,
        nodes: true,
        edges: true,
        config: true,
        tags: true,
        createdAt: true,
      },
    });
  }

  async getStats(tenantId: string) {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [totalWorkflows, totalExecutions, activeWorkflows, failedLast24h, publishedWorkflows] =
      await Promise.all([
        this.prisma.workflow.count({ where: { tenantId, deletedAt: null } }),
        this.prisma.workflowExecution.count({ where: { tenantId } }),
        this.prisma.workflow.count({ where: { tenantId, status: 'ACTIVE', deletedAt: null } }),
        this.prisma.workflowExecution.count({
          where: {
            tenantId,
            status: 'FAILED',
            createdAt: { gte: last24h },
          },
        }),
        this.prisma.workflow.count({ where: { tenantId, status: 'PUBLISHED', deletedAt: null } }),
      ]);

    const statusDistribution = await this.prisma.workflow.groupBy({
      by: ['status'],
      where: { tenantId, deletedAt: null },
      _count: true,
    });

    return {
      totalWorkflows,
      totalExecutions,
      activeWorkflows,
      publishedWorkflows,
      failedLast24h,
      statusDistribution,
    };
  }
}
