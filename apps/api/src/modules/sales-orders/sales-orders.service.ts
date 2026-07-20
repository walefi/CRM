import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SalesOrdersService {
  private readonly logger = new Logger(SalesOrdersService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getOrders(tenantId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const where: any = { tenantId };
    if (dto.status) where.status = dto.status;
    if (dto.search) where.orderNumber = { contains: dto.search, mode: 'insensitive' };
    const page = dto.page || 1; const limit = dto.limit || 20; const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prismaAny.salesOrder.findMany({ where, skip, take: limit, orderBy: { updatedAt: 'desc' }, include: { items: true, history: { take: 1, orderBy: { createdAt: 'desc' } } } }),
      prismaAny.salesOrder.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 } };
  }

  async getOrder(tenantId: string, id: string) {
    const prismaAny = this.prisma as any;
    const order = await prismaAny.salesOrder.findFirst({
      where: { id, tenantId },
      include: { items: true, history: { orderBy: { createdAt: 'desc' } } },
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  async createOrder(tenantId: string, userId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const orderNumber = `SO-${Date.now().toString(36).toUpperCase()}`;
    const subtotal = dto.items?.reduce((s: number, i: any) => s + (i.unitPrice || 0) * (i.quantity || 1), 0) || 0;
    const discount = dto.discount || 0;
    const tax = dto.tax || 0;
    const total = subtotal - discount + tax;

    const order = await prismaAny.salesOrder.create({
      data: {
        orderNumber, status: 'draft', quoteId: dto.quoteId, contactId: dto.contactId,
        companyId: dto.companyId, dealId: dto.dealId, subtotal, discount, tax, total,
        currency: dto.currency || 'BRL', notes: dto.notes,
        billingAddress: (dto.billingAddress as any), shippingAddress: (dto.shippingAddress as any),
        paymentTerms: dto.paymentTerms, shippingTerms: dto.shippingTerms,
        tags: dto.tags || [], metadata: (dto.metadata as any) || {}, tenantId, createdBy: userId,
        items: dto.items?.length ? {
          create: dto.items.map((i: any) => ({
            productId: i.productId, name: i.name, description: i.description,
            quantity: i.quantity || 1, unitPrice: i.unitPrice || 0,
            total: (i.unitPrice || 0) * (i.quantity || 1), discount: i.discount || 0,
            tax: i.tax || 0, notes: i.notes,
          })),
        } : undefined,
      },
      include: { items: true },
    });

    await prismaAny.salesOrderHistory.create({ data: { orderId: order.id, action: 'created', userId } });
    return order;
  }

  async updateOrder(tenantId: string, id: string, userId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const data: any = {};
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.status) data.status = dto.status;
    if (dto.tags) data.tags = dto.tags;
    if (dto.paymentTerms) data.paymentTerms = dto.paymentTerms;
    if (dto.shippingTerms) data.shippingTerms = dto.shippingTerms;
    await prismaAny.salesOrderHistory.create({ data: { orderId: id, action: 'updated', userId } });
    return prismaAny.salesOrder.update({ where: { id }, data, include: { items: true } });
  }

  async deleteOrder(tenantId: string, id: string) {
    const prismaAny = this.prisma as any;
    await prismaAny.salesOrderItem.deleteMany({ where: { orderId: id } });
    await prismaAny.salesOrderHistory.deleteMany({ where: { orderId: id } });
    await prismaAny.salesOrder.deleteMany({ where: { id, tenantId } });
  }

  async convertFromQuote(tenantId: string, userId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const quote = await (this.prisma as any).quote.findFirst({
      where: { id: dto.quoteId, tenantId },
      include: { items: { include: { product: true } } },
    });
    if (!quote) throw new NotFoundException('Quote not found');

    const items = (quote.items || []).map((qi: any) => ({
      productId: qi.product?.id, name: qi.product?.name || qi.title || 'Item',
      description: qi.description, quantity: qi.quantity || 1,
      unitPrice: Number(qi.unitPrice || qi.product?.price || 0),
      total: Number(qi.total || 0), discount: 0, tax: 0,
    }));

    const subtotal = items.reduce((s: number, i: any) => s + i.total, 0);
    return this.createOrder(tenantId, userId, {
      quoteId: quote.id, contactId: quote.contactId, companyId: quote.companyId,
      dealId: quote.dealId, items, subtotal, total: subtotal,
      notes: `Converted from quote #${quote.quoteNumber || quote.id.slice(0, 8)}`,
    });
  }

  async approveOrder(tenantId: string, id: string, userId: string) {
    const prismaAny = this.prisma as any;
    await prismaAny.salesOrderHistory.create({ data: { orderId: id, action: 'approved', userId } });
    return prismaAny.salesOrder.update({ where: { id }, data: { status: 'approved', approvedAt: new Date(), approvedBy: userId } });
  }

  async cancelOrder(tenantId: string, id: string, userId: string) {
    const prismaAny = this.prisma as any;
    await prismaAny.salesOrderHistory.create({ data: { orderId: id, action: 'cancelled', userId } });
    return prismaAny.salesOrder.update({ where: { id }, data: { status: 'cancelled', cancelledAt: new Date() } });
  }

  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const [total, draft, approved, today, totalValue] = await Promise.all([
      prismaAny.salesOrder.count({ where: { tenantId } }),
      prismaAny.salesOrder.count({ where: { tenantId, status: 'draft' } }),
      prismaAny.salesOrder.count({ where: { tenantId, status: 'approved' } }),
      prismaAny.salesOrder.count({ where: { tenantId, createdAt: { gte: todayStart } } }),
      prismaAny.salesOrder.aggregate({ where: { tenantId, status: 'approved' }, _sum: { total: true } }),
    ]);
    return { total, draft, approved, createdToday: today, totalApprovedValue: totalValue._sum?.total || 0 };
  }
}
