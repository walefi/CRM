import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getInvoices(tenantId: string, dto: any) {
    const where: any = { tenantId };
    if (dto.status) where.status = dto.status;
    if (dto.type) where.type = dto.type;
    const page = dto.page || 1; const limit = dto.limit || 20; const skip = (page - 1) * limit;
    const prismaAny = this.prisma as any;
    const [data, total] = await Promise.all([
      prismaAny.invoice.findMany({ where, skip, take: limit, orderBy: { updatedAt: 'desc' }, include: { items: true, payments: true } }),
      prismaAny.invoice.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 } };
  }

  async createInvoice(tenantId: string, userId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
    const amount = dto.items?.reduce((s: number, i: any) => s + (i.unitPrice || 0) * (i.quantity || 1), 0) || dto.amount || 0;
    const taxAmount = dto.items?.reduce((s: number, i: any) => s + (i.tax || 0), 0) || dto.taxAmount || 0;

    return prismaAny.invoice.create({
      data: {
        invoiceNumber, orderId: dto.orderId, description: dto.description, amount, taxAmount,
        type: dto.type || 'invoice', status: 'draft', dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        notes: dto.notes, tenantId, createdBy: userId,
        items: dto.items?.length ? { create: dto.items.map((i: any) => ({ name: i.name, quantity: i.quantity || 1, unitPrice: i.unitPrice || 0, total: (i.unitPrice || 0) * (i.quantity || 1), tax: i.tax || 0, taxType: i.taxType })) } : undefined,
      },
      include: { items: true },
    });
  }

  async issueInvoice(tenantId: string, id: string) {
    const prismaAny = this.prisma as any;
    const fiscalNumber = `NF-${Date.now().toString(36).toUpperCase().substring(0, 8)}`;
    return prismaAny.invoice.update({
      where: { id }, data: { status: 'issued', issuedAt: new Date(), fiscalNumber },
    });
  }

  async cancelInvoice(tenantId: string, id: string) {
    return (this.prisma as any).invoice.update({
      where: { id }, data: { status: 'cancelled', cancelledAt: new Date() },
    });
  }

  async getBillings(tenantId: string) {
    return (this.prisma as any).billing.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async createBilling(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).billing.create({
      data: { name: dto.name, description: dto.description, amount: dto.amount, frequency: dto.frequency || 'once', startDate: dto.startDate ? new Date(dto.startDate) : undefined, endDate: dto.endDate ? new Date(dto.endDate) : undefined, notes: dto.notes, tenantId, createdBy: userId },
    });
  }

  async getPayments(tenantId: string) {
    return (this.prisma as any).payment.findMany({
      where: { tenantId }, orderBy: { createdAt: 'desc' }, include: { invoice: { select: { id: true, invoiceNumber: true } } }, take: 30,
    });
  }

  async createPayment(tenantId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const pixCode = dto.method === 'pix' ? `PIX-${crypto.randomUUID().replace(/-/g, '').substring(0, 32)}` : undefined;
    const boletoUrl = dto.method === 'boleto' ? `https://boleto.example.com/${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}` : undefined;
    const boletoCode = dto.method === 'boleto' ? `34191.${Date.now().toString().substring(0, 10)}` : undefined;

    return prismaAny.payment.create({
      data: {
        invoiceId: dto.invoiceId, amount: dto.amount, method: dto.method || 'pix',
        status: dto.status || 'confirmed', pixCode, boletoUrl, boletoCode,
        paidAt: new Date(), notes: dto.notes, tenantId,
      },
    });
  }

  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const [invoices, issued, payments, billings] = await Promise.all([
      prismaAny.invoice.count({ where: { tenantId } }),
      prismaAny.invoice.count({ where: { tenantId, status: 'issued' } }),
      prismaAny.payment.count({ where: { tenantId, status: 'confirmed' } }),
      prismaAny.billing.count({ where: { tenantId, status: 'active' } }),
    ]);
    return { totalInvoices: invoices, issuedInvoices: issued, confirmedPayments: payments, activeBillings: billings };
  }
}
