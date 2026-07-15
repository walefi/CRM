import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDealDto, UpdateDealDto, DealFilterDto } from './dto/deals.dto';

@Injectable()
export class DealsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filters: DealFilterDto) {
    const where: any = { tenantId, deletedAt: null };
    if (filters.status) where.status = filters.status;
    if (filters.pipelineId) where.pipelineId = filters.pipelineId;
    if (filters.stageId) where.stageId = filters.stageId;
    if (filters.ownerId) where.ownerId = filters.ownerId;
    if (filters.search) {
      const s = filters.search;
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
      ];
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;
    const orderBy: any = filters.sortBy
      ? { [filters.sortBy]: filters.sortOrder || 'desc' }
      : { createdAt: 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.deal.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          owner: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          company: { select: { id: true, name: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
          stage: { select: { id: true, name: true, color: true } },
          pipeline: { select: { id: true, name: true } },
        },
      }),
      this.prisma.deal.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findById(id: string, tenantId: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        stage: { select: { id: true, name: true, color: true } },
        pipeline: { select: { id: true, name: true } },
        tasks: { select: { id: true, title: true, status: true } },
        notes: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!deal) throw new NotFoundException('Deal not found');
    return deal;
  }

  async create(tenantId: string, dto: CreateDealDto, userId?: string) {
    return this.prisma.deal.create({
      data: { ...dto, tenantId, ownerId: dto.ownerId || userId },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        stage: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: string, tenantId: string, dto: UpdateDealDto) {
    await this.findById(id, tenantId);
    return this.prisma.deal.update({
      where: { id },
      data: dto,
      include: { stage: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    await this.prisma.deal.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async duplicate(id: string, tenantId: string) {
    const original = (await this.findById(id, tenantId)) as any;
    const { ...data } = original;
    return this.prisma.deal.create({
      data: { ...data, title: `${data.title} (Copia)`, createdAt: undefined },
      include: { owner: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async convertFromLead(tenantId: string, leadId: string, pipelineId?: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, tenantId } });
    if (!lead) throw new NotFoundException('Lead not found');

    const deal = await this.prisma.deal.create({
      data: {
        tenantId,
        title: `Deal - ${lead.firstName} ${lead.lastName}`,
        value: lead.value,
        companyId: lead.companyId,
        contactId: lead.contactId,
        ownerId: lead.ownerId,
        pipelineId,
      },
      include: { owner: { select: { id: true, firstName: true, lastName: true } } },
    });

    await this.prisma.lead.update({
      where: { id: leadId },
      data: { status: 'CONVERTED', convertedAt: new Date() },
    });

    return deal;
  }

  async getStats(tenantId: string) {
    const [total, byStatus, byPipeline, totalValue] = await Promise.all([
      this.prisma.deal.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.deal.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        _count: true,
      }),
      this.prisma.deal.groupBy({
        by: ['pipelineId'],
        where: { tenantId, deletedAt: null },
        _count: true,
      }),
      this.prisma.deal.aggregate({ where: { tenantId, deletedAt: null }, _sum: { value: true } }),
    ]);

    return { total, byStatus, byPipeline, totalValue: totalValue._sum.value || 0 };
  }
}
