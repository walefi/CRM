import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomFieldDto, UpdateCustomFieldDto } from './dto/custom-fields.dto';

@Injectable()
export class CustomFieldsService {
  private readonly logger = new Logger(CustomFieldsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, entity?: string) {
    const where: any = { tenantId, deletedAt: null };
    if (entity) where.entity = entity;

    return this.prisma.customField.findMany({
      where,
      include: {
        group: { select: { id: true, name: true } },
        CustomFieldOption: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: [{ entity: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async findById(id: string, tenantId: string) {
    const field = await this.prisma.customField.findFirst({
      where: { id, tenantId },
      include: {
        group: { select: { id: true, name: true } },
        CustomFieldOption: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!field) throw new NotFoundException('Custom field not found');
    return field;
  }

  async findByEntity(tenantId: string, entity: string) {
    return this.prisma.customField.findMany({
      where: { tenantId, entity, deletedAt: null, status: 'active', isHidden: false },
      include: { CustomFieldOption: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(tenantId: string, dto: CreateCustomFieldDto) {
    const existing = await this.prisma.customField.findFirst({
      where: { key: dto.key, entity: dto.entity, tenantId },
    });
    if (existing) throw new ConflictException('Custom field key already exists for this entity');

    const { options, ...data } = dto;

    const field = await this.prisma.customField.create({
      data: {
        ...data,
        tenantId,
        options: options
          ? {
              create: options.map((o, i) => ({ ...o, sortOrder: i })),
            }
          : undefined,
      },
      include: { CustomFieldOption: true },
    });

    this.logger.log(`Custom field "${field.name}" created for ${field.entity}`);
    return field;
  }

  async update(id: string, tenantId: string, dto: UpdateCustomFieldDto) {
    await this.findById(id, tenantId);
    const { options, ...data } = dto;

    if (options) {
      await this.prisma.customFieldOption.deleteMany({ where: { customFieldId: id } });
      await this.prisma.customFieldOption.createMany({
        data: options.map((o, i) => ({ ...o, customFieldId: id, sortOrder: i })),
      });
    }

    const field = await this.prisma.customField.update({
      where: { id },
      data,
      include: { CustomFieldOption: true },
    });

    this.logger.log(`Custom field "${id}" updated`);
    return field;
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    await this.prisma.customField.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'inactive' },
    });
    this.logger.log(`Custom field "${id}" soft-deleted`);
  }

  async saveValues(
    tenantId: string,
    entity: string,
    entityId: string,
    values: { customFieldId: string; value: string }[],
  ) {
    await this.prisma.$transaction(
      values.map(({ customFieldId, value }) =>
        this.prisma.customFieldValue.upsert({
          where: { customFieldId_entityId: { customFieldId, entityId } },
          update: { value },
          create: { customFieldId, entityId, value },
        }),
      ),
    );
  }

  async getValues(entity: string, entityId: string) {
    return this.prisma.customFieldValue.findMany({
      where: { entityId, customField: { entity } },
      include: { customField: { select: { id: true, name: true, key: true, type: true } } },
    });
  }

  async getGroups(tenantId: string, entity: string) {
    return this.prisma.customFieldGroup.findMany({
      where: { tenantId, entity },
      include: {
        fields: {
          where: { deletedAt: null, status: 'active' },
          include: { CustomFieldOption: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
