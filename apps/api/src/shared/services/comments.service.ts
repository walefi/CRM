import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, entity: string, entityId: string) {
    return this.prisma.note.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(entity === 'contact' ? { contactId: entityId } : {}),
        ...(entity === 'deal' ? { dealId: entityId } : {}),
        ...(entity === 'company' ? { companyId: entityId } : {}),
        ...(entity === 'lead' ? { leadId: entityId } : {}),
      },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    tenantId: string,
    userId: string,
    entity: string,
    entityId: string,
    content: string,
  ) {
    const note = await this.prisma.note.create({
      data: {
        tenantId,
        userId,
        content,
        ...(entity === 'contact' ? { contactId: entityId } : {}),
        ...(entity === 'deal' ? { dealId: entityId } : {}),
        ...(entity === 'company' ? { companyId: entityId } : {}),
        ...(entity === 'lead' ? { leadId: entityId } : {}),
      },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    });

    return note;
  }

  async update(id: string, tenantId: string, content: string) {
    return this.prisma.note.update({
      where: { id },
      data: { content },
    });
  }

  async remove(id: string, _tenantId: string) {
    await this.prisma.note.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
