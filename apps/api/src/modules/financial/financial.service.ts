import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FinancialService {
  constructor(private readonly prisma: PrismaService) {}

  async getTransactions(tenantId: string, dto: any) {
    const where: any = { tenantId };
    if (dto.type) where.type = dto.type;
    if (dto.status) where.status = dto.status;
    if (dto.category) where.category = dto.category;
    const page = dto.page || 1; const limit = dto.limit || 20; const skip = (page - 1) * limit;
    const prismaAny = this.prisma as any;
    const [data, total] = await Promise.all([
      prismaAny.financialTransaction.findMany({ where, skip, take: limit, orderBy: { dueDate: 'desc' } }),
      prismaAny.financialTransaction.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 } };
  }

  async createTransaction(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).financialTransaction.create({
      data: { description: dto.description, amount: dto.amount, type: dto.type || 'expense', category: dto.category, status: dto.status || 'pending', dueDate: new Date(dto.dueDate), referenceType: dto.referenceType, referenceId: dto.referenceId, notes: dto.notes, costCenterId: dto.costCenterId, tenantId, createdBy: userId },
    });
  }

  async getReceivables(tenantId: string) {
    const prismaAny = this.prisma as any;
    return prismaAny.receivable.findMany({
      where: { tenantId }, orderBy: { dueDate: 'asc' }, include: { payments: true },
    });
  }

  async createReceivable(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).receivable.create({
      data: { description: dto.description, amount: dto.amount, status: dto.status || 'pending', dueDate: new Date(dto.dueDate), customer: dto.customer, installments: dto.installments || 1, notes: dto.notes, tenantId, createdBy: userId },
    });
  }

  async recordReceipt(tenantId: string, dto: any) {
    const prismaAny = this.prisma as any;
    await prismaAny.receivablePayment.create({
      data: { receivableId: dto.receivableId, amount: dto.amount, method: dto.method || 'pix', notes: dto.notes },
    });
    const receivable = await prismaAny.receivable.findUnique({ where: { id: dto.receivableId } });
    const totalPaid = await prismaAny.receivablePayment.aggregate({ where: { receivableId: dto.receivableId }, _sum: { amount: true } });
    const paidAmount = totalPaid._sum?.amount || 0;
    await prismaAny.receivable.update({
      where: { id: dto.receivableId },
      data: { paidAmount, status: paidAmount >= (receivable?.amount || 0) ? 'paid' : 'partial', paidAt: paidAmount >= (receivable?.amount || 0) ? new Date() : undefined },
    });
    return { success: true, totalPaid: paidAmount };
  }

  async getPayables(tenantId: string) {
    const prismaAny = this.prisma as any;
    return prismaAny.payable.findMany({
      where: { tenantId }, orderBy: { dueDate: 'asc' }, include: { payments: true },
    });
  }

  async createPayable(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).payable.create({
      data: { description: dto.description, amount: dto.amount, status: dto.status || 'pending', dueDate: new Date(dto.dueDate), supplier: dto.supplier, installments: dto.installments || 1, notes: dto.notes, tenantId, createdBy: userId },
    });
  }

  async recordPayment(tenantId: string, dto: any) {
    const prismaAny = this.prisma as any;
    await prismaAny.payablePayment.create({
      data: { payableId: dto.payableId, amount: dto.amount, method: dto.method || 'pix', notes: dto.notes },
    });
    const payable = await prismaAny.payable.findUnique({ where: { id: dto.payableId } });
    const totalPaid = await prismaAny.payablePayment.aggregate({ where: { payableId: dto.payableId }, _sum: { amount: true } });
    const paidAmount = totalPaid._sum?.amount || 0;
    await prismaAny.payable.update({
      where: { id: dto.payableId },
      data: { paidAmount, status: paidAmount >= (payable?.amount || 0) ? 'paid' : 'partial', paidAt: paidAmount >= (payable?.amount || 0) ? new Date() : undefined },
    });
    return { success: true, totalPaid: paidAmount };
  }

  async getCashFlow(tenantId: string, period?: string) {
    const prismaAny = this.prisma as any;
    const now = new Date();
    let startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    if (period === 'year') startDate = new Date(now.getFullYear(), 0, 1);

    const flows = await prismaAny.cashFlow.findMany({
      where: { tenantId, date: { gte: startDate } }, orderBy: { date: 'asc' },
    });

    const income = flows.filter((f: any) => f.type === 'in').reduce((s: number, f: any) => s + f.amount, 0);
    const expense = flows.filter((f: any) => f.type === 'out').reduce((s: number, f: any) => s + f.amount, 0);

    return { entries: flows, summary: { income, expense, balance: income - expense, period: period || 'month' } };
  }

  async createCashMovement(tenantId: string, dto: any) {
    return (this.prisma as any).cashFlow.create({
      data: { description: dto.description, amount: dto.amount, type: dto.type || 'in', date: new Date(dto.date), category: dto.category, referenceType: dto.referenceType, referenceId: dto.referenceId, tenantId },
    });
  }

  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const [transactions, receivables, payables, flows] = await Promise.all([
      prismaAny.financialTransaction.count({ where: { tenantId } }),
      prismaAny.receivable.aggregate({ where: { tenantId }, _sum: { amount: true, paidAmount: true } }),
      prismaAny.payable.aggregate({ where: { tenantId }, _sum: { amount: true, paidAmount: true } }),
      prismaAny.cashFlow.count({ where: { tenantId } }),
    ]);
    return {
      transactions, cashFlowEntries: flows,
      totalReceivables: receivables._sum?.amount || 0, receivedAmount: receivables._sum?.paidAmount || 0,
      totalPayables: payables._sum?.amount || 0, paidAmount: payables._sum?.paidAmount || 0,
    };
  }
}
