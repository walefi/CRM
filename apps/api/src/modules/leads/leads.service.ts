import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityService } from '../../shared/services/entity.service';
import { EventBusService } from '../../infrastructure/event-bus/event-bus.service';
import { LeadCreatedEvent, LeadConvertedEvent } from '../../infrastructure/event-bus/domain-events';
import { CreateLeadDto, UpdateLeadDto, LeadFilterDto, ConvertLeadDto } from './dto/leads.dto';

@Injectable()
export class LeadsService extends EntityService<CreateLeadDto, UpdateLeadDto> {
  constructor(
    protected readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma, prisma.lead, 'Lead');
  }

  protected getSearchableFields(): string[] {
    return ['firstName', 'lastName', 'email', 'phone', 'companyName'];
  }

  async findAll(tenantId: string, filters: LeadFilterDto) {
    const where: any = { tenantId, deletedAt: null };

    if (filters.status) where.status = filters.status;
    if (filters.source) where.source = filters.source;
    if (filters.ownerId) where.ownerId = filters.ownerId;
    if (filters.search) {
      const s = filters.search;
      where.OR = [
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
        { companyName: { contains: s, mode: 'insensitive' } },
      ];
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;
    const orderBy: any = filters.sortBy
      ? { [filters.sortBy]: filters.sortOrder || 'desc' }
      : { createdAt: 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          owner: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        },
      }),
      this.prisma.lead.count({ where }),
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
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return lead;
  }

  async create(tenantId: string, dto: CreateLeadDto, userId?: string) {
    const lead = await this.prisma.lead.create({
      data: { ...dto, tenantId, ownerId: dto.ownerId || userId },
      include: { owner: { select: { id: true, firstName: true, lastName: true } } },
    });
    this.logger.log(`Lead "${lead.firstName} ${lead.lastName}" created`);
    this.eventBus
      .publish(new LeadCreatedEvent(lead as Record<string, unknown>, tenantId, userId))
      .catch(() => {});
    return lead;
  }

  async update(id: string, tenantId: string, dto: UpdateLeadDto) {
    await this.findById(id, tenantId);
    return this.prisma.lead.update({
      where: { id },
      data: dto,
      include: { owner: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async convert(tenantId: string, leadId: string, dto: ConvertLeadDto, _userId: string) {
    const lead = (await this.findById(leadId, tenantId)) as any;
    if (!lead) throw new Error('Lead not found');

    let result: any = {};

    if (dto.target === 'contact') {
      result = await this.prisma.contact.create({
        data: {
          tenantId,
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          companyId: lead.companyId,
          ownerId: lead.ownerId,
          description: `Converted from lead ${lead.id}`,
        },
      });
      this.logger.log(`Lead ${leadId} converted to contact ${result.id}`);
    }

    if (dto.target === 'company') {
      result = await this.prisma.company.create({
        data: {
          tenantId,
          name: lead.companyName || `${lead.firstName} ${lead.lastName}`,
          email: lead.email,
          phone: lead.phone,
          ownerId: lead.ownerId,
        },
      });
      this.logger.log(`Lead ${leadId} converted to company ${result.id}`);
    }

    if (dto.target === 'deal') {
      result = await this.prisma.deal.create({
        data: {
          tenantId,
          title: `Deal - ${lead.firstName} ${lead.lastName}`,
          value: lead.value,
          ownerId: lead.ownerId,
          companyId: lead.companyId,
        },
      });
      this.logger.log(`Lead ${leadId} converted to deal ${result.id}`);
    }

    await this.prisma.lead.update({
      where: { id: leadId },
      data: { status: 'CONVERTED', convertedAt: new Date() },
    });

    this.eventBus
      .publish(
        new LeadConvertedEvent(
          { leadId, target: dto.target, resultId: result.id },
          tenantId,
          _userId,
        ),
      )
      .catch(() => {});

    return { success: true, target: dto.target, result };
  }

  async getStats(tenantId: string) {
    const [total, byStatus, bySource] = await Promise.all([
      this.prisma.lead.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        _count: true,
      }),
      this.prisma.lead.groupBy({
        by: ['source'],
        where: { tenantId, deletedAt: null },
        _count: true,
      }),
    ]);

    return { total, byStatus, bySource };
  }
}
