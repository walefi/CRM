import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, categoryId?: string) {
    const where: any = { tenantId, deletedAt: null };
    if (categoryId) where.categoryId = categoryId;
    return this.prisma.product.findMany({
      where,
      include: { category: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, tenantId: string) {
    const p = await this.prisma.product.findFirst({
      where: { id, tenantId },
      include: { category: true },
    });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  async create(tenantId: string, dto: any) {
    return this.prisma.product.create({
      data: { ...dto, tenantId },
      include: { category: { select: { id: true, name: true } } },
    });
  }
  async update(id: string, tenantId: string, dto: any) {
    await this.findById(id, tenantId);
    return this.prisma.product.update({ where: { id }, data: dto });
  }
  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    await this.prisma.product.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async getCategories(tenantId: string) {
    return this.prisma.category.findMany({
      where: { tenantId },
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true } },
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(tenantId: string, dto: any) {
    return this.prisma.category.create({ data: { ...dto, tenantId } });
  }

  async updateCategory(id: string, dto: any) {
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async deleteCategory(id: string) {
    return this.prisma.category.delete({ where: { id } });
  }

  async getStats(tenantId: string) {
    const [total, active, byCategory] = await Promise.all([
      this.prisma.product.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.product.count({ where: { tenantId, deletedAt: null, isActive: true } }),
      this.prisma.category.findMany({
        where: { tenantId },
        include: { _count: { select: { products: true } } },
      }),
    ]);
    return { total, active, byCategory };
  }
}
