import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ManufacturingService {
  constructor(private readonly prisma: PrismaService) {}

  async getBOMs(tenantId: string) {
    return (this.prisma as any).bOM.findMany({ where: { tenantId }, orderBy: { updatedAt: 'desc' }, include: { items: true } });
  }

  async createBOM(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).bOM.create({
      data: {
        productId: dto.productId, name: dto.name, revision: dto.revision || 1,
        status: dto.status || 'active', notes: dto.notes, tenantId, createdBy: userId,
        items: dto.items?.length ? { create: dto.items.map((i: any) => ({ productId: i.productId, name: i.name, quantity: i.quantity || 1, unit: i.unit || 'unit', type: i.type || 'raw_material', notes: i.notes })) } : undefined,
      },
      include: { items: true },
    });
  }

  async getProductionOrders(tenantId: string, dto: any) {
    const where: any = { tenantId };
    if (dto.status) where.status = dto.status;
    const page = dto.page || 1; const limit = dto.limit || 20; const skip = (page - 1) * limit;
    const prismaAny = this.prisma as any;
    const [data, total] = await Promise.all([
      prismaAny.productionOrder.findMany({ where, skip, take: limit, orderBy: { updatedAt: 'desc' }, include: { executions: true } }),
      prismaAny.productionOrder.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 } };
  }

  async createProductionOrder(tenantId: string, userId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const orderNumber = `OP-${Date.now().toString(36).toUpperCase()}`;
    return prismaAny.productionOrder.create({
      data: { orderNumber, bomId: dto.bomId, productId: dto.productId, quantity: dto.quantity || 1, status: 'draft', priority: dto.priority || 'normal', startDate: dto.startDate ? new Date(dto.startDate) : undefined, endDate: dto.endDate ? new Date(dto.endDate) : undefined, notes: dto.notes, tenantId, createdBy: userId },
    });
  }

  async startProduction(tenantId: string, dto: any) {
    const prismaAny = this.prisma as any;
    await prismaAny.productionOrder.update({ where: { id: dto.orderId }, data: { status: 'in_progress', startDate: new Date() } });
    return prismaAny.productionExecution.create({
      data: { orderId: dto.orderId, quantity: dto.quantity || 0, scrap: 0, rework: 0, status: 'in_progress', startedAt: new Date(), tenantId },
    });
  }

  async finishProduction(tenantId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const exec = await prismaAny.productionExecution.findFirst({ where: { orderId: dto.orderId, status: 'in_progress' }, orderBy: { createdAt: 'desc' } });
    if (exec) {
      await prismaAny.productionExecution.update({
        where: { id: exec.id },
        data: { quantity: dto.quantity || exec.quantity, scrap: dto.scrap || 0, rework: dto.rework || 0, status: 'completed', completedAt: new Date(), notes: dto.notes },
      });
    }
    return prismaAny.productionOrder.update({ where: { id: dto.orderId }, data: { status: 'completed' } });
  }

  async getWorkCenters(tenantId: string) {
    return (this.prisma as any).workCenter.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  async createWorkCenter(tenantId: string, dto: any) {
    return (this.prisma as any).workCenter.create({
      data: { name: dto.name, type: dto.type || 'machine', capacity: dto.capacity || 1, status: 'active', location: dto.location, notes: dto.notes, tenantId },
    });
  }

  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const [boms, orders, active, centers] = await Promise.all([
      prismaAny.bOM.count({ where: { tenantId } }),
      prismaAny.productionOrder.count({ where: { tenantId } }),
      prismaAny.productionOrder.count({ where: { tenantId, status: 'in_progress' } }),
      prismaAny.workCenter.count({ where: { tenantId } }),
    ]);
    return { totalBOMs: boms, totalOrders: orders, activeProduction: active, workCenters: centers };
  }
}
