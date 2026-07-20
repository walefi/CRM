import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getItems(tenantId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const where: any = { tenantId };
    if (dto.warehouseId) where.warehouseId = dto.warehouseId;
    if (dto.productId) where.productId = dto.productId;
    if (dto.search) where.productName = { contains: dto.search, mode: 'insensitive' };
    if (dto.status) where.status = dto.status;
    const page = dto.page || 1; const limit = dto.limit || 20; const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prismaAny.inventoryItem.findMany({ where, skip, take: limit, orderBy: { productName: 'asc' }, include: { warehouse: { select: { id: true, name: true } } } }),
      prismaAny.inventoryItem.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 } };
  }

  async getWarehouses(tenantId: string) {
    return (this.prisma as any).warehouse.findMany({ where: { tenantId, isActive: true }, orderBy: { name: 'asc' }, include: { _count: { select: { inventory: true } } } });
  }

  async getWarehouse(tenantId: string, id: string) {
    return (this.prisma as any).warehouse.findFirst({
      where: { id, tenantId },
      include: { inventory: { orderBy: { productName: 'asc' }, take: 50 }, movements: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
  }

  async getMovements(tenantId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const where: any = { tenantId };
    if (dto.warehouseId) where.warehouseId = dto.warehouseId;
    if (dto.type) where.type = dto.type;
    const page = dto.page || 1; const limit = dto.limit || 30; const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prismaAny.stockMovement.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prismaAny.stockMovement.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async createMovement(tenantId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const movement = await prismaAny.stockMovement.create({
      data: {
        warehouseId: dto.warehouseId, productId: dto.productId, type: dto.type || 'in',
        quantity: dto.quantity, reason: dto.reason, referenceType: dto.referenceType,
        referenceId: dto.referenceId, notes: dto.notes, tenantId, userId: dto.userId,
      },
    });

    if (dto.productId && dto.warehouseId) {
      const item = await prismaAny.inventoryItem.findFirst({
        where: { productId: dto.productId, warehouseId: dto.warehouseId, tenantId },
      });
      if (item) {
        const newQty = dto.type === 'out' || dto.type === 'reserve' ? item.quantity - dto.quantity : item.quantity + dto.quantity;
        const newReserved = dto.type === 'reserve' ? item.reserved + dto.quantity : dto.type === 'release' ? item.reserved - dto.quantity : item.reserved;
        await prismaAny.inventoryItem.update({
          where: { id: item.id },
          data: { quantity: Math.max(0, newQty), reserved: Math.max(0, newReserved), available: Math.max(0, newQty - Math.max(0, newReserved)) },
        });
      }
    }
    return movement;
  }

  async createAdjustment(tenantId: string, dto: any) {
    const prismaAny = this.prisma as any;
    await prismaAny.inventoryAdjustment.create({
      data: { warehouseId: dto.warehouseId, productId: dto.productId, sku: dto.sku, quantity: dto.quantity, reason: dto.reason || 'inventory_count', notes: dto.notes, tenantId, userId: dto.userId },
    });

    if (dto.productId && dto.warehouseId) {
      const item = await prismaAny.inventoryItem.findFirst({ where: { productId: dto.productId, warehouseId: dto.warehouseId, tenantId } });
      if (item) {
        const newQty = Math.max(0, dto.quantity);
        await prismaAny.inventoryItem.update({
          where: { id: item.id },
          data: { quantity: newQty, available: newQty - (item.reserved || 0) },
        });
      }
    }
    return { success: true };
  }

  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const [warehouses, totalItems, movements, totalStock] = await Promise.all([
      prismaAny.warehouse.count({ where: { tenantId, isActive: true } }),
      prismaAny.inventoryItem.count({ where: { tenantId } }),
      prismaAny.stockMovement.count({ where: { tenantId } }),
      prismaAny.inventoryItem.aggregate({ where: { tenantId }, _sum: { quantity: true, reserved: true, available: true } }),
    ]);
    return {
      warehouses, totalItems, totalMovements: movements,
      totalStock: totalStock._sum?.quantity || 0,
      totalReserved: totalStock._sum?.reserved || 0,
      totalAvailable: totalStock._sum?.available || 0,
    };
  }
}
