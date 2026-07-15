import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateQuoteDto,
  UpdateQuoteDto,
  QuoteFilterDto,
  CreateQuoteItemDto,
  UpdateQuoteItemDto,
  CreateQuoteTemplateDto,
} from './dto/quotes.dto';

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly defaultInclude = {
    owner: { select: { id: true, firstName: true, lastName: true, avatar: true } },
    company: { select: { id: true, name: true } },
    contact: { select: { id: true, firstName: true, lastName: true } },
    deal: { select: { id: true, title: true } },
    team: { select: { id: true, name: true } },
    items: {
      include: {
        product: { select: { id: true, name: true, sku: true } },
      },
      orderBy: { sortOrder: 'asc' as const },
    },
  };

  private generateNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `Q-${year}-${random}`;
  }

  async findAll(tenantId: string, filters: QuoteFilterDto) {
    const where: any = { tenantId, deletedAt: null };
    if (filters.status) where.status = filters.status;
    if (filters.ownerId) where.ownerId = filters.ownerId;
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.contactId) where.contactId = filters.contactId;
    if (filters.dealId) where.dealId = filters.dealId;
    if (filters.search) {
      const s = filters.search;
      where.OR = [
        { number: { contains: s, mode: 'insensitive' } },
        { title: { contains: s, mode: 'insensitive' } },
        { customerNotes: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (filters.tagged) {
      where.tags = { has: filters.tagged };
    }
    if (filters.minValue || filters.maxValue) {
      where.totalAmount = {};
      if (filters.minValue) (where.totalAmount as any).gte = filters.minValue;
      if (filters.maxValue) (where.totalAmount as any).lte = filters.maxValue;
    }
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) (where.createdAt as any).gte = new Date(filters.dateFrom);
      if (filters.dateTo) (where.createdAt as any).lte = new Date(filters.dateTo);
    }
    if (filters.validUntil) {
      where.validUntil = { lte: new Date(filters.validUntil) };
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;
    const orderBy: any = filters.sortBy
      ? { [filters.sortBy]: filters.sortOrder || 'desc' }
      : { createdAt: 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.quote.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: this.defaultInclude,
      }),
      this.prisma.quote.count({ where }),
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

  async findById(id: string, tenantId: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        ...this.defaultInclude,
        versions: {
          orderBy: { version: 'desc' },
          select: { id: true, version: true, reason: true, createdBy: true, createdAt: true },
        },
        activities: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          },
        },
      },
    });
    if (!quote) throw new NotFoundException('Quote not found');
    return quote;
  }

  async create(tenantId: string, dto: CreateQuoteDto, userId?: string) {
    const number = this.generateNumber();
    const { items, ...quoteData } = dto;

    const createData: any = {
      ...quoteData,
      number,
      tenantId,
      ownerId: dto.ownerId || userId,
      createdBy: userId,
      subtotal: 0,
      discount: 0,
      taxes: 0,
      shipping: 0,
      totalAmount: 0,
    };

    if (items && items.length > 0) {
      createData.items = {
        create: items.map((item, idx) => {
          const qty = Number(item.quantity) || 0;
          const up = Number(item.unitPrice) || 0;
          const st = qty * up;
          const d =
            Number(item.discount) ||
            (item.discountPercent ? (st * Number(item.discountPercent)) / 100 : 0);
          const sd = st - d;
          const tx =
            Number(item.taxes) || (item.taxPercent ? (sd * Number(item.taxPercent)) / 100 : 0);
          return {
            productId: item.productId || undefined,
            description: item.description,
            type: item.type || 'product',
            quantity: qty,
            unitPrice: up,
            costPrice: item.costPrice ? Number(item.costPrice) : undefined,
            discount: d,
            discountPercent: item.discountPercent ? Number(item.discountPercent) : undefined,
            taxes: tx,
            taxPercent: item.taxPercent ? Number(item.taxPercent) : undefined,
            subtotal: st,
            total: sd + tx,
            sortOrder: item.sortOrder ?? idx,
          };
        }),
      };
    }

    const quote = await this.prisma.quote.create({
      data: createData,
      include: this.defaultInclude,
    });

    if (items && items.length > 0) {
      await this.recalculateQuote(quote.id, tenantId);
    }

    await this.createVersion(quote.id, tenantId, 'Criacao da proposta', userId);
    await this.prisma.timeline.create({
      data: {
        action: 'QUOTE_CREATED',
        entity: 'Quote',
        entityId: quote.id,
        tenantId,
        userId: userId || '',
      },
    });

    return this.findById(quote.id, tenantId);
  }

  async update(id: string, tenantId: string, dto: UpdateQuoteDto, userId?: string) {
    const existing = await this.findById(id, tenantId);

    const updated = await this.prisma.quote.update({
      where: { id },
      data: dto as any,
      include: this.defaultInclude,
    });

    await this.createVersion(id, tenantId, 'Atualizacao da proposta', userId);
    await this.prisma.timeline.create({
      data: {
        action: 'QUOTE_UPDATED',
        entity: 'Quote',
        entityId: id,
        tenantId,
        userId: userId || '',
        metadata: { old: { title: existing.title, status: existing.status } },
      } as any,
    });

    return updated;
  }

  async remove(id: string, tenantId: string, userId?: string) {
    await this.findById(id, tenantId);
    await this.prisma.quote.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.prisma.timeline.create({
      data: {
        action: 'QUOTE_DELETED',
        entity: 'Quote',
        entityId: id,
        tenantId,
        userId: userId || '',
      },
    });
  }

  async archive(id: string, tenantId: string, userId?: string) {
    await this.findById(id, tenantId);
    const updated = await this.prisma.quote.update({
      where: { id },
      data: { isArchived: true, status: 'ARCHIVED' },
      include: this.defaultInclude,
    });
    await this.prisma.timeline.create({
      data: {
        action: 'QUOTE_ARCHIVED',
        entity: 'Quote',
        entityId: id,
        tenantId,
        userId: userId || '',
      },
    });
    return updated;
  }

  async restore(id: string, tenantId: string, userId?: string) {
    await this.findById(id, tenantId);
    const updated = await this.prisma.quote.update({
      where: { id },
      data: { isArchived: false, deletedAt: null, status: 'DRAFT' },
      include: this.defaultInclude,
    });
    await this.prisma.timeline.create({
      data: {
        action: 'QUOTE_RESTORED',
        entity: 'Quote',
        entityId: id,
        tenantId,
        userId: userId || '',
      },
    });
    return updated;
  }

  async duplicate(id: string, tenantId: string, userId?: string) {
    const original: any = await this.findById(id, tenantId);

    const createData: any = {
      number: this.generateNumber(),
      title: `${original.title || ''} (Copia)`,
      description: original.description,
      status: 'DRAFT',
      currency: original.currency,
      subtotal: original.subtotal,
      discount: original.discount,
      discountPercent: original.discountPercent,
      taxes: original.taxes,
      shipping: original.shipping,
      totalAmount: original.totalAmount,
      paymentTerms: original.paymentTerms,
      commercialConditions: original.commercialConditions,
      internalNotes: original.internalNotes,
      customerNotes: original.customerNotes,
      tags: original.tags,
      tenantId,
      dealId: original.dealId,
      companyId: original.companyId,
      contactId: original.contactId,
      customerId: original.customerId,
      ownerId: original.ownerId || userId,
      createdBy: userId,
    };

    if (original.items && original.items.length > 0) {
      createData.items = {
        create: original.items.map((item: any, idx: number) => ({
          productId: item.productId,
          description: item.description,
          type: item.type,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          costPrice: item.costPrice,
          discount: item.discount,
          discountPercent: item.discountPercent,
          taxes: item.taxes,
          taxPercent: item.taxPercent,
          subtotal: item.subtotal,
          total: item.total,
          sortOrder: Number(item.sortOrder) || idx,
        })),
      };
    }

    const quote = await this.prisma.quote.create({
      data: createData,
      include: this.defaultInclude,
    });

    await this.createVersion(quote.id, tenantId, 'Proposta duplicada', userId);
    await this.prisma.timeline.create({
      data: {
        action: 'QUOTE_DUPLICATED',
        entity: 'Quote',
        entityId: quote.id,
        tenantId,
        userId: userId || '',
      },
    });

    return quote;
  }

  async getStats(tenantId: string) {
    const [total, byStatus, totalValue, avgValue, recentlyAccepted, expired, rejectedCount] =
      await Promise.all([
        this.prisma.quote.count({ where: { tenantId, deletedAt: null } }),
        this.prisma.quote.groupBy({
          by: ['status'],
          where: { tenantId, deletedAt: null },
          _count: true,
        }),
        this.prisma.quote.aggregate({
          where: { tenantId, deletedAt: null },
          _sum: { totalAmount: true },
        }),
        this.prisma.quote.aggregate({
          where: { tenantId, deletedAt: null },
          _avg: { totalAmount: true },
        }),
        this.prisma.quote.count({ where: { tenantId, deletedAt: null, status: 'ACCEPTED' } }),
        this.prisma.quote.count({ where: { tenantId, deletedAt: null, status: 'EXPIRED' } }),
        this.prisma.quote.count({ where: { tenantId, deletedAt: null, status: 'REJECTED' } }),
      ]);

    const conversionRate = total > 0 ? ((recentlyAccepted / total) * 100).toFixed(1) : '0';

    return {
      total,
      byStatus,
      totalValue: totalValue._sum.totalAmount || 0,
      avgValue: avgValue._avg.totalAmount || 0,
      recentlyAccepted,
      expired,
      accepted: recentlyAccepted,
      rejected: rejectedCount,
      conversionRate: `${conversionRate}%`,
    };
  }

  async addItem(quoteId: string, tenantId: string, dto: CreateQuoteItemDto) {
    await this.findById(quoteId, tenantId);
    const qty = Number(dto.quantity) || 0;
    const up = Number(dto.unitPrice) || 0;
    const st = qty * up;
    const d =
      Number(dto.discount) || (dto.discountPercent ? (st * Number(dto.discountPercent)) / 100 : 0);
    const sd = st - d;
    const tx = Number(dto.taxes) || (dto.taxPercent ? (sd * Number(dto.taxPercent)) / 100 : 0);

    const item = await this.prisma.quoteItem.create({
      data: {
        quoteId,
        productId: dto.productId,
        description: dto.description,
        type: dto.type || 'product',
        quantity: qty,
        unitPrice: up,
        costPrice: dto.costPrice ? Number(dto.costPrice) : undefined,
        discount: d,
        discountPercent: dto.discountPercent ? Number(dto.discountPercent) : undefined,
        taxes: tx,
        taxPercent: dto.taxPercent ? Number(dto.taxPercent) : undefined,
        subtotal: st,
        total: sd + tx,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: { product: { select: { id: true, name: true, sku: true } } },
    });

    await this.recalculateQuote(quoteId, tenantId);
    return item;
  }

  async updateItem(quoteId: string, itemId: string, tenantId: string, dto: UpdateQuoteItemDto) {
    await this.findById(quoteId, tenantId);
    const existing = await this.prisma.quoteItem.findFirst({ where: { id: itemId, quoteId } });
    if (!existing) throw new NotFoundException('Item not found');

    const qty = Number(dto.quantity ?? existing.quantity) || 0;
    const up = Number(dto.unitPrice ?? existing.unitPrice) || 0;
    const st = qty * up;
    const d =
      Number(dto.discount ?? existing.discount) ||
      (dto.discountPercent ? (st * Number(dto.discountPercent)) / 100 : 0);
    const sd = st - d;
    const tx =
      Number(dto.taxes ?? existing.taxes) ||
      (dto.taxPercent ? (sd * Number(dto.taxPercent)) / 100 : 0);

    const item = await this.prisma.quoteItem.update({
      where: { id: itemId },
      data: {
        productId: dto.productId !== undefined ? dto.productId : existing.productId,
        description: dto.description !== undefined ? dto.description : existing.description,
        type: dto.type !== undefined ? dto.type : existing.type,
        quantity: qty,
        unitPrice: up,
        costPrice: dto.costPrice !== undefined ? Number(dto.costPrice) : existing.costPrice,
        discount: d,
        discountPercent:
          dto.discountPercent !== undefined
            ? Number(dto.discountPercent)
            : existing.discountPercent,
        taxes: tx,
        taxPercent: dto.taxPercent !== undefined ? Number(dto.taxPercent) : existing.taxPercent,
        subtotal: st,
        total: sd + tx,
        sortOrder: dto.sortOrder ?? existing.sortOrder,
      },
      include: { product: { select: { id: true, name: true, sku: true } } },
    });

    await this.recalculateQuote(quoteId, tenantId);
    return item;
  }

  async removeItem(quoteId: string, itemId: string, tenantId: string) {
    await this.findById(quoteId, tenantId);
    await this.prisma.quoteItem.delete({ where: { id: itemId } });
    await this.recalculateQuote(quoteId, tenantId);
  }

  private async recalculateQuote(quoteId: string, _tenantId: string) {
    const items = await this.prisma.quoteItem.findMany({ where: { quoteId } });

    const itemSubtotal = items.reduce((sum, i) => sum + Number(i.subtotal || 0), 0);
    const itemDiscount = items.reduce((sum, i) => sum + Number(i.discount || 0), 0);
    const itemTaxes = items.reduce((sum, i) => sum + Number(i.taxes || 0), 0);

    const quote = await this.prisma.quote.findUnique({ where: { id: quoteId } });
    if (!quote) return;

    const discountPercent = Number(quote.discountPercent || 0);
    const extraTaxes = Number(quote.taxes || 0);
    const shipping = Number(quote.shipping || 0);

    const discountAmount =
      itemDiscount || (discountPercent ? (itemSubtotal * discountPercent) / 100 : 0);
    const subtotalAfterDiscount = itemSubtotal - discountAmount;
    const taxAmount = itemTaxes + extraTaxes;
    const total = subtotalAfterDiscount + taxAmount + shipping;

    await this.prisma.quote.update({
      where: { id: quoteId },
      data: {
        subtotal: itemSubtotal,
        discount: discountAmount,
        taxes: taxAmount,
        totalAmount: total,
      },
    });
  }

  private async createVersion(quoteId: string, tenantId: string, reason: string, userId?: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: { items: true },
    });
    if (!quote) return;

    const lastVersion = await this.prisma.quoteVersion.findFirst({
      where: { quoteId },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (lastVersion?.version || 0) + 1;

    await this.prisma.quoteVersion.create({
      data: {
        quoteId,
        version: nextVersion,
        data: JSON.parse(JSON.stringify(quote)),
        reason,
        tenantId,
        createdBy: userId,
      },
    });
  }

  async getVersions(quoteId: string, tenantId: string) {
    await this.findById(quoteId, tenantId);
    return this.prisma.quoteVersion.findMany({
      where: { quoteId },
      orderBy: { version: 'desc' },
    });
  }

  async restoreVersion(quoteId: string, versionId: string, tenantId: string, userId?: string) {
    const version = await this.prisma.quoteVersion.findFirst({
      where: { id: versionId, quoteId },
    });
    if (!version) throw new NotFoundException('Version not found');

    const data = version.data as any;

    await this.prisma.quote.update({
      where: { id: quoteId },
      data: {
        title: data.title as string,
        status: data.status as any,
        totalAmount: data.totalAmount as any,
        subtotal: data.subtotal as any,
        discount: data.discount as any,
        taxes: data.taxes as any,
        paymentTerms: data.paymentTerms as any,
        commercialConditions: data.commercialConditions as any,
        customerNotes: data.customerNotes as any,
        internalNotes: data.internalNotes as any,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
      },
    });

    await this.createVersion(
      quoteId,
      tenantId,
      `Restaurado para versao ${version.version}`,
      userId,
    );
    await this.prisma.timeline.create({
      data: {
        action: 'QUOTE_VERSION_RESTORED',
        entity: 'Quote',
        entityId: quoteId,
        tenantId,
        userId: userId || '',
        metadata: { version: version.version },
      } as any,
    });

    return this.findById(quoteId, tenantId);
  }

  async findTemplates(tenantId: string) {
    return this.prisma.quoteTemplate.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async createTemplate(tenantId: string, dto: CreateQuoteTemplateDto, userId?: string) {
    return this.prisma.quoteTemplate.create({
      data: { ...dto, content: dto.content as any, tenantId, createdBy: userId },
    });
  }

  async updateTemplate(id: string, _tenantId: string, dto: Partial<CreateQuoteTemplateDto>) {
    return this.prisma.quoteTemplate.update({
      where: { id },
      data: { ...dto, content: dto.content as any },
    });
  }

  async deleteTemplate(id: string) {
    return this.prisma.quoteTemplate.delete({ where: { id } });
  }

  async exportQuote(id: string, tenantId: string, format = 'json') {
    const quote: any = await this.findById(id, tenantId);

    switch (format) {
      case 'csv': {
        const items = quote.items || [];
        let csv = 'Descricao,Quantidade,Preco Unitario,Subtotal,Desconto,Impostos,Total\n';
        items.forEach((item: any) => {
          csv += `"${item.description}",${item.quantity},${item.unitPrice},${item.subtotal},${item.discount},${item.taxes},${item.total}\n`;
        });
        csv += `\n"Subtotal",,,,,,${quote.subtotal}\n`;
        csv += `"Desconto",,,,,,${quote.discount}\n`;
        csv += `"Impostos",,,,,,${quote.taxes}\n`;
        csv += `"Total",,,,,,${quote.totalAmount}\n`;
        return csv;
      }
      case 'json':
      default:
        return quote;
    }
  }

  async sendQuote(id: string, tenantId: string, userId?: string) {
    const quote: any = await this.findById(id, tenantId);

    if (quote.status !== 'DRAFT' && quote.status !== 'UNDER_REVIEW') {
      throw new BadRequestException('Only draft or under review quotes can be sent');
    }

    const updated = await this.prisma.quote.update({
      where: { id },
      data: { status: 'SENT', issuedAt: new Date() },
      include: this.defaultInclude,
    });

    await this.createVersion(id, tenantId, 'Proposta enviada ao cliente', userId);
    await this.prisma.timeline.create({
      data: { action: 'QUOTE_SENT', entity: 'Quote', entityId: id, tenantId, userId: userId || '' },
    });

    return updated;
  }

  async reorderItems(quoteId: string, tenantId: string, itemIds: string[]) {
    await this.findById(quoteId, tenantId);
    await Promise.all(
      itemIds.map((itemId, index) =>
        this.prisma.quoteItem.update({ where: { id: itemId }, data: { sortOrder: index } }),
      ),
    );
    return this.prisma.quoteItem.findMany({
      where: { quoteId },
      orderBy: { sortOrder: 'asc' },
      include: { product: { select: { id: true, name: true, sku: true } } },
    });
  }
}
