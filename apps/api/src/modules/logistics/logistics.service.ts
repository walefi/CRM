import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LogisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getShipments(tenantId: string, dto: any) {
    const where: any = { tenantId };
    if (dto.status) where.status = dto.status;
    const page = dto.page || 1; const limit = dto.limit || 20; const skip = (page - 1) * limit;
    const prismaAny = this.prisma as any;
    const [data, total] = await Promise.all([
      prismaAny.shipment.findMany({ where, skip, take: limit, orderBy: { updatedAt: 'desc' }, include: { items: true } }),
      prismaAny.shipment.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 } };
  }

  async createShipment(tenantId: string, userId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const referenceNumber = `SHP-${Date.now().toString(36).toUpperCase()}`;
    return prismaAny.shipment.create({
      data: {
        referenceNumber, orderId: dto.orderId, status: 'pending', carrier: dto.carrier,
        trackingCode: dto.trackingCode, origin: dto.origin, destination: dto.destination,
        packages: dto.packages || 1, weight: dto.weight, cost: dto.cost || 0, notes: dto.notes, tenantId, createdBy: userId,
        items: dto.items?.length ? { create: dto.items.map((i: any) => ({ name: i.name, quantity: i.quantity || 1, notes: i.notes })) } : undefined,
      },
      include: { items: true },
    });
  }

  async getDeliveries(tenantId: string, dto: any) {
    const where: any = { tenantId };
    if (dto.status) where.status = dto.status;
    const page = dto.page || 1; const limit = dto.limit || 20; const skip = (page - 1) * limit;
    const prismaAny = this.prisma as any;
    const [data, total] = await Promise.all([
      prismaAny.delivery.findMany({ where, skip, take: limit, orderBy: { scheduledAt: 'desc' } }),
      prismaAny.delivery.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 } };
  }

  async createDelivery(tenantId: string, dto: any) {
    return (this.prisma as any).delivery.create({
      data: { shipmentId: dto.shipmentId, status: dto.status || 'pending', driver: dto.driver, vehicle: dto.vehicle, route: dto.route, scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined, notes: dto.notes, tenantId },
    });
  }

  async submitPOD(tenantId: string, dto: any) {
    return (this.prisma as any).delivery.update({
      where: { id: dto.deliveryId },
      data: { status: 'delivered', deliveredAt: new Date(), podPhoto: dto.podPhoto, podSignature: dto.podSignature, notes: dto.notes },
    });
  }

  async getCarriers(tenantId: string) {
    return (this.prisma as any).carrier.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  async createCarrier(tenantId: string, dto: any) {
    return (this.prisma as any).carrier.create({
      data: { name: dto.name, contact: dto.contact, phone: dto.phone, email: dto.email, status: 'active', notes: dto.notes, tenantId },
    });
  }

  async getPicking(tenantId: string) {
    return (this.prisma as any).pickingOrder.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async createPicking(tenantId: string, dto: any) {
    return (this.prisma as any).pickingOrder.create({
      data: { orderId: dto.orderId, status: 'pending', assignedToId: dto.assignedToId, items: (dto.items as any) || [], notes: dto.notes, tenantId },
    });
  }

  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const [shipments, pending, deliveries, carriers, picking] = await Promise.all([
      prismaAny.shipment.count({ where: { tenantId } }),
      prismaAny.shipment.count({ where: { tenantId, status: 'pending' } }),
      prismaAny.delivery.count({ where: { tenantId } }),
      prismaAny.carrier.count({ where: { tenantId } }),
      prismaAny.pickingOrder.count({ where: { tenantId } }),
    ]);
    return { totalShipments: shipments, pendingShipments: pending, totalDeliveries: deliveries, carriers, pickingOrders: picking };
  }
}
