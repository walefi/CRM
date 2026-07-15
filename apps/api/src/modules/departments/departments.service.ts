import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/departments.dto';

@Injectable()
export class DepartmentsService {
  private readonly logger = new Logger(DepartmentsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.department.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true } },
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, tenantId: string) {
    const dept = await this.prisma.department.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true } },
        users: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async create(tenantId: string, dto: CreateDepartmentDto) {
    const dept = await this.prisma.department.create({
      data: { ...dto, tenantId },
    });
    this.logger.log(`Department "${dept.name}" created`);
    return dept;
  }

  async update(id: string, tenantId: string, dto: UpdateDepartmentDto) {
    await this.findById(id, tenantId);
    const dept = await this.prisma.department.update({ where: { id }, data: dto });
    return dept;
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    await this.prisma.department.update({ where: { id }, data: { deletedAt: new Date() } });
    this.logger.log(`Department "${id}" soft-deleted`);
  }
}
