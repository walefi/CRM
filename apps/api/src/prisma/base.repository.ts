import { Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TenantContext } from '../modules/tenants/tenant-context.service';

type ModelDelegate<T> = {
  findUnique: Function;
  findFirst: Function;
  findMany: Function;
  create: Function;
  update: Function;
  delete: Function;
  count: Function;
};

export class BaseRepository<Model, Delegate extends ModelDelegate<Model>> {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly delegate: Delegate,
    protected readonly tenantContext?: TenantContext,
  ) {}

  protected getTenantFilter(): Record<string, string> | Record<string, never> {
    if (!this.tenantContext?.currentId) return {};
    return { tenantId: this.tenantContext.currentId };
  }

  protected mergeWhere(
    where?: Record<string, unknown>,
  ): Record<string, unknown> {
    const tenantFilter = this.getTenantFilter();
    if (!tenantFilter || Object.keys(tenantFilter).length === 0) return where || {};
    return { ...where, ...tenantFilter };
  }

  async findById(id: string): Promise<Model | null> {
    const tenantFilter = this.getTenantFilter();
    return (this.delegate.findUnique as Function)({
      where: { id, ...tenantFilter },
    }) as Promise<Model | null>;
  }

  async findOne(where: Record<string, unknown>): Promise<Model | null> {
    return (this.delegate.findFirst as Function)({
      where: this.mergeWhere(where),
    }) as Promise<Model | null>;
  }

  async findMany(options?: {
    where?: Record<string, unknown>;
    skip?: number;
    take?: number;
    orderBy?: Record<string, string>;
    include?: Record<string, unknown>;
    select?: Record<string, unknown>;
  }): Promise<Model[]> {
    return (this.delegate.findMany as Function)({
      ...(options || {}),
      where: this.mergeWhere(options?.where),
    }) as Promise<Model[]>;
  }

  async create(data: Record<string, unknown>): Promise<Model> {
    const tenantFilter = this.getTenantFilter();
    return (this.delegate.create as Function)({
      data: { ...data, ...tenantFilter },
    }) as Promise<Model>;
  }

  async update(id: string, data: Record<string, unknown>): Promise<Model> {
    const tenantFilter = this.getTenantFilter();
    return (this.delegate.update as Function)({
      where: { id, ...tenantFilter },
      data,
    }) as Promise<Model>;
  }

  async softDelete(id: string): Promise<Model> {
    const tenantFilter = this.getTenantFilter();
    return (this.delegate.update as Function)({
      where: { id, ...tenantFilter },
      data: { deletedAt: new Date() },
    }) as Promise<Model>;
  }

  async restore(id: string): Promise<Model> {
    const tenantFilter = this.getTenantFilter();
    return (this.delegate.update as Function)({
      where: { id, ...tenantFilter },
      data: { deletedAt: null },
    }) as Promise<Model>;
  }

  async hardDelete(id: string): Promise<Model> {
    const tenantFilter = this.getTenantFilter();
    return (this.delegate.delete as Function)({
      where: { id, ...tenantFilter },
    }) as Promise<Model>;
  }

  async count(where?: Record<string, unknown>): Promise<number> {
    return (this.delegate.count as Function)({
      where: this.mergeWhere(where),
    }) as Promise<number>;
  }

  async paginate(options: {
    where?: Record<string, unknown>;
    page?: number;
    limit?: number;
    orderBy?: Record<string, string>;
    include?: Record<string, unknown>;
  }) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;
    const where = this.mergeWhere(options.where);

    const [data, total] = await this.prisma.$transaction([
      (this.delegate.findMany as Function)({
        where,
        skip,
        take: limit,
        orderBy: options.orderBy,
        include: options.include,
      }),
      (this.delegate.count as Function)({ where }),
    ]);

    return {
      data: data as Model[],
      meta: {
        total: total as number,
        page,
        limit,
        totalPages: Math.ceil((total as number) / limit),
        hasNextPage: page * limit < (total as number),
        hasPreviousPage: page > 1,
      },
    };
  }
}
