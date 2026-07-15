import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePermissionDto, UpdatePermissionDto } from './dto/permissions.dto';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.permission.findMany({
      where: { tenantId },
      include: { _count: { select: { roles: true } } },
      orderBy: { resource: 'asc' },
    });
  }

  async findById(id: string, tenantId: string) {
    const perm = await this.prisma.permission.findFirst({
      where: { id, tenantId },
      include: { roles: { include: { role: { select: { id: true, name: true } } } } },
    });
    if (!perm) throw new NotFoundException('Permission not found');
    return perm;
  }

  async create(tenantId: string, dto: CreatePermissionDto) {
    const perm = await this.prisma.permission.create({ data: { ...dto, tenantId } });
    this.logger.log(`Permission "${perm.name}" created`);
    return perm;
  }

  async update(id: string, tenantId: string, dto: UpdatePermissionDto) {
    await this.findById(id, tenantId);
    return this.prisma.permission.update({ where: { id }, data: dto });
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    await this.prisma.rolePermission.deleteMany({ where: { permissionId: id } });
    await this.prisma.permission.delete({ where: { id } });
    this.logger.log(`Permission "${id}" deleted`);
  }
}
