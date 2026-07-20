import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HrService {
  constructor(private readonly prisma: PrismaService) {}

  async getEmployees(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, email: true, firstName: true, lastName: true, avatar: true, phone: true, title: true, role: true, department: { select: { id: true, name: true } }, team: { select: { id: true, name: true } }, createdAt: true },
    });
  }

  async getSkills(tenantId: string, userId?: string) {
    const where: any = { tenantId };
    if (userId) where.userId = userId;
    return (this.prisma as any).employeeSkill.findMany({ where, orderBy: { name: 'asc' } });
  }

  async createSkill(tenantId: string, dto: any) {
    return (this.prisma as any).employeeSkill.create({
      data: { userId: dto.userId, name: dto.name, level: dto.level || 'intermediate', category: dto.category, yearsExp: dto.yearsExp || 0, notes: dto.notes, tenantId },
    });
  }

  async getAllocations(tenantId: string, userId?: string) {
    const where: any = { tenantId };
    if (userId) where.userId = userId;
    return (this.prisma as any).resourceAllocation.findMany({ where, orderBy: { startDate: 'desc' } });
  }

  async createAllocation(tenantId: string, dto: any) {
    return (this.prisma as any).resourceAllocation.create({
      data: { userId: dto.userId, projectId: dto.projectId, taskId: dto.taskId, ticketId: dto.ticketId, percentage: dto.percentage || 100, startDate: new Date(dto.startDate), endDate: dto.endDate ? new Date(dto.endDate) : undefined, notes: dto.notes, tenantId },
    });
  }

  async getVacations(tenantId: string, userId?: string) {
    const where: any = { tenantId };
    if (userId) where.userId = userId;
    return (this.prisma as any).vacation.findMany({ where, orderBy: { startDate: 'desc' } });
  }

  async requestVacation(tenantId: string, dto: any) {
    return (this.prisma as any).vacation.create({
      data: { userId: dto.userId, startDate: new Date(dto.startDate), endDate: new Date(dto.endDate), status: 'pending', notes: dto.notes, tenantId },
    });
  }

  async getLeaves(tenantId: string) {
    return (this.prisma as any).leaveRequest.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async requestLeave(tenantId: string, dto: any) {
    return (this.prisma as any).leaveRequest.create({
      data: { userId: dto.userId, type: dto.type || 'sick_leave', startDate: new Date(dto.startDate), endDate: new Date(dto.endDate), status: 'pending', reason: dto.reason, tenantId },
    });
  }

  async getReviews(tenantId: string, userId?: string) {
    const where: any = { tenantId };
    if (userId) where.userId = userId;
    return (this.prisma as any).performanceReview.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async createReview(tenantId: string, dto: any) {
    return (this.prisma as any).performanceReview.create({
      data: { userId: dto.userId, reviewerId: dto.reviewerId, period: dto.period || 'quarterly', goals: (dto.goals as any) || [], scores: (dto.scores as any) || {}, overall: dto.overall, feedback: dto.feedback, status: dto.status || 'draft', tenantId },
    });
  }

  async getTrainings(tenantId: string) {
    return (this.prisma as any).training.findMany({ where: { tenantId }, orderBy: { startDate: 'desc' } });
  }

  async createTraining(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).training.create({
      data: { title: dto.title, description: dto.description, instructor: dto.instructor, startDate: dto.startDate ? new Date(dto.startDate) : undefined, endDate: dto.endDate ? new Date(dto.endDate) : undefined, maxSlots: dto.maxSlots || 20, tenantId, createdBy: userId },
    });
  }

  async getDepartments(tenantId: string) {
    return this.prisma.department.findMany({ where: { tenantId }, include: { _count: { select: { users: true } } } });
  }

  async getTeams(tenantId: string) {
    return this.prisma.team.findMany({ where: { tenantId }, include: { _count: { select: { users: true } } } });
  }

  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const [employees, skills, allocations, vacations, trainings, reviews] = await Promise.all([
      this.prisma.user.count({ where: { tenantId, deletedAt: null } }),
      prismaAny.employeeSkill.count({ where: { tenantId } }),
      prismaAny.resourceAllocation.count({ where: { tenantId } }),
      prismaAny.vacation.count({ where: { tenantId, status: 'pending' } }),
      prismaAny.training.count({ where: { tenantId, status: 'scheduled' } }),
      prismaAny.performanceReview.count({ where: { tenantId } }),
    ]);
    return { employees, skills, activeAllocations: allocations, pendingVacations: vacations, scheduledTrainings: trainings, reviews };
  }
}
