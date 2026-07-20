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

  // CPQ & PRICING
  async getPriceBooks(tenantId: string) {
    return (this.prisma as any).priceBook.findMany({ where: { tenantId, isActive: true }, orderBy: { name: 'asc' } });
  }

  async createPriceBook(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).priceBook.create({ data: { name: dto.name, description: dto.description, currency: dto.currency || 'BRL', isDefault: dto.isDefault || false, rules: (dto.rules as any) || [], tenantId, createdBy: userId } });
  }

  async getBundles(tenantId: string) {
    return (this.prisma as any).bundle.findMany({ where: { tenantId, isActive: true }, orderBy: { createdAt: 'desc' } });
  }

  async createBundle(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).bundle.create({ data: { name: dto.name, description: dto.description, type: dto.type || 'bundle', price: dto.price, items: (dto.items as any) || [], rules: (dto.rules as any) || {}, tenantId, createdBy: userId } });
  }

  async getDiscounts(tenantId: string) {
    return (this.prisma as any).discountRule.findMany({ where: { tenantId, isActive: true }, orderBy: { createdAt: 'desc' } });
  }

  async createDiscount(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).discountRule.create({ data: { name: dto.name, type: dto.type || 'percentage', value: dto.value || 0, minQuantity: dto.minQuantity, maxPercent: dto.maxPercent, requiresApproval: dto.requiresApproval || false, tags: dto.tags || [], tenantId, createdBy: userId } });
  }

  async calculatePrice(tenantId: string, dto: any) {
    const prismaAny = this.prisma as any;
    let subtotal = 0;
    const items = (dto.items || []).map((item: any) => {
      const lineTotal = (item.price || 0) * (item.quantity || 1);
      subtotal += lineTotal;
      return { ...item, lineTotal, discount: 0 };
    });

    let discount = 0;
    if (dto.discountId) {
      const rule = await prismaAny.discountRule.findFirst({ where: { id: dto.discountId } });
      if (rule) {
        discount = rule.type === 'percentage' ? subtotal * (rule.value / 100) : rule.value;
      }
    } else if (dto.discountPercent) {
      discount = subtotal * (dto.discountPercent / 100);
    }

    const total = subtotal - discount;
    const taxRate = dto.taxRate || 0;
    const tax = total * (taxRate / 100);
    const grandTotal = total + tax;

    return { items, subtotal, discount, discountPercent: dto.discountPercent || 0, tax, taxRate, total: grandTotal };
  }

  async getCPQStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const [total, priceBooks, bundles, discounts, quotes] = await Promise.all([
      this.prisma.product.count({ where: { tenantId, deletedAt: null } }),
      prismaAny.priceBook.count({ where: { tenantId, isActive: true } }),
      prismaAny.bundle.count({ where: { tenantId, isActive: true } }),
      prismaAny.discountRule.count({ where: { tenantId, isActive: true } }),
      this.prisma.quoteItem.count({ where: { quote: { tenantId } } }),
    ]);
    return { totalProducts: total, priceBooks, bundles, discounts, quoteItems: quotes };
  }
}
