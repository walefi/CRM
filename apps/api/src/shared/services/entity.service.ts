import { Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchDto, BulkActionDto } from '../dto/entity.dto';

interface EntityWhereInput {
  deletedAt?: null | { not: null };
  tenantId?: string;
  OR?: Record<string, unknown>[];
  [key: string]: unknown;
}

type AnyFunction = (...args: any[]) => any;

interface PrismaDelegate {
  findMany: AnyFunction;
  findFirst: AnyFunction;
  count: AnyFunction;
  create: AnyFunction;
  update: AnyFunction;
  delete: AnyFunction;
  createMany: AnyFunction;
  updateMany: AnyFunction;
}

export class EntityService<CreateDto, UpdateDto> {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly delegate: PrismaDelegate,
    protected readonly entityName: string,
  ) {}

  protected getSearchableFields(): string[] {
    return ['name'];
  }

  protected getDefaultSort(): Record<string, string> {
    return { createdAt: 'desc' };
  }

  protected buildSearchWhere(search: string): Record<string, unknown>[] | undefined {
    if (!search) return undefined;
    const fields = this.getSearchableFields();
    return fields.map((f) => ({ [f]: { contains: search, mode: 'insensitive' } }));
  }

  protected buildWhere(tenantId: string, dto: SearchDto): EntityWhereInput {
    const where: EntityWhereInput = { tenantId, deletedAt: null };

    if (dto.status) {
      where.status = dto.status;
    }

    if (dto.search) {
      const searchConditions = this.buildSearchWhere(dto.search);
      if (searchConditions) {
        where.OR = searchConditions;
      }
    }

    if (dto.filters) {
      Object.assign(where, dto.filters);
    }

    return where;
  }

  async findAll(tenantId: string, dto: SearchDto) {
    const where = this.buildWhere(tenantId, dto);
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const orderBy: Record<string, string> = dto.sortBy
      ? { [dto.sortBy]: dto.sortOrder || 'desc' }
      : this.getDefaultSort();

    const [data, total] = await this.prisma.$transaction([
      this.delegate.findMany({ where, skip, take: limit, orderBy, select: this.getSelectFields() }),
      this.delegate.count({ where }),
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

  async findById(id: string, tenantId: string): Promise<unknown> {
    const entity = await this.delegate.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: this.getDetailFields(),
    });

    if (!entity) {
      throw new NotFoundException(`${this.entityName} not found`);
    }

    return entity;
  }

  async create(tenantId: string, dto: CreateDto, userId?: string): Promise<unknown> {
    return this.delegate.create({
      data: { ...(dto as Record<string, unknown>), tenantId, createdBy: userId },
      select: this.getSelectFields(),
    });
  }

  async update(id: string, tenantId: string, dto: UpdateDto): Promise<unknown> {
    await this.findById(id, tenantId);
    return this.delegate.update({
      where: { id },
      data: dto as Record<string, unknown>,
      select: this.getSelectFields(),
    });
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findById(id, tenantId);
    await this.delegate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    this.logger.log(`${this.entityName} ${id} soft-deleted`);
  }

  async restore(id: string, tenantId: string): Promise<void> {
    await this.findById(id, tenantId);
    await this.delegate.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  async archive(id: string, _tenantId: string): Promise<void> {
    await this.delegate.update({
      where: { id },
      data: { archived: true },
    });
  }

  async duplicate(id: string, tenantId: string): Promise<unknown> {
    const original = (await this.findById(id, tenantId)) as Record<string, unknown>;
    const { ...data } = original;
    return this.delegate.create({
      data: { ...data, tenantId },
      select: this.getSelectFields(),
    });
  }

  async bulkAction(tenantId: string, action: string, dto: BulkActionDto) {
    const ids = dto.ids || [];
    if (!ids.length) return { affected: 0 };

    const where = { id: { in: ids }, tenantId };

    switch (action) {
      case 'delete':
        await this.delegate.updateMany({ where, data: { deletedAt: new Date() } });
        break;
      case 'restore':
        await this.delegate.updateMany({ where, data: { deletedAt: null } });
        break;
      case 'archive':
        await this.delegate.updateMany({ where, data: { archived: true } });
        break;
      default:
        break;
    }

    return { affected: ids.length };
  }

  protected getSelectFields(): Record<string, boolean> | undefined {
    return undefined;
  }

  protected getDetailFields(): Record<string, boolean> | undefined {
    return undefined;
  }
}
