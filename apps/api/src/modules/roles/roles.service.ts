import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/roles.dto';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.role.findMany({
      where: { tenantId },
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: { select: { permissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, tenantId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, tenantId },
      include: {
        permissions: { include: { permission: true } },
      },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(tenantId: string, dto: CreateRoleDto) {
    const { permissionIds, ...data } = dto;
    const slug = dto.name.toLowerCase().replace(/\s+/g, '-');

    const role = await this.prisma.role.create({
      data: {
        ...data,
        slug,
        tenantId,
        permissions: permissionIds
          ? { create: permissionIds.map((pid) => ({ permissionId: pid })) }
          : undefined,
      },
      include: {
        permissions: { include: { permission: true } },
      },
    });

    this.logger.log(`Role "${role.name}" created`);
    return role;
  }

  async update(id: string, tenantId: string, dto: UpdateRoleDto) {
    const { permissionIds, ...data } = dto;
    await this.findById(id, tenantId);

    if (permissionIds) {
      await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
      await this.prisma.rolePermission.createMany({
        data: permissionIds.map((pid) => ({ roleId: id, permissionId: pid })),
      });
    }

    const role = await this.prisma.role.update({
      where: { id },
      data: { ...data, slug: data.name ? data.name.toLowerCase().replace(/\s+/g, '-') : undefined },
      include: { permissions: { include: { permission: true } } },
    });

    return role;
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await this.prisma.role.delete({ where: { id } });
    this.logger.log(`Role "${id}" deleted`);
  }
}
