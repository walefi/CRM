import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BpmnService {
  constructor(private readonly prisma: PrismaService) {}

  async getRules(tenantId: string) {
    return (this.prisma as any).businessRule.findMany({ where: { tenantId }, orderBy: { priority: 'asc' } });
  }

  async createRule(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).businessRule.create({
      data: { name: dto.name, description: dto.description, type: dto.type || 'conditional', expression: dto.expression, priority: dto.priority || 0, category: dto.category, tenantId, createdBy: userId },
    });
  }

  async getApprovals(tenantId: string) {
    return (this.prisma as any).approvalFlow.findMany({ where: { tenantId }, orderBy: { updatedAt: 'desc' }, include: { steps: { orderBy: { order: 'asc' } } } });
  }

  async createApproval(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).approvalFlow.create({
      data: {
        name: dto.name, description: dto.description, type: dto.type || 'sequential', entityType: dto.entityType, tenantId, createdBy: userId,
        steps: dto.steps?.length ? { create: dto.steps.map((s: any, i: number) => ({ name: s.name, order: s.order ?? i, approverId: s.approverId, approverRole: s.approverRole })) } : undefined,
      },
      include: { steps: true },
    });
  }

  async getProcesses(tenantId: string) {
    return (this.prisma as any).processDefinition.findMany({ where: { tenantId }, orderBy: { updatedAt: 'desc' } });
  }

  async createProcess(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).processDefinition.create({
      data: { name: dto.name, description: dto.description, bpmnXml: dto.bpmnXml, version: dto.version || 1, variables: (dto.variables as any) || [], metadata: (dto.metadata as any) || {}, tenantId, createdBy: userId },
    });
  }

  async getTasks(tenantId: string, dto: any) {
    const where: any = { tenantId };
    if (dto.status) where.status = dto.status;
    if (dto.assigneeId) where.assigneeId = dto.assigneeId;
    if (dto.queue) where.queue = dto.queue;
    const page = dto.page || 1; const limit = dto.limit || 20; const skip = (page - 1) * limit;
    const prismaAny = this.prisma as any;
    const [data, total] = await Promise.all([
      prismaAny.humanTask.findMany({ where, skip, take: limit, orderBy: { priority: 'desc' } }),
      prismaAny.humanTask.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 } };
  }

  async createTask(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).humanTask.create({
      data: { title: dto.title, description: dto.description, priority: dto.priority || 'normal', assigneeId: dto.assigneeId, queue: dto.queue || 'default', dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined, formData: (dto.formData as any) || {}, tenantId, createdBy: userId },
    });
  }

  async completeTask(tenantId: string, id: string) {
    return (this.prisma as any).humanTask.update({ where: { id }, data: { status: 'completed', completedAt: new Date() } });
  }

  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const [rules, approvals, processes, tasks] = await Promise.all([
      prismaAny.businessRule.count({ where: { tenantId } }),
      prismaAny.approvalFlow.count({ where: { tenantId } }),
      prismaAny.processDefinition.count({ where: { tenantId } }),
      prismaAny.humanTask.count({ where: { tenantId, status: 'pending' } }),
    ]);
    return { rules, approvalFlows: approvals, processDefinitions: processes, pendingTasks: tasks };
  }
}
