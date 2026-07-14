import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenants.dto';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id, deletedAt: null },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async findBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug, deletedAt: null },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async create(dto: CreateTenantDto) {
    const existing = await this.prisma.tenant.findUnique({ where: { slug: dto.slug } });

    if (existing) {
      throw new ConflictException('Slug already in use');
    }

    const tenant = await this.prisma.tenant.create({
      data: dto,
    });

    this.logger.log(`Tenant "${tenant.name}" (${tenant.id}) created`);

    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findById(id);

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: dto,
    });

    this.logger.log(`Tenant ${id} updated`);

    return tenant;
  }

  async remove(id: string) {
    await this.findById(id);

    await this.prisma.$transaction([
      this.prisma.user.updateMany({
        where: { tenantId: id },
        data: { status: 'INACTIVE', deletedAt: new Date() },
      }),
      this.prisma.tenant.update({
        where: { id },
        data: { deletedAt: new Date(), status: 'SUSPENDED' },
      }),
    ]);

    this.logger.log(`Tenant ${id} soft-deleted`);
  }

  async getStats(id: string) {
    await this.findById(id);

    const [userCount] = await Promise.all([
      this.prisma.user.count({
        where: { tenantId: id, deletedAt: null },
      }),
    ]);

    return {
      userCount,
    };
  }
}
