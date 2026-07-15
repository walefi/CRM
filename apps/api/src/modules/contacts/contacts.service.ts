import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContactDto, UpdateContactDto, ContactFilterDto } from './dto/contacts.dto';
import { EventBusService } from '../../infrastructure/event-bus/event-bus.service';
import { ContactCreatedEvent } from '../../infrastructure/event-bus/domain-events';

@Injectable()
export class ContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  async findAll(tenantId: string, filters: ContactFilterDto) {
    const where: any = { tenantId, deletedAt: null };
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.ownerId) where.ownerId = filters.ownerId;
    if (filters.search) {
      const s = filters.search;
      where.OR = [
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
      ];
    }
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.contact.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          company: { select: { id: true, name: true } },
        },
      }),
      this.prisma.contact.count({ where }),
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
    const c = await this.prisma.contact.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        company: { select: { id: true, name: true } },
        deals: { select: { id: true, title: true, status: true, value: true } },
        noteRecords: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!c) throw new NotFoundException('Contact not found');
    return c;
  }

  async create(tenantId: string, dto: CreateContactDto, userId?: string) {
    const contact = await this.prisma.contact.create({
      data: { ...dto, tenantId, ownerId: dto.ownerId || userId },
      include: { owner: { select: { id: true, firstName: true, lastName: true } } },
    });

    this.eventBus
      .publish(new ContactCreatedEvent(contact as any, tenantId, userId))
      .catch(() => {});

    return contact;
  }

  async update(id: string, tenantId: string, dto: UpdateContactDto) {
    await this.findById(id, tenantId);
    return this.prisma.contact.update({ where: { id }, data: dto });
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    await this.prisma.contact.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async getStats(tenantId: string) {
    const [total, byCompany] = await Promise.all([
      this.prisma.contact.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.contact.groupBy({
        by: ['companyId'],
        where: { tenantId, deletedAt: null },
        _count: true,
      }),
    ]);
    return { total, byCompany };
  }
}
