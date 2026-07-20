import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getAssets(tenantId: string, dto: any) {
    const where: any = { tenantId };
    if (dto.category) where.category = dto.category;
    if (dto.status) where.status = dto.status;
    if (dto.search) where.name = { contains: dto.search, mode: 'insensitive' };
    const page = dto.page || 1; const limit = dto.limit || 20; const skip = (page - 1) * limit;
    const prismaAny = this.prisma as any;
    const [data, total] = await Promise.all([
      prismaAny.asset.findMany({ where, skip, take: limit, orderBy: { name: 'asc' }, include: { maintenances: { take: 1, orderBy: { nextAt: 'asc' } } } }),
      prismaAny.asset.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 } };
  }

  async getAsset(tenantId: string, id: string) {
    return (this.prisma as any).asset.findFirst({
      where: { id, tenantId },
      include: { maintenances: true, workOrders: { orderBy: { createdAt: 'desc' }, take: 10 }, inspections: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
  }

  async createAsset(tenantId: string, dto: any) {
    return (this.prisma as any).asset.create({
      data: { name: dto.name, code: dto.code, serialNumber: dto.serialNumber, model: dto.model, manufacturer: dto.manufacturer, category: dto.category, location: dto.location, purchasedAt: dto.purchasedAt ? new Date(dto.purchasedAt) : undefined, warrantyUntil: dto.warrantyUntil ? new Date(dto.warrantyUntil) : undefined, usefulLife: dto.usefulLife, value: dto.value || 0, notes: dto.notes, tenantId },
    });
  }

  async updateAsset(tenantId: string, id: string, dto: any) {
    const data: any = {};
    if (dto.name) data.name = dto.name;
    if (dto.status) data.status = dto.status;
    if (dto.location) data.location = dto.location;
    if (dto.value !== undefined) data.value = dto.value;
    if (dto.notes !== undefined) data.notes = dto.notes;
    return (this.prisma as any).asset.update({ where: { id }, data });
  }

  async deleteAsset(tenantId: string, id: string) {
    await (this.prisma as any).asset.deleteMany({ where: { id, tenantId } });
  }

  async getMaintenance(tenantId: string, assetId?: string) {
    const where: any = { tenantId };
    if (assetId) where.assetId = assetId;
    return (this.prisma as any).maintenancePlan.findMany({ where, orderBy: { nextAt: 'asc' } });
  }

  async createMaintenance(tenantId: string, dto: any) {
    return (this.prisma as any).maintenancePlan.create({
      data: { assetId: dto.assetId, title: dto.title, type: dto.type || 'preventive', frequency: dto.frequency || 'monthly', interval: dto.interval, checklist: (dto.checklist as any) || [], nextAt: dto.nextAt ? new Date(dto.nextAt) : undefined, tenantId },
    });
  }

  async getWorkOrders(tenantId: string, dto: any) {
    const where: any = { tenantId };
    if (dto.status) where.status = dto.status;
    if (dto.assetId) where.assetId = dto.assetId;
    const page = dto.page || 1; const limit = dto.limit || 20; const skip = (page - 1) * limit;
    const prismaAny = this.prisma as any;
    const [data, total] = await Promise.all([
      prismaAny.workOrder.findMany({ where, skip, take: limit, orderBy: { updatedAt: 'desc' }, include: { tasks: true, asset: { select: { id: true, name: true } } } }),
      prismaAny.workOrder.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 } };
  }

  async createWorkOrder(tenantId: string, userId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const orderNumber = `WO-${Date.now().toString(36).toUpperCase()}`;
    return prismaAny.workOrder.create({
      data: {
        orderNumber, assetId: dto.assetId, title: dto.title, type: dto.type || 'corrective', priority: dto.priority || 'normal', status: 'open', description: dto.description, assignedToId: dto.assignedToId, notes: dto.notes, tenantId, createdBy: userId,
        tasks: dto.tasks?.length ? { create: dto.tasks.map((t: any) => ({ title: t.title })) } : undefined,
      },
      include: { tasks: true },
    });
  }

  async getInspections(tenantId: string, assetId?: string) {
    const where: any = { tenantId };
    if (assetId) where.assetId = assetId;
    return (this.prisma as any).inspection.findMany({ where, orderBy: { createdAt: 'desc' }, include: { asset: { select: { id: true, name: true } } } });
  }

  async createInspection(tenantId: string, dto: any) {
    return (this.prisma as any).inspection.create({
      data: { assetId: dto.assetId, title: dto.title, checklist: (dto.checklist as any) || [], notes: dto.notes, inspectedBy: dto.inspectedBy, inspectedAt: dto.inspectedAt ? new Date(dto.inspectedAt) : new Date(), tenantId },
    });
  }

  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const [total, activeMaintenance, openOrders, inspections] = await Promise.all([
      prismaAny.asset.count({ where: { tenantId } }),
      prismaAny.maintenancePlan.count({ where: { tenantId, status: 'active' } }),
      prismaAny.workOrder.count({ where: { tenantId, status: 'open' } }),
      prismaAny.inspection.count({ where: { tenantId } }),
    ]);
    return { totalAssets: total, activeMaintenances: activeMaintenance, openWorkOrders: openOrders, totalInspections: inspections };
  }
}
