import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCompanyDto, UpdateCompanyDto, CompanySettingsDto } from './dto/companies.dto';
import { EventBusService } from '../../infrastructure/event-bus/event-bus.service';
import { CompanyCreatedEvent } from '../../infrastructure/event-bus/domain-events';

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  async findAll(tenantId: string) {
    return this.prisma.company.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        legalName: true,
        cnpj: true,
        email: true,
        phone: true,
        website: true,
        industry: true,
        size: true,
        logo: true,
        address: true,
        description: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findById(id: string, tenantId: string) {
    const company = await this.prisma.company.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: {
        id: true,
        name: true,
        legalName: true,
        cnpj: true,
        email: true,
        phone: true,
        website: true,
        industry: true,
        size: true,
        revenue: true,
        employees: true,
        logo: true,
        address: true,
        description: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            contacts: true,
            leads: true,
            deals: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  async create(tenantId: string, dto: CreateCompanyDto, ownerId?: string) {
    const company = await this.prisma.company.create({
      data: {
        ...dto,
        tenantId,
        ownerId,
      },
      select: {
        id: true,
        name: true,
        legalName: true,
        cnpj: true,
        email: true,
        phone: true,
        website: true,
        industry: true,
        logo: true,
        createdAt: true,
      },
    });

    this.logger.log(`Company "${company.name}" created in tenant ${tenantId}`);

    this.eventBus
      .publish(new CompanyCreatedEvent(company as any, tenantId, ownerId))
      .catch(() => {});

    return company;
  }

  async update(id: string, tenantId: string, dto: UpdateCompanyDto) {
    const company = await this.prisma.company.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const updated = await this.prisma.company.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        name: true,
        legalName: true,
        cnpj: true,
        email: true,
        phone: true,
        website: true,
        industry: true,
        logo: true,
        updatedAt: true,
      },
    });

    this.logger.log(`Company "${id}" updated`);

    return updated;
  }

  async remove(id: string, tenantId: string) {
    const company = await this.prisma.company.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    await this.prisma.company.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`Company "${id}" soft-deleted`);
  }

  async getSettings(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        logo: true,
        plan: true,
        status: true,
        settings: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return {
      ...tenant,
      settings: tenant.settings || {},
    };
  }

  async updateSettings(tenantId: string, dto: CompanySettingsDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const currentSettings = (tenant.settings as Record<string, unknown>) || {};
    const newSettings = { ...currentSettings, ...dto };

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: newSettings },
    });

    this.logger.log(`Settings updated for tenant ${tenantId}`);

    return { settings: newSettings };
  }
}
