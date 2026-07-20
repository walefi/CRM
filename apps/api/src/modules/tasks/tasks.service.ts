import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventBusService } from '../../infrastructure/event-bus/event-bus.service';
import { TaskCompletedEvent } from '../../infrastructure/event-bus/domain-events';
import {
  CreateTaskDto,
  UpdateTaskDto,
  ActivityFilterDto,
  CreateActivityDto,
} from './dto/tasks.dto';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  async findAllTasks(tenantId: string, filters: ActivityFilterDto) {
    const where: any = { tenantId, deletedAt: null };
    if (filters.status) where.status = filters.status;
    if (filters.ownerId) where.assigneeId = filters.ownerId;
    if (filters.search) {
      const s = filters.search;
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
      ];
    }
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          deal: { select: { id: true, title: true } },
        },
      }),
      this.prisma.task.count({ where }),
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

  async findAllActivities(tenantId: string, filters: ActivityFilterDto) {
    const where: any = { tenantId, deletedAt: null };
    if (filters.type) where.type = filters.type;
    if (filters.ownerId) where.userId = filters.ownerId;
    if (filters.search) {
      const s = filters.search;
      where.OR = [{ subject: { contains: s, mode: 'insensitive' } }];
    }
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.activity.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          deal: { select: { id: true, title: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.activity.count({ where }),
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

  async findTaskById(id: string, tenantId: string) {
    const t = await this.prisma.task.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        comments: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!t) throw new NotFoundException('Task not found');
    return t;
  }

  async createTask(tenantId: string, dto: CreateTaskDto, userId?: string) {
    return this.prisma.task.create({
      data: { ...dto, tenantId, createdById: userId },
      include: { assignee: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async updateTask(id: string, tenantId: string, dto: UpdateTaskDto, userId?: string) {
    await this.findTaskById(id, tenantId);
    const task = await this.prisma.task.update({ where: { id }, data: dto });

    if (dto.status === 'DONE') {
      this.eventBus
        .publish(new TaskCompletedEvent(task as any, tenantId, userId))
        .catch((error: any) =>
          this.logger.warn(`Failed to publish TaskCompletedEvent: ${error.message}`),
        );
    }

    return task;
  }

  async removeTask(id: string, tenantId: string) {
    await this.findTaskById(id, tenantId);
    await this.prisma.task.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async completeTask(id: string, tenantId: string, userId?: string) {
    const updated = await this.prisma.task.update({
      where: { id },
      data: { status: 'DONE', completedAt: new Date() },
    });

    this.eventBus
      .publish(new TaskCompletedEvent(updated as any, tenantId, userId))
      .catch((error: any) =>
        this.logger.warn(`Failed to publish TaskCompletedEvent: ${error.message}`),
      );

    return updated;
  }

  async createActivity(tenantId: string, dto: CreateActivityDto, userId: string) {
    return this.prisma.activity.create({
      data: { ...dto, type: dto.type || 'OTHER', tenantId, userId },
    });
  }

  async getStats(tenantId: string) {
    const [pending, done, overdue] = await Promise.all([
      this.prisma.task.count({
        where: { tenantId, deletedAt: null, status: { in: ['TODO', 'IN_PROGRESS'] } },
      }),
      this.prisma.task.count({ where: { tenantId, deletedAt: null, status: 'DONE' } }),
      this.prisma.task.count({
        where: { tenantId, deletedAt: null, dueDate: { lt: new Date() }, status: { not: 'DONE' } },
      }),
    ]);
    return { pending, done, overdue };
  }

  // PROJECT MANAGEMENT
  async getProjects(tenantId: string, dto: any) {
    const where: any = { tenantId, deletedAt: null };
    if (dto.status) where.status = dto.status;
    if (dto.type) where.type = dto.type;
    if (dto.search) where.name = { contains: dto.search, mode: 'insensitive' };
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;
    const prismaAny = this.prisma as any;
    const [data, total] = await Promise.all([
      prismaAny.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          tasks: { select: { id: true, title: true, status: true }, take: 5 },
          milestones: true,
          _count: { select: { tasks: true } },
        },
      }),
      prismaAny.project.count({ where }),
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

  async getProject(tenantId: string, id: string) {
    return (this.prisma as any).project.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        tasks: {
          orderBy: { order: 'asc' },
          include: { assignee: { select: { id: true, firstName: true, lastName: true } } },
        },
        milestones: { orderBy: { order: 'asc' } },
      },
    });
  }

  async createProject(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).project.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type || 'custom',
        color: dto.color,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        tenantId,
        createdBy: userId,
      },
    });
  }

  async updateProject(tenantId: string, id: string, dto: any) {
    const prismaAny = this.prisma as any;
    const existing = await prismaAny.project.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new Error('Project not found');
    const data: any = {};
    if (dto.name) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.status) data.status = dto.status;
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    return prismaAny.project.update({ where: { id }, data });
  }

  async deleteProject(tenantId: string, id: string) {
    const prismaAny = this.prisma as any;
    const existing = await prismaAny.project.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new Error('Project not found');
    await prismaAny.project.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // Milestones
  async getMilestones(tenantId: string, projectId: string) {
    return (this.prisma as any).milestone.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });
  }

  async createMilestone(tenantId: string, dto: any) {
    return (this.prisma as any).milestone.create({
      data: {
        projectId: dto.projectId,
        title: dto.title,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        order: dto.order || 0,
      },
    });
  }

  // Dependencies
  async createDependency(tenantId: string, dto: any) {
    return (this.prisma as any).taskDependency.create({
      data: {
        taskId: dto.taskId,
        dependsOnId: dto.dependsOnId,
        type: dto.type || 'finish_to_start',
      },
    });
  }

  async getDependencies(tenantId: string, taskId: string) {
    return (this.prisma as any).taskDependency.findMany({
      where: { taskId },
      include: { dependsOn: { select: { id: true, title: true, status: true } } },
    });
  }

  // Workload
  async getWorkload(tenantId: string, userId?: string) {
    const where: any = { tenantId, deletedAt: null, status: { in: ['TODO', 'IN_PROGRESS'] } };
    if (userId) where.assigneeId = userId;
    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true, color: true } },
      },
    });
    const byUser = new Map<string, any>();
    tasks.forEach((t) => {
      const key = (t as any).assignee?.id || 'unassigned';
      if (!byUser.has(key)) byUser.set(key, { user: (t as any).assignee, taskCount: 0, tasks: [] });
      const entry = byUser.get(key);
      entry.taskCount++;
      entry.tasks.push({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        project: (t as any).project,
      });
    });
    return { byUser: Array.from(byUser.values()), totalTasks: tasks.length };
  }

  // Stats
  async getProjectStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const [projects, tasks, milestones, dependencies] = await Promise.all([
      prismaAny.project.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.task.count({ where: { tenantId, deletedAt: null } }),
      prismaAny.milestone.count({ where: { project: { tenantId } } }),
      prismaAny.taskDependency.count({ where: { task: { tenantId } } }),
    ]);
    return { projects, tasks, milestones, dependencies };
  }
}
