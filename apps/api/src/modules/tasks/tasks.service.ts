import { Injectable, NotFoundException } from '@nestjs/common';
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
      this.eventBus.publish(new TaskCompletedEvent(task as any, tenantId, userId)).catch(() => {});
    }

    return task;
  }

  async removeTask(id: string, tenantId: string) {
    await this.findTaskById(id, tenantId);
    await this.prisma.task.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async completeTask(id: string, tenantId: string) {
    await this.findTaskById(id, tenantId);
    return this.prisma.task.update({
      where: { id },
      data: { status: 'DONE', completedAt: new Date() },
    });
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
}
