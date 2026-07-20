import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SignaturesService {
  private readonly logger = new Logger(SignaturesService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getRequests(tenantId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const where: any = { tenantId };
    if (dto.status) where.status = dto.status;
    if (dto.search) where.title = { contains: dto.search, mode: 'insensitive' };
    const page = dto.page || 1; const limit = dto.limit || 20; const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prismaAny.signatureRequest.findMany({ where, skip, take: limit, orderBy: { updatedAt: 'desc' }, include: { signers: true } }),
      prismaAny.signatureRequest.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 } };
  }

  async getRequest(tenantId: string, id: string) {
    const prismaAny = this.prisma as any;
    const req = await prismaAny.signatureRequest.findFirst({
      where: { id, tenantId }, include: { signers: { orderBy: { order: 'asc' } }, audit: { orderBy: { createdAt: 'desc' } } },
    });
    if (!req) throw new NotFoundException(`Signature request ${id} not found`);
    return req;
  }

  async createRequest(tenantId: string, userId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const req = await prismaAny.signatureRequest.create({
      data: {
        title: dto.title, description: dto.description, workflow: dto.workflow || 'single',
        provider: dto.provider || 'generic', documentId: dto.documentId, documentHash: dto.documentHash,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined, tenantId, createdBy: userId,
        signers: dto.signers?.length ? {
          create: dto.signers.map((s: any, i: number) => ({
            name: s.name, email: s.email, role: s.role || 'signer', order: s.order ?? i,
          })),
        } : undefined,
      },
      include: { signers: true },
    });

    await prismaAny.signatureAudit.create({ data: { requestId: req.id, action: 'created' } });
    return req;
  }

  async updateRequest(tenantId: string, id: string, dto: any) {
    const prismaAny = this.prisma as any;
    const data: any = {};
    if (dto.title) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.status) data.status = dto.status;
    return prismaAny.signatureRequest.update({ where: { id }, data });
  }

  async deleteRequest(tenantId: string, id: string) {
    const prismaAny = this.prisma as any;
    await prismaAny.signatureSigner.deleteMany({ where: { requestId: id } });
    await prismaAny.signatureAudit.deleteMany({ where: { requestId: id } });
    await prismaAny.signatureRequest.deleteMany({ where: { id, tenantId } });
  }

  async sendRequest(tenantId: string, id: string) {
    const prismaAny = this.prisma as any;
    await prismaAny.signatureAudit.create({ data: { requestId: id, action: 'sent' } });
    return prismaAny.signatureRequest.update({ where: { id }, data: { status: 'sent', sentAt: new Date() }, include: { signers: true } });
  }

  async cancelRequest(tenantId: string, id: string) {
    const prismaAny = this.prisma as any;
    await prismaAny.signatureAudit.create({ data: { requestId: id, action: 'cancelled' } });
    return prismaAny.signatureRequest.update({ where: { id }, data: { status: 'cancelled' } });
  }

  async sendReminder(tenantId: string, id: string) {
    const prismaAny = this.prisma as any;
    await prismaAny.signatureAudit.create({ data: { requestId: id, action: 'reminder_sent' } });
    return { success: true, message: 'Reminder sent' };
  }

  async handleWebhook(tenantId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const { requestId, signerEmail, action, metadata } = dto;

    if (requestId && signerEmail) {
      const signer = await prismaAny.signatureSigner.findFirst({ where: { requestId, email: signerEmail } });
      if (signer) {
        const updateData: any = {};
        if (action === 'signed') updateData.signedAt = new Date();
        if (action === 'viewed') updateData.status = 'viewed';
        if (action === 'signed' || action === 'rejected') updateData.status = action;
        await prismaAny.signatureSigner.update({ where: { id: signer.id }, data: updateData });
      }

      const allSigned = await prismaAny.signatureSigner.findMany({ where: { requestId } });
      const allDone = allSigned.every((s: any) => s.status === 'signed');
      if (allDone && action === 'signed') {
        await prismaAny.signatureRequest.update({ where: { id: requestId }, data: { status: 'signed', completedAt: new Date() } });
      }
    }

    await prismaAny.signatureAudit.create({ data: { requestId, signerId: signerEmail, action: `webhook_${action}`, metadata: (metadata as any) || {} } });
    return { success: true };
  }

  async getTemplates(tenantId: string) {
    return (this.prisma as any).signatureTemplate.findMany({ where: { tenantId, isActive: true }, orderBy: { createdAt: 'desc' } });
  }

  async createTemplate(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).signatureTemplate.create({
      data: { name: dto.name, description: dto.description, workflow: dto.workflow || 'single', signers: (dto.signers as any) || [], tenantId, createdBy: userId },
    });
  }

  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const [total, pending, signed, templates] = await Promise.all([
      prismaAny.signatureRequest.count({ where: { tenantId } }),
      prismaAny.signatureRequest.count({ where: { tenantId, status: { in: ['draft', 'sent', 'in_progress'] } } }),
      prismaAny.signatureRequest.count({ where: { tenantId, status: 'signed' } }),
      prismaAny.signatureTemplate.count({ where: { tenantId, isActive: true } }),
    ]);
    return { total, pending, signed, templates };
  }
}
