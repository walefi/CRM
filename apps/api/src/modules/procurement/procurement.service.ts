import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProcurementService {
  private readonly logger = new Logger(ProcurementService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getSuppliers(tenantId: string, dto: any) {
    const where: any = { tenantId };
    if (dto.search) where.name = { contains: dto.search, mode: 'insensitive' };
    if (dto.category) where.category = dto.category;
    const page = dto.page || 1; const limit = dto.limit || 20; const skip = (page - 1) * limit;
    const prismaAny = this.prisma as any;
    const [data, total] = await Promise.all([
      prismaAny.supplier.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
      prismaAny.supplier.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 } };
  }

  async createSupplier(tenantId: string, dto: any) {
    return (this.prisma as any).supplier.create({
      data: { name: dto.name, contact: dto.contact, email: dto.email, phone: dto.phone, category: dto.category, notes: dto.notes, tenantId },
    });
  }

  async getRequests(tenantId: string, dto: any) {
    const where: any = { tenantId };
    if (dto.status) where.status = dto.status;
    const page = dto.page || 1; const limit = dto.limit || 20; const skip = (page - 1) * limit;
    const prismaAny = this.prisma as any;
    const [data, total] = await Promise.all([
      prismaAny.purchaseRequest.findMany({ where, skip, take: limit, orderBy: { updatedAt: 'desc' }, include: { items: true } }),
      prismaAny.purchaseRequest.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 } };
  }

  async createRequest(tenantId: string, userId: string, dto: any) {
    const prismaAny = this.prisma as any;
    return prismaAny.purchaseRequest.create({
      data: {
        title: dto.title, description: dto.description, priority: dto.priority || 'normal', notes: dto.notes, tenantId, createdBy: userId,
        items: dto.items?.length ? { create: dto.items.map((i: any) => ({ name: i.name, quantity: i.quantity || 1, unit: i.unit, notes: i.notes })) } : undefined,
      },
      include: { items: true },
    });
  }

  async getOrders(tenantId: string, dto: any) {
    const where: any = { tenantId };
    if (dto.status) where.status = dto.status;
    if (dto.supplierId) where.supplierId = dto.supplierId;
    const page = dto.page || 1; const limit = dto.limit || 20; const skip = (page - 1) * limit;
    const prismaAny = this.prisma as any;
    const [data, total] = await Promise.all([
      prismaAny.purchaseOrder.findMany({ where, skip, take: limit, orderBy: { updatedAt: 'desc' }, include: { items: true, supplier: { select: { id: true, name: true } } } }),
      prismaAny.purchaseOrder.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 } };
  }

  async createOrder(tenantId: string, userId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const orderNumber = `PO-${Date.now().toString(36).toUpperCase()}`;
    const subtotal = dto.items?.reduce((s: number, i: any) => s + (i.unitPrice || 0) * (i.quantity || 1), 0) || 0;
    return prismaAny.purchaseOrder.create({
      data: {
        orderNumber, supplierId: dto.supplierId, status: 'draft', subtotal, total: subtotal,
        notes: dto.notes, tenantId, createdBy: userId,
        items: dto.items?.length ? { create: dto.items.map((i: any) => ({ name: i.name, quantity: i.quantity || 1, unitPrice: i.unitPrice || 0, total: (i.unitPrice || 0) * (i.quantity || 1), notes: i.notes })) } : undefined,
      },
      include: { items: true },
    });
  }

  async approveOrder(tenantId: string, id: string, userId: string) {
    return (this.prisma as any).purchaseOrder.update({
      where: { id }, data: { status: 'approved', approvedAt: new Date(), approvedBy: userId },
    });
  }

  async getReceivings(tenantId: string) {
    return (this.prisma as any).receiving.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, include: { items: true }, take: 20 });
  }

  async createReceiving(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).receiving.create({
      data: {
        orderId: dto.orderId, notes: dto.notes, status: 'pending', tenantId, createdBy: userId,
        items: dto.items?.length ? { create: dto.items.map((i: any) => ({ name: i.name, quantity: i.quantity || 0, expected: i.expected || 1, notes: i.notes })) } : undefined,
      },
      include: { items: true },
    });
  }

  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const [suppliers, requests, orders, receivings] = await Promise.all([
      prismaAny.supplier.count({ where: { tenantId } }),
      prismaAny.purchaseRequest.count({ where: { tenantId } }),
      prismaAny.purchaseOrder.count({ where: { tenantId } }),
      prismaAny.receiving.count({ where: { tenantId } }),
    ]);
    return { suppliers, purchaseRequests: requests, purchaseOrders: orders, receivings };
  }
}
